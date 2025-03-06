
import { supabase, getCurrentUser } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Simple interface for refresh response
interface RefreshResponse {
  success: boolean;
  message: string;
  data?: any;
  error?: any;
}

/**
 * Service to handle Twitter data refresh operations
 */
export const refreshTwitterData = async (): Promise<RefreshResponse> => {
  try {
    // Get the current user
    const user = await getCurrentUser();
    
    if (!user) {
      return {
        success: false,
        message: 'User not authenticated'
      };
    }
    
    // Call the Supabase edge function to refresh Twitter data
    const { data, error } = await supabase.functions.invoke('twitter-refresh', {
      body: { userId: user.id }
    });
    
    if (error) {
      console.error('Error refreshing Twitter data:', error);
      return {
        success: false,
        message: 'Failed to refresh Twitter data',
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
    return {
      success: false,
      message: 'An unexpected error occurred',
      error
    };
  }
};

// Function to manually trigger a Twitter data refresh
export const triggerTwitterRefresh = async () => {
  toast.promise(refreshTwitterData(), {
    loading: 'Refreshing Twitter data...',
    success: (data) => `${data.message}`,
    error: (err) => `Twitter refresh failed: ${err.message || 'Unknown error'}`
  });
};
