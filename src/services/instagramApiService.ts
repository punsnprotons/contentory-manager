
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export class InstagramApiService {
  userId: string;
  
  constructor(userId: string) {
    this.userId = userId;
  }
  
  static async create(session: any): Promise<InstagramApiService | null> {
    if (!session?.user?.id) {
      console.error('No user session available for Instagram API service');
      return null;
    }
    
    return new InstagramApiService(session.user.id);
  }
  
  async connect(): Promise<boolean> {
    try {
      console.log('Starting Instagram OAuth connection process');
      
      const { data, error } = await supabase.functions.invoke('instagram-integration', {
        method: 'POST',
        body: { action: 'authorize' }
      });
      
      if (error) {
        console.error('Error starting Instagram connection:', error);
        throw error;
      }
      
      if (!data?.authUrl) {
        throw new Error('No authorization URL returned from Instagram integration');
      }
      
      console.log('Opening Instagram authorization URL:', data.authUrl);
      
      // Store that we're expecting an Instagram callback
      sessionStorage.setItem('instagram_auth_pending', 'true');
      
      // Open authorization URL in a popup window
      const width = 600;
      const height = 700;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;
      const popup = window.open(
        data.authUrl,
        'instagram-auth',
        `width=${width},height=${height},left=${left},top=${top}`
      );
      
      if (!popup) {
        toast.error('Please allow popups for this site to connect to Instagram');
        return false;
      }
      
      // Set up message listener for the OAuth callback
      return new Promise((resolve) => {
        const messageHandler = async (event: MessageEvent) => {
          // Check if the message is from our application and contains Instagram OAuth data
          if (event.origin === window.location.origin && event.data && event.data.type === 'INSTAGRAM_AUTH_SUCCESS') {
            window.removeEventListener('message', messageHandler);
            
            if (popup) {
              popup.close();
            }
            
            if (event.data.code) {
              try {
                // Process the OAuth callback with the received code
                const { data, error } = await supabase.functions.invoke('instagram-integration', {
                  method: 'POST',
                  body: { 
                    action: 'callback',
                    code: event.data.code
                  }
                });
                
                if (error) {
                  console.error('Error processing Instagram callback:', error);
                  toast.error('Failed to complete Instagram connection');
                  resolve(false);
                  return;
                }
                
                if (data?.success) {
                  toast.success('Successfully connected to Instagram!');
                  // Fetch profile data to store in database
                  await this.fetchProfileData();
                  
                  // Clear the pending flag
                  sessionStorage.removeItem('instagram_auth_pending');
                  
                  resolve(true);
                  return;
                }
              } catch (callbackError) {
                console.error('Error processing Instagram callback:', callbackError);
                toast.error('Failed to complete Instagram connection');
                resolve(false);
                return;
              }
            }
            
            toast.error('Failed to connect to Instagram. No authorization code received.');
            resolve(false);
          }
        };
        
        window.addEventListener('message', messageHandler);
        
        // Set a timeout to resolve the promise if no callback is received
        setTimeout(() => {
          window.removeEventListener('message', messageHandler);
          sessionStorage.removeItem('instagram_auth_pending');
          toast.error('Instagram connection timed out. Please try again.');
          resolve(false);
        }, 120000); // 2 minutes timeout
      });
    } catch (error) {
      console.error('Error connecting to Instagram:', error);
      toast.error('Failed to connect to Instagram');
      return false;
    }
  }
  
  async verifyCredentials(): Promise<boolean> {
    try {
      const { data, error } = await supabase.functions.invoke('instagram-integration', {
        method: 'POST',
        body: { action: 'verify' }
      });
      
      if (error) {
        console.error('Error verifying Instagram credentials:', error);
        throw error;
      }
      
      console.log('Instagram verification result:', data);
      return data?.verified || false;
    } catch (error) {
      console.error('Error verifying Instagram credentials:', error);
      return false;
    }
  }
  
  async fetchProfileData(): Promise<any> {
    try {
      const { data, error } = await supabase.functions.invoke('instagram-integration', {
        method: 'POST',
        body: { action: 'profile' }
      });
      
      if (error) {
        console.error('Error fetching Instagram profile:', error);
        throw error;
      }
      
      if (data?.username) {
        // Store profile data in platform_connections table
        const { error: updateError } = await supabase
          .from('platform_connections')
          .upsert({
            user_id: this.userId,
            platform: 'instagram',
            connected: true,
            username: data.username,
            profile_image: data.profile_picture,
            last_verified: new Date().toISOString()
          }, {
            onConflict: 'user_id,platform'
          });
          
        if (updateError) {
          console.error('Error updating Instagram connection in database:', updateError);
          throw updateError;
        }
      }
      
      return data;
    } catch (error) {
      console.error('Error fetching Instagram profile data:', error);
      throw error;
    }
  }
  
  async fetchUserPosts(limit: number = 30): Promise<any[]> {
    try {
      const { data, error } = await supabase.functions.invoke('instagram-integration', {
        method: 'POST',
        body: { action: 'posts', limit }
      });
      
      if (error) {
        console.error('Error fetching Instagram posts:', error);
        throw error;
      }
      
      // Store posts in social_posts table
      if (data?.posts && Array.isArray(data.posts) && data.posts.length > 0) {
        const postsToInsert = data.posts.map((post: any) => ({
          user_id: this.userId,
          platform: 'instagram',
          content: post.caption || '',
          external_id: post.id,
          posted_at: new Date(post.timestamp).toISOString(),
          media_url: post.media_url || null
        }));
        
        const { error: insertError } = await supabase
          .from('social_posts')
          .upsert(postsToInsert, {
            onConflict: 'user_id,platform,external_id'
          });
          
        if (insertError) {
          console.error('Error storing Instagram posts in database:', insertError);
        }
      }
      
      return data?.posts || [];
    } catch (error) {
      console.error('Error fetching Instagram posts:', error);
      return [];
    }
  }
  
  async publishPost(content: string, mediaUrl?: string): Promise<any> {
    try {
      const { data, error } = await supabase.functions.invoke('instagram-integration', {
        method: 'POST',
        body: { 
          action: 'publish', 
          content,
          mediaUrl
        }
      });
      
      if (error) {
        console.error('Error publishing to Instagram:', error);
        throw error;
      }
      
      return data;
    } catch (error) {
      console.error('Error publishing Instagram post:', error);
      throw error;
    }
  }
  
  async setupWebhook(): Promise<boolean> {
    try {
      const { data, error } = await supabase.functions.invoke('instagram-integration', {
        method: 'POST',
        body: { action: 'setup_webhook' }
      });
      
      if (error) {
        console.error('Error setting up Instagram webhook:', error);
        throw error;
      }
      
      console.log('Instagram webhook setup result:', data);
      return data?.success || false;
    } catch (error) {
      console.error('Error setting up Instagram webhook:', error);
      toast.error('Failed to set up Instagram webhook');
      return false;
    }
  }
}

// Helper function to handle Instagram OAuth redirect
export const handleInstagramAuthRedirect = async (): Promise<void> => {
  // Check if the current URL contains an authorization code
  const urlParams = new URLSearchParams(window.location.search);
  const code = urlParams.get('code');
  
  if (code) {
    console.log('Processing Instagram auth code:', code);
    
    // Clean URL to remove code
    const cleanUrl = window.location.pathname;
    window.history.replaceState({}, document.title, cleanUrl);
    
    // Check if we're in a popup window
    if (window.opener && !window.opener.closed) {
      // Send message to parent window
      window.opener.postMessage({
        type: 'INSTAGRAM_AUTH_SUCCESS',
        code: code
      }, window.location.origin);
      
      // Close popup window
      window.close();
    } else {
      // If not in a popup (e.g., direct redirect), process the code directly
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session?.user?.id) {
          console.error('No user session available to process Instagram auth');
          toast.error('Authentication required to connect Instagram');
          return;
        }
        
        toast.loading('Processing Instagram connection...');
        
        const instagramService = new InstagramApiService(session.user.id);
        
        // Process the OAuth callback
        const { data, error } = await supabase.functions.invoke('instagram-integration', {
          method: 'POST',
          body: { 
            action: 'callback',
            code: code
          }
        });
        
        toast.dismiss();
        
        if (error) {
          console.error('Error processing Instagram callback:', error);
          toast.error('Failed to complete Instagram connection');
          return;
        }
        
        if (data?.success) {
          // Fetch profile data after successful connection
          await instagramService.fetchProfileData();
          toast.success('Successfully connected to Instagram!');
        } else {
          toast.error('Failed to connect to Instagram');
        }
      } catch (error) {
        console.error('Error processing Instagram auth code:', error);
        toast.error('Failed to process Instagram connection');
      }
    }
  }
};

// Helper function to check if an Instagram connection exists
export const checkInstagramConnection = async (): Promise<boolean> => {
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session?.user?.id) {
    return false;
  }
  
  const { data, error } = await supabase
    .from('platform_connections')
    .select('connected')
    .eq('user_id', session.user.id)
    .eq('platform', 'instagram')
    .maybeSingle();
    
  if (error) {
    console.error('Error checking Instagram connection:', error);
    return false;
  }
  
  return data?.connected || false;
};

// Helper function to publish content to Instagram
export const publishToInstagram = async (content: string, mediaUrl?: string): Promise<{ success: boolean, message?: string, error?: string }> => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.user?.id) {
      return { success: false, error: 'Authentication required' };
    }
    
    // First verify that Instagram is connected
    const isConnected = await checkInstagramConnection();
    
    if (!isConnected) {
      return { success: false, error: 'Instagram is not connected' };
    }
    
    const instagramService = new InstagramApiService(session.user.id);
    const result = await instagramService.publishPost(content, mediaUrl);
    
    if (!result?.success) {
      return { 
        success: false, 
        error: result?.error || 'Failed to publish to Instagram',
        message: result?.message
      };
    }
    
    return { success: true, message: result.message || 'Successfully published to Instagram' };
  } catch (error) {
    console.error('Error publishing to Instagram:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'An unexpected error occurred'
    };
  }
};

// Helper function to set up Instagram webhook
export const setupInstagramWebhook = async (): Promise<{ success: boolean, message?: string, error?: string }> => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.user?.id) {
      return { success: false, error: 'Authentication required' };
    }
    
    const instagramService = new InstagramApiService(session.user.id);
    const success = await instagramService.setupWebhook();
    
    return { 
      success, 
      message: success ? 'Instagram webhook setup successfully' : 'Failed to set up Instagram webhook'
    };
  } catch (error) {
    console.error('Error setting up Instagram webhook:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'An unexpected error occurred'
    };
  }
};
