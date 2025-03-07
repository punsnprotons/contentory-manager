
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { supabase, getCurrentUser } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface RefreshDataButtonProps {
  className?: string;
  size?: "default" | "sm" | "lg" | "icon";
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  onRefreshComplete?: () => void;
}

interface RefreshResponse {
  success: boolean;
  message: string;
  data?: any;
  error?: any;
  details?: string;
  instructions?: string;
}

// Check if the user has a valid Twitter connection
export const checkTwitterConnection = async (): Promise<boolean> => {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      console.log('No authenticated user found when checking Twitter connection');
      return false;
    }
    
    // First check if we have a record in platform_connections
    const { data: connections, error: connectionsError } = await supabase
      .from('platform_connections')
      .select('connected, last_verified')
      .eq('user_id', user.id)
      .eq('platform', 'twitter')
      .single();
    
    if (connectionsError) {
      if (connectionsError.code === 'PGRST116') {
        console.log('No Twitter connection found in database');
        return false;
      }
      console.error('Error fetching Twitter connection:', connectionsError);
      return false;
    }
    
    if (!connections || !connections.connected) {
      console.log('Twitter connection is not active');
      return false;
    }
    
    // If we have a connection that was verified less than 24 hours ago, consider it valid
    if (connections.last_verified) {
      const lastVerified = new Date(connections.last_verified);
      const now = new Date();
      const hoursSinceVerified = (now.getTime() - lastVerified.getTime()) / (1000 * 60 * 60);
      
      if (hoursSinceVerified < 24) {
        console.log('Twitter connection is valid (verified in the last 24 hours)');
        return true;
      }
    }
    
    // If it's been more than 24 hours, verify the connection again
    console.log('Verifying Twitter connection...');
    const { data: verifyResult, error: verifyError } = await supabase.functions.invoke('twitter-api', {
      method: 'POST',
      headers: {
        path: '/verify-credentials',
      }
    });
    
    if (verifyError || !verifyResult?.verified) {
      console.error('Twitter connection verification failed:', verifyError || 'Not verified');
      return false;
    }
    
    console.log('Twitter connection verified successfully');
    return true;
  } catch (error) {
    console.error('Error checking Twitter connection:', error);
    return false;
  }
};

export const triggerTwitterRefresh = async (retryCount = 0, maxRetries = 2): Promise<RefreshResponse> => {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      toast.error('You need to be logged in to refresh data');
      return {
        success: false,
        message: 'User not authenticated'
      };
    }
    
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('auth_id', user.id)
      .single();
    
    if (userError || !userData) {
      console.error('Error getting user data:', userError);
      toast.error('Failed to get user data');
      return {
        success: false,
        message: 'Failed to get user data'
      };
    }
    
    const { data, error } = await supabase.functions.invoke('twitter-refresh', {
      method: 'POST',
      body: { userId: userData.id },
      headers: {
        Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
      }
    });
    
    if (error) {
      console.error('Error refreshing Twitter data:', error);
      
      if (retryCount < maxRetries) {
        console.log(`Retrying Twitter refresh (${retryCount + 1}/${maxRetries})...`);
        return triggerTwitterRefresh(retryCount + 1, maxRetries);
      }
      
      return {
        success: false,
        message: 'Failed to refresh Twitter data after multiple attempts',
        error
      };
    }
    
    const verifyDataUpdate = async () => {
      try {
        const nowTimestamp = new Date().toISOString();
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
        
        const { data: recentMetrics, error: metricsError } = await supabase
          .from('follower_metrics')
          .select('id, recorded_at')
          .eq('user_id', userData.id)
          .gte('created_at', fiveMinutesAgo)
          .lte('created_at', nowTimestamp)
          .order('created_at', { ascending: false })
          .limit(1);
          
        if (metricsError) {
          console.warn('Could not verify metrics update:', metricsError);
        } else if (recentMetrics && recentMetrics.length > 0) {
          console.log('Database update verified:', recentMetrics);
          return true;
        } else {
          console.warn('No recent metrics found after refresh');
        }
        
        return false;
      } catch (err) {
        console.error('Error verifying data update:', err);
        return false;
      }
    };
    
    const dataVerified = await verifyDataUpdate();
    
    return {
      success: true,
      message: dataVerified 
        ? 'Twitter data refreshed and database updated successfully' 
        : 'Twitter data refreshed but database update could not be verified',
      data
    };
  } catch (error) {
    console.error('Unexpected error during Twitter refresh:', error);
    
    if (retryCount < maxRetries) {
      console.log(`Retrying Twitter refresh (${retryCount + 1}/${maxRetries})...`);
      return triggerTwitterRefresh(retryCount + 1, maxRetries);
    }
    
    return {
      success: false,
      message: 'An unexpected error occurred after multiple attempts',
      error
    };
  }
};

export const publishToTwitter = async (content: string, mediaUrl?: string): Promise<{ success: boolean; message: string; error?: string; data?: any; instructions?: string }> => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      return {
        success: false,
        message: 'You must be logged in to publish to Twitter',
        error: 'Authentication required'
      };
    }
    
    // First, check if we have a valid Twitter connection
    const isConnected = await checkTwitterConnection();
    
    if (!isConnected) {
      return {
        success: false,
        message: 'Twitter connection not found or invalid',
        error: 'No valid Twitter connection',
        instructions: 'Please connect your Twitter account in the Settings page before publishing.'
      };
    }
    
    console.log('Publishing content to Twitter using OAuth 1.0a:', content);
    
    // Verify Twitter credentials before attempting to publish
    console.log('Verifying Twitter credentials before publishing...');
    const verifyResponse = await supabase.functions.invoke('twitter-api', {
      method: 'POST',
      headers: {
        path: '/verify-credentials',
      }
    });
    
    if (verifyResponse.error) {
      console.error('Twitter credentials verification failed:', verifyResponse.error);
      return {
        success: false,
        message: 'Twitter credentials verification failed',
        error: verifyResponse.error.message || 'Unknown error during verification',
        instructions: "Make sure your Twitter API credentials are correctly set in the Supabase Edge Function secrets, and that your app has 'Read and Write' permissions."
      };
    }
    
    console.log('Twitter credentials verification result:', verifyResponse.data);
    if (!verifyResponse.data?.verified) {
      return {
        success: false,
        message: 'Twitter credentials are invalid or insufficient permissions',
        error: verifyResponse.data?.message || 'Verification failed',
        instructions: "Make sure your Twitter app has 'Read and write' permissions enabled in the Twitter Developer Portal settings."
      };
    }
    
    console.log('Twitter credentials verified successfully. Proceeding with tweet...');
    
    // Now proceed with publishing the tweet using OAuth 1.0a
    const response = await supabase.functions.invoke('twitter-api', {
      method: 'POST',
      headers: {
        path: '/tweet',
      },
      body: {
        content: content,
        mediaUrl: mediaUrl
      }
    });
    
    if (response.error) {
      console.error('Twitter API error details:', response.error);
      
      // Enhanced error parsing for better diagnostics
      let errorMessage = response.error.message || 'Unknown error';
      let instructions = undefined;
      
      // Check for specific error conditions
      if (errorMessage.includes('401') || 
          errorMessage.includes('Could not authenticate you') ||
          errorMessage.includes('32')) {
        return {
          success: false,
          message: 'Twitter API Authentication Error',
          error: errorMessage,
          instructions: "There's an issue with your Twitter API credentials. Please verify that the TWITTER_API_KEY, TWITTER_API_SECRET, TWITTER_ACCESS_TOKEN, and TWITTER_ACCESS_TOKEN_SECRET are all correctly set and not expired in your Supabase Edge Function secrets."
        };
      }
      
      if (errorMessage.includes('403') || 
          errorMessage.includes('Forbidden') || 
          errorMessage.includes('permission')) {
        return {
          success: false,
          message: 'Twitter API Permission Error',
          error: errorMessage,
          instructions: "Make sure your Twitter app has 'Read and write' permissions enabled in the Twitter Developer Portal settings, as shown in the screenshot provided. After updating permissions, you need to regenerate your access tokens and update both TWITTER_ACCESS_TOKEN and TWITTER_ACCESS_TOKEN_SECRET in your Supabase project settings."
        };
      }
      
      // Edge function error
      if (errorMessage.includes('Edge Function returned a non-2xx status code')) {
        return {
          success: false,
          message: 'Twitter Edge Function Error',
          error: 'The Twitter integration function returned an error. Please check the edge function logs for details.',
          instructions: "Review the edge function logs in your Supabase dashboard for detailed error information."
        };
      }
      
      return {
        success: false,
        message: 'Failed to publish to Twitter',
        error: errorMessage
      };
    }
    
    console.log('Successfully published to Twitter:', response.data);
    
    return {
      success: true,
      message: 'Successfully published to Twitter',
      data: response.data
    };
  } catch (error) {
    console.error('Error publishing to Twitter:', error);
    return {
      success: false,
      message: 'Failed to publish to Twitter',
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
};

const RefreshDataButton: React.FC<RefreshDataButtonProps> = ({ 
  className, 
  size = "sm", 
  variant = "outline",
  onRefreshComplete 
}) => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const handleRefresh = async () => {
    setIsRefreshing(true);
    
    toast.promise(triggerTwitterRefresh(), {
      loading: 'Refreshing social media data...',
      success: (data) => {
        setIsRefreshing(false);
        if (onRefreshComplete) {
          onRefreshComplete();
        }
        return `${data.message}`;
      },
      error: (err: Error | { message?: string } | unknown) => {
        setIsRefreshing(false);
        const errorMessage = err instanceof Error ? err.message : 
                             typeof err === 'object' && err !== null && 'message' in err ? 
                             (err as { message: string }).message : 
                             'Unknown error';
        console.error('Refresh error details:', err);
        return `Social media refresh failed: ${errorMessage}`;
      }
    });
  };
  
  return (
    <Button 
      onClick={handleRefresh}
      variant={variant}
      size={size}
      className={className}
      disabled={isRefreshing}
    >
      <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
      {isRefreshing ? 'Refreshing...' : 'Refresh Data'}
    </Button>
  );
};

export default RefreshDataButton;
