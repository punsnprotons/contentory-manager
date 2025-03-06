
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { supabase, getCurrentUser } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface RefreshDataButtonProps {
  className?: string;
}

export const triggerTwitterRefresh = async (retryCount = 0, maxRetries = 2) => {
  try {
    // Get the current user
    const user = await getCurrentUser();
    
    if (!user) {
      toast.error('You need to be logged in to refresh data');
      return {
        success: false,
        message: 'User not authenticated'
      };
    }
    
    // Get the user's database ID first
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
    
    // Call the twitter-api edge function to refresh Twitter data with improved timeout and retry options
    const { data, error } = await supabase.functions.invoke('twitter-api', {
      method: 'GET',
      headers: {
        path: '/refresh',
        Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
      },
      body: { timeout: 60000 } // Extended timeout for slow connections
    });
    
    if (error) {
      console.error('Error refreshing Twitter data:', error);
      
      // Implement retry logic for network errors
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
    
    return {
      success: true,
      message: 'Twitter data refreshed successfully',
      data
    };
  } catch (error) {
    console.error('Unexpected error during Twitter refresh:', error);
    
    // Retry on unexpected errors as well
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

const RefreshDataButton: React.FC<RefreshDataButtonProps> = ({ className }) => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const handleRefresh = async () => {
    setIsRefreshing(true);
    
    toast.promise(triggerTwitterRefresh(), {
      loading: 'Refreshing social media data...',
      success: (data) => {
        setIsRefreshing(false);
        return `${data.message}`;
      },
      error: (err) => {
        setIsRefreshing(false);
        const errorMessage = err.message || 'Unknown error';
        console.error('Refresh error details:', err);
        return `Social media refresh failed: ${errorMessage}`;
      }
    });
  };
  
  return (
    <Button 
      onClick={handleRefresh}
      variant="outline"
      size="sm"
      className={className}
      disabled={isRefreshing}
    >
      <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
      {isRefreshing ? 'Refreshing...' : 'Refresh Data'}
    </Button>
  );
};

export default RefreshDataButton;
