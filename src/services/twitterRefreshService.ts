
import { supabase } from "@/integrations/supabase/client";

/**
 * Service for triggering Twitter data refresh operations
 */
export class TwitterRefreshService {
  /**
   * Manually refresh Twitter data for a specific user
   * 
   * @param userId The user ID to refresh data for
   * @returns Promise with the result of the refresh operation
   */
  static async refreshUserData(userId: string): Promise<{
    success: boolean;
    message: string;
    data?: any;
    error?: any;
  }> {
    try {
      console.log(`TwitterRefreshService: Refreshing data for user: ${userId}`);
      
      // Call the twitter-refresh edge function
      const { data, error } = await supabase.functions.invoke('twitter-refresh', {
        method: 'POST',
        body: { userId }
      });
      
      if (error) {
        console.error('TwitterRefreshService: Error in function call:', error);
        return {
          success: false,
          message: error.message || 'Failed to refresh Twitter data',
          error
        };
      }
      
      console.log('TwitterRefreshService: Data refreshed successfully:', data);
      return {
        success: true,
        message: 'Twitter data refreshed successfully',
        data
      };
    } catch (error) {
      console.error('TwitterRefreshService: Unexpected error:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error',
        error
      };
    }
  }
  
  /**
   * Schedule a refresh for all users with connected Twitter accounts
   * This can be called from a cron job
   */
  static async refreshAllUsers(): Promise<{
    success: boolean;
    message: string;
    details: Array<{
      userId: string;
      success: boolean;
      message: string;
    }>;
  }> {
    try {
      console.log('TwitterRefreshService: Starting refresh for all users');
      
      // Get all users with connected Twitter accounts
      const { data: connections, error: connectionError } = await supabase
        .from('platform_connections')
        .select('user_id')
        .eq('platform', 'twitter')
        .eq('connected', true);
      
      if (connectionError) {
        console.error('TwitterRefreshService: Error fetching connections:', connectionError);
        return {
          success: false,
          message: 'Failed to fetch Twitter connections',
          details: []
        };
      }
      
      if (!connections || connections.length === 0) {
        console.log('TwitterRefreshService: No connected Twitter accounts found');
        return {
          success: true,
          message: 'No Twitter accounts to refresh',
          details: []
        };
      }
      
      console.log(`TwitterRefreshService: Found ${connections.length} Twitter connections to refresh`);
      
      // Process each user
      const results = [];
      for (const connection of connections) {
        try {
          const result = await this.refreshUserData(connection.user_id);
          results.push({
            userId: connection.user_id,
            success: result.success,
            message: result.message
          });
        } catch (userError) {
          console.error(`TwitterRefreshService: Error processing user ${connection.user_id}:`, userError);
          results.push({
            userId: connection.user_id,
            success: false,
            message: userError instanceof Error ? userError.message : 'Unknown error'
          });
        }
      }
      
      const successCount = results.filter(r => r.success).length;
      
      return {
        success: successCount > 0,
        message: `Refreshed ${successCount}/${connections.length} Twitter accounts`,
        details: results
      };
    } catch (error) {
      console.error('TwitterRefreshService: Unexpected error in refreshAllUsers:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error during refresh all operation',
        details: []
      };
    }
  }
}
