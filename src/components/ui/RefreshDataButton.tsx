
import React, { useState } from 'react';
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
    
    console.log('Publishing content to Twitter:', content);
    console.log('Using Twitter API endpoint for publishing');
    
    // Add diagnostic logging for the session token
    console.log('Session available:', !!session, 'Token length:', session.access_token.length);
    
    // First verify Twitter credentials before attempting to publish
    try {
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
          error: verifyResponse.error.message || 'Unknown error during verification'
        };
      }
      
      console.log('Twitter credentials verification result:', verifyResponse.data);
      if (!verifyResponse.data?.verified) {
        return {
          success: false,
          message: 'Twitter credentials are invalid or insufficient permissions',
          error: verifyResponse.data?.message || 'Verification failed'
        };
      }
      
      console.log('Twitter credentials verified successfully. Proceeding with tweet...');
    } catch (verifyError) {
      console.error('Error during Twitter credentials verification:', verifyError);
    }
    
    // Now proceed with publishing the tweet
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
      let detailedError = {};
      
      try {
        if (typeof errorMessage === 'string' && errorMessage.includes('{')) {
          // Try to extract JSON from error message
          const jsonStart = errorMessage.indexOf('{');
          const jsonEnd = errorMessage.lastIndexOf('}') + 1;
          const jsonString = errorMessage.substring(jsonStart, jsonEnd);
          detailedError = JSON.parse(jsonString);
          console.log('Parsed error details:', detailedError);
        }
      } catch (parseError) {
        console.error('Error parsing error details:', parseError);
      }
      
      // Check for specific error conditions
      if (errorMessage.includes('403') || 
          errorMessage.includes('Forbidden') || 
          errorMessage.includes('permission')) {
        return {
          success: false,
          message: 'Twitter API Permission Error',
          error: errorMessage,
          instructions: "Make sure your Twitter app has 'Read and write' permissions enabled in the Twitter Developer Portal settings, as shown in the screenshot provided. After updating permissions, you may need to regenerate your tokens."
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
