
import { supabase } from "@/integrations/supabase/client";
import { TwitterApiService } from "./twitterApiService";
import { toast } from "sonner";
import { Session } from "@supabase/supabase-js";

/**
 * Service for managing Twitter data refresh operations
 */
export class TwitterRefreshService {
  /**
   * Refresh all Twitter data for a user
   */
  static async refreshUserData(userId: string): Promise<{
    profileData: any;
    tweetCount: number;
    engagementRate: number | null;
    bestDay: string | null;
  } | null> {
    try {
      console.log(`TwitterRefreshService: Starting data refresh for user ${userId}`);
      
      // Initialize Twitter API service
      const twitterService = new TwitterApiService(userId);
      await twitterService.initialize();
      
      // Fetch profile data
      const profileData = await twitterService.fetchProfileData();
      console.log(`TwitterRefreshService: Profile data fetched`);
      
      // Fetch recent tweets
      const tweets = await twitterService.fetchUserTweets(20);
      console.log(`TwitterRefreshService: ${tweets.length} tweets fetched`);
      
      // Calculate engagement metrics
      const engagementMetrics = await twitterService.calculateEngagementMetrics();
      console.log(`TwitterRefreshService: Engagement metrics calculated: ${engagementMetrics?.engagementRate}%`);
      
      // Analyze daily engagement
      const dailyEngagement = await twitterService.analyzeDailyEngagement();
      console.log(`TwitterRefreshService: Daily engagement analyzed`);
      
      // Collect period statistics
      const statistics = await twitterService.collectPeriodStatistics(30);
      console.log(`TwitterRefreshService: Period statistics collected`);
      
      // Create notification
      const { error: notificationError } = await supabase
        .from('notifications')
        .insert({
          user_id: userId,
          type: 'info',
          message: 'Your Twitter data has been refreshed successfully.'
        });
        
      if (notificationError) {
        console.error('TwitterRefreshService: Error creating notification:', notificationError);
      }
      
      // Find best day for engagement
      let bestDay = null;
      let bestCount = 0;
      
      if (dailyEngagement) {
        for (const [day, count] of Object.entries(dailyEngagement)) {
          if (count > bestCount) {
            bestDay = day;
            bestCount = count as number;
          }
        }
      }
      
      toast.success("Twitter data refreshed successfully!");
      
      return {
        profileData,
        tweetCount: Array.isArray(tweets) ? tweets.length : 0,
        engagementRate: engagementMetrics?.engagementRate || null,
        bestDay
      };
    } catch (error) {
      console.error('TwitterRefreshService: Error refreshing Twitter data:', error);
      
      // Create error notification
      try {
        const { error: notificationError } = await supabase
          .from('notifications')
          .insert({
            user_id: userId,
            type: 'error',
            message: 'Failed to refresh Twitter data. Please check your connection.'
          });
          
        if (notificationError) {
          console.error('TwitterRefreshService: Error creating error notification:', notificationError);
        }
      } catch (notifError) {
        console.error('TwitterRefreshService: Error creating notification:', notifError);
      }
      
      toast.error("Failed to refresh Twitter data");
      throw error;
    }
  }
  
  /**
   * Post a tweet for a user
   */
  static async postTweet(userId: string, content: string, mediaUrl: string | null = null): Promise<{
    tweetId: string;
    contentId: string;
  } | null> {
    try {
      console.log(`TwitterRefreshService: Posting tweet for user ${userId}`);
      
      // Initialize Twitter API service
      const twitterService = new TwitterApiService(userId);
      await twitterService.initialize();
      
      // Determine content type
      const contentType = mediaUrl 
        ? (mediaUrl.includes('.mp4') ? 'video' : 'image') 
        : 'text';
      
      // Post tweet - Note: Our implementation uses different approach than the one in example
      const tweetResponse = await twitterService.sendTweet(content);
      const tweetId = tweetResponse?.data?.id || 'unknown';
      
      console.log(`TwitterRefreshService: Tweet posted with ID ${tweetId}`);
      
      // Store in database
      const { data: contentData, error: contentError } = await supabase
        .from('content')
        .insert({
          user_id: userId,
          platform: 'twitter',
          type: contentType,
          intent: 'promotional', // Default intent
          status: 'published',
          content: content,
          media_url: mediaUrl,
          published_at: new Date().toISOString()
        })
        .select('id')
        .single();
        
      if (contentError || !contentData) {
        throw new Error(`Failed to store content: ${contentError?.message || 'Unknown error'}`);
      }
      
      const contentId = contentData.id;
      
      // Insert initial metrics
      const { error: metricsError } = await supabase
        .from('content_metrics')
        .insert({
          content_id: contentId,
          likes: 0,
          comments: 0,
          shares: 0,
          views: 0,
          impressions: 0,
          reach: 0
        });
        
      if (metricsError) {
        console.error('TwitterRefreshService: Error creating metrics:', metricsError);
      }
      
      // Store activity
      const { error: activityError } = await supabase
        .from('activity_history')
        .insert({
          user_id: userId,
          content_id: contentId,
          platform: 'twitter',
          activity_type: 'post',
          activity_detail: { tweet_id: tweetId }
        });
        
      if (activityError) {
        console.error('TwitterRefreshService: Error creating activity:', activityError);
      }
      
      // Create notification
      const { error: notificationError } = await supabase
        .from('notifications')
        .insert({
          user_id: userId,
          type: 'success',
          message: 'Your tweet was published successfully.',
          related_content_id: contentId
        });
        
      if (notificationError) {
        console.error('TwitterRefreshService: Error creating notification:', notificationError);
      }
      
      toast.success("Tweet posted successfully!");
      
      return {
        tweetId,
        contentId
      };
    } catch (error) {
      console.error('TwitterRefreshService: Error posting tweet:', error);
      
      // Create error notification
      try {
        const { error: notificationError } = await supabase
          .from('notifications')
          .insert({
            user_id: userId,
            type: 'error',
            message: `Failed to post tweet. ${error instanceof Error ? error.message : 'Unknown error'}`
          });
          
        if (notificationError) {
          console.error('TwitterRefreshService: Error creating error notification:', notificationError);
        }
      } catch (notifError) {
        console.error('TwitterRefreshService: Error creating notification:', notifError);
      }
      
      toast.error("Failed to post tweet");
      throw error;
    }
  }

  /**
   * Set up a refresh schedule
   * Called when user logs in to start the refresh cycle
   */
  static setupRefreshSchedule(session: Session | null): NodeJS.Timeout | null {
    if (!session?.user?.id) {
      console.log("TwitterRefreshService: No session, not setting up refresh schedule");
      return null;
    }
    
    // Initial refresh
    TwitterRefreshService.refreshUserData(session.user.id)
      .catch(err => console.error("TwitterRefreshService: Initial refresh failed:", err));
    
    // Schedule refresh every 4 hours
    const refreshInterval = 4 * 60 * 60 * 1000; // 4 hours in milliseconds
    console.log(`TwitterRefreshService: Setting up refresh schedule every ${refreshInterval/3600000} hours`);
    
    const intervalId = setInterval(() => {
      TwitterRefreshService.refreshUserData(session.user.id)
        .catch(err => console.error("TwitterRefreshService: Scheduled refresh failed:", err));
    }, refreshInterval);
    
    return intervalId;
  }
  
  /**
   * Clean up refresh schedule
   */
  static clearRefreshSchedule(intervalId: NodeJS.Timeout | null): void {
    if (intervalId) {
      clearInterval(intervalId);
      console.log("TwitterRefreshService: Cleared refresh schedule");
    }
  }
}

// Add a hook to automatically integrate with supabase auth
let refreshIntervalId: NodeJS.Timeout | null = null;

// Setup auth state change handler
supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_IN' && session) {
    console.log("TwitterRefreshService: User signed in, setting up refresh schedule");
    // Clear any existing interval
    if (refreshIntervalId) {
      TwitterRefreshService.clearRefreshSchedule(refreshIntervalId);
    }
    // Set up new refresh schedule
    refreshIntervalId = TwitterRefreshService.setupRefreshSchedule(session);
  } else if (event === 'SIGNED_OUT') {
    console.log("TwitterRefreshService: User signed out, clearing refresh schedule");
    TwitterRefreshService.clearRefreshSchedule(refreshIntervalId);
    refreshIntervalId = null;
  }
});

// Helper function to get an instance for manual refreshes
export async function refreshTwitterData(session: Session | null): Promise<{
  profileData: any;
  tweetCount: number;
  engagementRate: number | null;
  bestDay: string | null;
} | null> {
  if (!session?.user) {
    console.log("TwitterRefreshService: No session provided for manual refresh");
    return null;
  }
  
  return TwitterRefreshService.refreshUserData(session.user.id);
}

// Helper function to post a tweet
export async function postTweet(
  session: Session | null, 
  content: string, 
  mediaUrl: string | null = null
): Promise<{
  tweetId: string;
  contentId: string;
} | null> {
  if (!session?.user) {
    console.log("TwitterRefreshService: No session provided for posting tweet");
    return null;
  }
  
  return TwitterRefreshService.postTweet(session.user.id, content, mediaUrl);
}
