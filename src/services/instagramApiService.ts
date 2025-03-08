
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
      window.open(data.authUrl, '_blank', 'width=600,height=700');
      return true;
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
}

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
    
    const instagramService = new InstagramApiService(session.user.id);
    const result = await instagramService.publishPost(content, mediaUrl);
    
    if (!result?.success) {
      return { 
        success: false, 
        error: result?.error || 'Failed to publish to Instagram',
        message: result?.message
      };
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error publishing to Instagram:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'An unexpected error occurred'
    };
  }
};
