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

export const publishToTwitter = async (content: string, mediaUrl?: string): Promise<RefreshResponse> => {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      toast.error('You need to be logged in to publish to Twitter');
      return {
        success: false,
        message: 'User not authenticated'
      };
    }
    
    const { data, error } = await supabase.functions.invoke('twitter-api', {
      method: 'POST',
      body: { 
        content, 
        mediaUrl 
      },
      headers: {
        Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        path: '/tweet'
      }
    });
    
    if (error) {
      console.error('Error publishing to Twitter:', error);
      return {
        success: false,
        message: 'Failed to publish to Twitter',
        error
      };
    }
    
    return {
      success: true,
      message: 'Content published successfully to Twitter',
      data
    };
  } catch (error) {
    console.error('Unexpected error during Twitter publish:', error);
    return {
      success: false,
      message: 'An unexpected error occurred while publishing to Twitter',
      error
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
