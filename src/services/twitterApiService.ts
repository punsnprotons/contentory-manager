import { supabase } from "@/integrations/supabase/client";
import { Session } from "@supabase/supabase-js";
import { ContentType } from "@/types";
import { toast } from "sonner";

/**
 * Twitter API Service for making authenticated Twitter API calls
 */
export class TwitterApiService {
  private userId: string;
  private username?: string;
  private accessToken?: string;
  private accessTokenSecret?: string;
  private isInitialized = false;
  private statisticsInterval: NodeJS.Timeout | null = null;

  constructor(userId: string) {
    this.userId = userId;
    console.log(`TwitterApiService: Constructor initialized with userId: ${userId}`);
  }

  /**
   * Initialize the Twitter service by loading credentials from the database
   */
  async initialize(): Promise<TwitterApiService> {
    console.log(`TwitterApiService: Initializing service for userId: ${this.userId}`);
    
    // First try to get user's Twitter connection using the auth_id directly
    let { data: connection, error } = await supabase
      .from('platform_connections')
      .select('*')
      .eq('user_id', this.userId)
      .eq('platform', 'twitter')
      .eq('connected', true)
      .single();
    
    console.log(`TwitterApiService: Query results using direct ID - connection:`, connection, "error:", error);
    
    // If no connection found with direct ID, try to find the user record first
    if (error || !connection) {
      console.log(`TwitterApiService: No connection found with direct ID, trying to find user record first`);
      
      // Get the user record to find the actual user_id
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('auth_id', this.userId)
        .single();
      
      console.log(`TwitterApiService: User lookup results:`, user, "error:", userError);
      
      if (user && !userError) {
        // Now try again with the actual user_id from the users table
        const { data: retryConnection, error: retryError } = await supabase
          .from('platform_connections')
          .select('*')
          .eq('user_id', user.id)
          .eq('platform', 'twitter')
          .eq('connected', true)
          .single();
        
        console.log(`TwitterApiService: Retry query results with user.id - connection:`, retryConnection, "error:", retryError);
        
        if (retryConnection && !retryError) {
          connection = retryConnection;
          error = null;
        }
      }
    }
    
    if (error || !connection) {
      this.isInitialized = false;
      console.error(`TwitterApiService: Initialization failed - ${error?.message || 'No connected Twitter account found'}`);
      throw new Error('No connected Twitter account found');
    }
    
    this.username = connection.username;
    this.accessToken = connection.access_token || undefined;
    this.accessTokenSecret = connection.refresh_token || undefined;
    this.isInitialized = true;
    
    console.log(`TwitterApiService: Successfully initialized for ${this.username}`);
    
    return this;
  }

  /**
   * Checks if the service is initialized
   */
  isServiceInitialized(): boolean {
    return this.isInitialized;
  }

  /**
   * Send a tweet
   */
  async sendTweet(text: string): Promise<any> {
    if (!this.isInitialized) {
      throw new Error('Twitter service not initialized');
    }
    
    try {
      const response = await supabase.functions.invoke('twitter-integration', {
        method: 'POST',
        body: { 
          endpoint: 'tweet',
          text
        }
      });
      
      if (response.error) {
        throw new Error(response.error.message);
      }
      
      return response.data;
    } catch (error) {
      console.error('Error sending tweet:', error);
      throw error;
    }
  }

  /**
   * Get the current user profile
   */
  async getUserProfile(): Promise<any> {
    if (!this.isInitialized) {
      throw new Error('Twitter service not initialized');
    }
    
    try {
      const response = await supabase.functions.invoke('twitter-integration', {
        method: 'POST',
        body: { endpoint: 'user' }
      });
      
      if (response.error) {
        throw new Error(response.error.message);
      }
      
      return response.data;
    } catch (error) {
      console.error('Error getting user profile:', error);
      throw error;
    }
  }

  /**
   * Fetch and store Twitter profile data
   */
  async fetchProfileData(): Promise<any> {
    console.log(`TwitterApiService: fetchProfileData - isInitialized: ${this.isInitialized}`);
    
    if (!this.isInitialized) {
      console.error("TwitterApiService: Cannot fetch profile data - service not initialized");
      throw new Error('Twitter service not initialized');
    }
    
    try {
      console.log("TwitterApiService: Fetching profile data via edge function");
      // Get user profile via the edge function
      const response = await supabase.functions.invoke('twitter-integration', {
        method: 'POST',
        body: { endpoint: 'profile' }
      });
      
      console.log("TwitterApiService: Profile response:", response);
      
      if (response.error) {
        console.error("TwitterApiService: Error from edge function:", response.error);
        throw new Error(response.error.message);
      }
      
      const profileData = response.data;
      
      if (profileData && profileData.data) {
        // Store follower count in the database
        if (profileData.data.public_metrics && profileData.data.public_metrics.followers_count) {
          console.log(`TwitterApiService: Storing follower count: ${profileData.data.public_metrics.followers_count}`);
          
          const { error: followerError } = await supabase
            .from('follower_metrics')
            .insert({
              user_id: this.userId,
              platform: 'twitter',
              follower_count: profileData.data.public_metrics.followers_count,
              recorded_at: new Date().toISOString().split('T')[0] // Convert Date to string in ISO format
            });
            
          if (followerError) {
            console.error('TwitterApiService: Error storing follower metrics:', followerError);
          }
        }
        
        // Update platform connection with profile image if available
        if (profileData.data.profile_image_url) {
          console.log(`TwitterApiService: Updating profile image URL: ${profileData.data.profile_image_url}`);
          
          // First check if we need to update the connection using direct userId
          let { error: updateError } = await supabase
            .from('platform_connections')
            .update({
              profile_image: profileData.data.profile_image_url,
              updated_at: new Date().toISOString() // Convert Date to string for updated_at field
            })
            .eq('user_id', this.userId)
            .eq('platform', 'twitter');
            
          if (updateError) {
            // If failed, try to use user lookup to find the real user ID
            const { data: user, error: userError } = await supabase
              .from('users')
              .select('id')
              .eq('auth_id', this.userId)
              .single();
            
            if (user && !userError) {
              // Try update again with user.id
              const { error: retryUpdateError } = await supabase
                .from('platform_connections')
                .update({
                  profile_image: profileData.data.profile_image_url,
                  updated_at: new Date().toISOString()
                })
                .eq('user_id', user.id)
                .eq('platform', 'twitter');
                
              if (retryUpdateError) {
                console.error('TwitterApiService: Error updating profile image with user.id:', retryUpdateError);
              }
            } else {
              console.error('TwitterApiService: Error looking up user for platform connection update:', userError);
            }
          }
        }
      }
      
      console.log("TwitterApiService: Successfully fetched and processed profile data");
      return profileData.data;
    } catch (error) {
      console.error('TwitterApiService: Error fetching and storing profile data:', error);
      throw error;
    }
  }

  /**
   * Fetch user tweets and store them in the database
   */
  async fetchUserTweets(limit = 50): Promise<any> {
    console.log(`TwitterApiService: fetchUserTweets - isInitialized: ${this.isInitialized}, username: ${this.username}`);
    
    if (!this.isInitialized) {
      console.error("TwitterApiService: Cannot fetch tweets - service not initialized");
      throw new Error('Twitter service not initialized');
    }
    
    try {
      console.log(`TwitterApiService: Fetching tweets for ${this.username} via edge function`);
      
      const response = await supabase.functions.invoke('twitter-integration', {
        method: 'POST',
        body: { 
          endpoint: 'tweets',
          limit
        }
      });
      
      console.log("TwitterApiService: Tweets response:", response);
      
      if (response.error) {
        console.error("TwitterApiService: Error from edge function:", response.error);
        throw new Error(response.error.message);
      }
      
      const tweetsData = response.data;
      
      if (!tweetsData || !tweetsData.data || !Array.isArray(tweetsData.data)) {
        console.error("TwitterApiService: Invalid response format from tweet fetch", tweetsData);
        throw new Error('Invalid response format from tweet fetch');
      }
      
      console.log(`TwitterApiService: Retrieved ${tweetsData.data.length} tweets`);
      
      // Store each tweet in the database
      for (const tweet of tweetsData.data) {
        // Determine media type and URL if present
        let mediaType: ContentType = 'text';
        let mediaUrl = null;
        
        if (tweet.attachments && tweet.attachments.media_keys && tweetsData.includes?.media) {
          const mediaKey = tweet.attachments.media_keys[0];
          const media = tweetsData.includes.media.find(m => m.media_key === mediaKey);
          
          if (media) {
            mediaType = media.type === 'photo' ? 'image' : (media.type === 'video' ? 'video' : 'text');
            mediaUrl = media.url || media.preview_image_url;
          }
        }
        
        // Store in content table
        const { data: contentData, error: contentError } = await supabase
          .from('content')
          .insert({
            type: mediaType,
            platform: 'twitter',
            intent: 'news', // Default intent
            status: 'published',
            content: tweet.text,
            media_url: mediaUrl,
            published_at: new Date(tweet.created_at).toISOString(),
            user_id: this.userId
          })
          .select('id')
          .single();
        
        if (contentError) {
          console.error(`TwitterApiService: Error storing tweet content:`, contentError);
          continue;
        }
        
        // Store metrics if we have public_metrics
        if (tweet.public_metrics && contentData) {
          const { error: metricsError } = await supabase
            .from('content_metrics')
            .insert({
              content_id: contentData.id,
              likes: tweet.public_metrics.like_count || 0,
              comments: tweet.public_metrics.reply_count || 0,
              shares: tweet.public_metrics.retweet_count || 0,
              views: tweet.public_metrics.impression_count || 0,
              impressions: tweet.public_metrics.impression_count || 0,
              reach: tweet.public_metrics.impression_count || 0 // Twitter doesn't provide exact reach
            });
            
          if (metricsError) {
            console.error(`TwitterApiService: Error storing tweet metrics:`, metricsError);
          }
        }
        
        // Store activity history
        if (contentData) {
          const { error: activityError } = await supabase
            .from('activity_history')
            .insert({
              user_id: this.userId,
              content_id: contentData.id,
              platform: 'twitter',
              activity_type: 'post',
              activity_detail: { tweet_id: tweet.id },
              occurred_at: new Date(tweet.created_at).toISOString()
            });
            
          if (activityError) {
            console.error(`TwitterApiService: Error storing activity history:`, activityError);
          }
        }
      }
      
      console.log("TwitterApiService: Successfully stored tweets in the database");
      return tweetsData.data;
    } catch (error) {
      console.error('TwitterApiService: Error fetching and storing user tweets:', error);
      throw error;
    }
  }

  /**
   * Calculate engagement metrics based on content performance
   */
  async calculateEngagementMetrics(): Promise<{
    engagementRate: number;
    totalEngagements: number;
    totalPosts: number;
    followerCount: number;
  } | null> {
    console.log(`TwitterApiService: calculateEngagementMetrics - isInitialized: ${this.isInitialized}`);
    
    if (!this.isInitialized) {
      console.error("TwitterApiService: Cannot calculate metrics - service not initialized");
      throw new Error('Twitter service not initialized');
    }
    
    try {
      console.log(`TwitterApiService: Calculating engagement metrics for user: ${this.userId}`);
      
      // Get latest content metrics for this user's Twitter content
      const { data: metricsData, error: metricsError } = await supabase
        .from('content')
        .select(`
          id,
          content_metrics (
            likes,
            comments,
            shares,
            views
          )
        `)
        .eq('user_id', this.userId)
        .eq('platform', 'twitter')
        .eq('status', 'published')
        .order('published_at', { ascending: false })
        .limit(50);
        
      if (metricsError) {
        console.error("TwitterApiService: Error fetching content metrics:", metricsError);
        throw metricsError;
      }
      
      if (!metricsData || metricsData.length === 0) {
        console.log("TwitterApiService: No content metrics found");
        return null;
      }
      
      console.log(`TwitterApiService: Found ${metricsData.length} posts with metrics`);
      
      // Calculate total engagement
      let totalEngagements = 0;
      let totalPosts = metricsData.length;
      
      let totalLikes = 0;
      let totalComments = 0;
      let totalShares = 0;
      let totalViews = 0;
      
      for (const post of metricsData) {
        // Each post can have multiple metrics entries, but we're only getting the latest
        const metrics = Array.isArray(post.content_metrics) ? post.content_metrics[0] : post.content_metrics;
        
        if (metrics) {
          totalLikes += metrics.likes || 0;
          totalComments += metrics.comments || 0;
          totalShares += metrics.shares || 0;
          totalViews += metrics.views || 0;
          
          totalEngagements += (metrics.likes || 0) + (metrics.comments || 0) + (metrics.shares || 0);
        }
      }
      
      // Get follower count
      const { data: followerData, error: followerError } = await supabase
        .from('follower_metrics')
        .select('follower_count')
        .eq('user_id', this.userId)
        .eq('platform', 'twitter')
        .order('recorded_at', { ascending: false })
        .limit(1)
        .single();
        
      if (followerError && followerError.code !== 'PGRST116') {
        console.error("TwitterApiService: Error fetching follower metrics:", followerError);
        // Continue with a default value instead of throwing
      }
      
      const followerCount = followerData?.follower_count || 1; // Prevent division by zero
      console.log(`TwitterApiService: Using follower count of ${followerCount}`);
      
      // Calculate engagement rate (total engagements / (followers * posts))
      const engagementRate = (totalEngagements / (followerCount * totalPosts)) * 100;
      console.log(`TwitterApiService: Calculated engagement rate: ${engagementRate}%`);
      
      // Store engagement metrics
      const { error: engagementInsertError } = await supabase
        .from('engagement_metrics')
        .insert({
          user_id: this.userId,
          platform: 'twitter',
          engagement_rate: engagementRate,
          // recorded_at and created_at will use defaults
        });
        
      if (engagementInsertError) {
        console.error("TwitterApiService: Error inserting engagement metrics:", engagementInsertError);
        throw engagementInsertError;
      }
      
      // Check if performance metrics record exists
      const { data: performanceData, error: performanceError } = await supabase
        .from('performance_metrics')
        .select('id')
        .eq('user_id', this.userId)
        .eq('platform', 'twitter');
        
      if (performanceError) {
        console.error("TwitterApiService: Error checking performance metrics:", performanceError);
        throw performanceError;
      }
      
      if (!performanceData || performanceData.length === 0) {
        // Create new performance metrics record
        console.log("TwitterApiService: Creating new performance metrics record");
        const { error: insertError } = await supabase
          .from('performance_metrics')
          .insert({
            user_id: this.userId,
            platform: 'twitter',
            total_likes: totalLikes,
            total_comments: totalComments,
            total_shares: totalShares,
            total_views: totalViews
          });
          
        if (insertError) {
          console.error("TwitterApiService: Error inserting performance metrics:", insertError);
          throw insertError;
        }
      } else {
        // Update existing performance metrics record
        console.log("TwitterApiService: Updating existing performance metrics record");
        const { error: updateError } = await supabase
          .from('performance_metrics')
          .update({
            total_likes: totalLikes,
            total_comments: totalComments,
            total_shares: totalShares,
            total_views: totalViews
          })
          .eq('id', performanceData[0].id);
          
        if (updateError) {
          console.error("TwitterApiService: Error updating performance metrics:", updateError);
          throw updateError;
        }
      }
      
      console.log("TwitterApiService: Successfully calculated and stored engagement metrics");
      return {
        engagementRate,
        totalEngagements,
        totalPosts,
        followerCount
      };
    } catch (error) {
      console.error('TwitterApiService: Error calculating engagement metrics:', error);
      throw error;
    }
  }

  /**
   * Analyze daily engagement patterns
   */
  async analyzeDailyEngagement(): Promise<Record<string, number> | null> {
    console.log(`TwitterApiService: analyzeDailyEngagement - isInitialized: ${this.isInitialized}`);
    
    if (!this.isInitialized) {
      console.error("TwitterApiService: Cannot analyze daily engagement - service not initialized");
      throw new Error('Twitter service not initialized');
    }
    
    try {
      console.log(`TwitterApiService: Analyzing daily engagement for user: ${this.userId}`);
      
      // Fetch tweets with their engagement data via edge function
      const response = await supabase.functions.invoke('twitter-integration', {
        method: 'POST',
        body: { 
          endpoint: 'tweets',
          limit: 100,
          fields: ['created_at', 'public_metrics']
        }
      });
      
      console.log("TwitterApiService: Daily engagement tweets response:", response);
      
      if (response.error) {
        console.error("TwitterApiService: Error from edge function:", response.error);
        throw new Error(response.error.message);
      }
      
      const tweetsData = response.data;
      
      if (!tweetsData || !tweetsData.data || !Array.isArray(tweetsData.data)) {
        console.error("TwitterApiService: Invalid response format from tweet fetch", tweetsData);
        throw new Error('Invalid response format from tweet fetch');
      }
      
      // Aggregate engagement by day of week
      const dailyEngagement: Record<string, number> = {
        'Sunday': 0,
        'Monday': 0,
        'Tuesday': 0,
        'Wednesday': 0,
        'Thursday': 0,
        'Friday': 0,
        'Saturday': 0
      };
      
      const dailyCount: Record<string, number> = { ...dailyEngagement };
      
      for (const tweet of tweetsData.data) {
        const date = new Date(tweet.created_at);
        const day = date.toLocaleDateString('en-US', { weekday: 'long' });
        
        const engagement = 
          (tweet.public_metrics?.like_count || 0) + 
          (tweet.public_metrics?.reply_count || 0) + 
          (tweet.public_metrics?.retweet_count || 0);
        
        dailyEngagement[day] += engagement;
        dailyCount[day]++;
      }
      
      // Calculate average engagement per day
      const averageDailyEngagement: Record<string, number> = {};
      for (const day in dailyEngagement) {
        averageDailyEngagement[day] = dailyCount[day] > 0 
          ? Math.round(dailyEngagement[day] / dailyCount[day]) 
          : 0;
      }
      
      console.log(`TwitterApiService: Calculated average daily engagement:`, averageDailyEngagement);
      
      // Store in database - for each day check if entry exists and update or create
      for (const day in averageDailyEngagement) {
        // Check if entry exists
        const { data: existingData, error: existingError } = await supabase
          .from('daily_engagement')
          .select('id')
          .eq('user_id', this.userId)
          .eq('platform', 'twitter')
          .eq('day_of_week', day);
          
        if (existingError) {
          console.error(`TwitterApiService: Error checking existing daily engagement for ${day}:`, existingError);
          continue; // Continue with next day
        }
        
        if (!existingData || existingData.length === 0) {
          // Create new entry
          console.log(`TwitterApiService: Creating new daily engagement entry for ${day}`);
          const { error: insertError } = await supabase
            .from('daily_engagement')
            .insert({
              user_id: this.userId,
              platform: 'twitter',
              day_of_week: day,
              engagement_count: averageDailyEngagement[day]
            });
            
          if (insertError) {
            console.error(`TwitterApiService: Error inserting daily engagement for ${day}:`, insertError);
          }
        } else {
          // Update existing entry
          console.log(`TwitterApiService: Updating existing daily engagement entry for ${day}`);
          const { error: updateError } = await supabase
            .from('daily_engagement')
            .update({
              engagement_count: averageDailyEngagement[day],
              updated_at: new Date().toISOString()
            })
            .eq('id', existingData[0].id);
            
          if (updateError) {
            console.error(`TwitterApiService: Error updating daily engagement for ${day}:`, updateError);
          }
        }
      }
      
      console.log("TwitterApiService: Successfully analyzed and stored daily engagement");
      return averageDailyEngagement;
    } catch (error) {
      console.error('TwitterApiService: Error analyzing daily engagement:', error);
      throw error;
    }
  }

  /**
   * Collect period statistics for a given number of days
   */
  async collectPeriodStatistics(periodDays = 30): Promise<{
    periodStart: Date;
    periodEnd: Date;
    totalFollowers: number;
    postCount: number;
    engagementRate: number;
    avgReachPerPost: number;
  } | null> {
    console.log(`TwitterApiService: collectPeriodStatistics - isInitialized: ${this.isInitialized}`);
    
    if (!this.isInitialized) {
      console.error("TwitterApiService: Cannot collect period statistics - service not initialized");
      throw new Error('Twitter service not initialized');
    }
    
    try {
      console.log(`TwitterApiService: Collecting ${periodDays} day period statistics for user: ${this.userId}`);
      
      const periodStart = new Date();
      periodStart.setDate(periodStart.getDate() - periodDays);
      const periodEnd = new Date();
      
      // Get follower counts
      const { data: followerData, error: followerError } = await supabase
        .from('follower_metrics')
        .select('follower_count')
        .eq('user_id', this.userId)
        .eq('platform', 'twitter')
        .order('recorded_at', { ascending: false })
        .limit(1)
        .single();
        
      if (followerError && followerError.code !== 'PGRST116') {
        console.error("TwitterApiService: Error fetching follower metrics:", followerError);
        // Continue with a default value instead of throwing
      }
      
      const totalFollowers = followerData?.follower_count || 0;
      console.log(`TwitterApiService: Using follower count of ${totalFollowers}`);
      
      // Get content posted in period
      const { data: contentData, error: contentError } = await supabase
        .from('content')
        .select('id')
        .eq('user_id', this.userId)
        .eq('platform', 'twitter')
        .eq('status', 'published')
        .gte('published_at', periodStart.toISOString())
        .lte('published_at', periodEnd.toISOString());
        
      if (contentError) {
        console.error("TwitterApiService: Error fetching content in period:", contentError);
        throw contentError;
      }
      
      const postCount = contentData?.length || 0;
      console.log(`TwitterApiService: Found ${postCount} posts in period`);
      
      // Get engagement rate
      const { data: engagementData, error: engagementError } = await supabase
        .from('engagement_metrics')
        .select('engagement_rate')
        .eq('user_id', this.userId)
        .eq('platform', 'twitter')
        .order('recorded_at', { ascending: false })
        .limit(1)
        .single();
        
      if (engagementError && engagementError.code !== 'PGRST116') {
        console.error("TwitterApiService: Error fetching engagement metrics:", engagementError);
        // Continue with a default value instead of throwing
      }
      
      const engagementRate = engagementData?.engagement_rate || 0;
      console.log(`TwitterApiService: Using engagement rate of ${engagementRate}`);
      
      // Get average reach per post
      const { data: contentMetricsData, error: contentMetricsError } = await supabase
        .from('content')
        .select(`
          id,
          content_metrics (
            reach
          )
        `)
        .eq('user_id', this.userId)
        .eq('platform', 'twitter')
        .eq('status', 'published')
        .gte('published_at', periodStart.toISOString())
        .lte('published_at', periodEnd.toISOString());
        
      if (contentMetricsError) {
        console.error("TwitterApiService: Error fetching content metrics for reach calculation:", contentMetricsError);
        throw contentMetricsError;
      }
      
      let totalReach = 0;
      let reachCount = 0;
      
      if (contentMetricsData) {
        for (const content of contentMetricsData) {
          if (content.content_metrics && Array.isArray(content.content_metrics) && content.content_metrics.length > 0) {
            totalReach += content.content_metrics[0].reach || 0;
            reachCount++;
          }
        }
      }
      
      const avgReachPerPost = reachCount > 0 ? Math.round(totalReach / reachCount) : 0;
      console.log(`TwitterApiService: Calculated average reach per post: ${avgReachPerPost}`);
      
      // Check if platform_statistics record exists for this period
      const { data: existingData, error: existingError } = await supabase
        .from('platform_statistics')
        .select('id')
        .eq('user_id', this.userId)
        .eq('platform', 'twitter')
        .eq('period_start', periodStart.toISOString().split('T')[0])
        .eq('period_end', periodEnd.toISOString().split('T')[0]);
        
      if (existingError) {
        console.error("TwitterApiService: Error checking existing platform statistics:", existingError);
        throw existingError;
      }
      
      if (!existingData || existingData.length === 0) {
        // Create new platform_statistics record
        console.log("TwitterApiService: Creating new platform statistics record");
        const { error: insertError } = await supabase
          .from('platform_statistics')
          .insert({
            user_id: this.userId,
            platform: 'twitter',
            period_start: periodStart.toISOString().split('T')[0],
            period_end: periodEnd.toISOString().split('T')[0],
            total_followers: totalFollowers,
            post_count: postCount,
            engagement_rate: engagementRate,
            avg_reach_per_post: avgReachPerPost
          });
          
        if (insertError) {
          console.error("TwitterApiService: Error inserting platform statistics:", insertError);
          throw insertError;
        }
      } else {
        // Update existing platform_statistics record
        console.log("TwitterApiService: Updating existing platform statistics record");
        const { error: updateError } = await supabase
          .from('platform_statistics')
          .update({
            total_followers: totalFollowers,
            post_count: postCount,
            engagement_rate: engagementRate,
            avg_reach_per_post: avgReachPerPost,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingData[0].id);
          
        if (updateError) {
          console.error("TwitterApiService: Error updating platform statistics:", updateError);
          throw updateError;
        }
      }
      
      console.log("TwitterApiService: Successfully collected and stored period statistics");
      return {
        periodStart,
        periodEnd,
        totalFollowers,
        postCount,
        engagementRate,
        avgReachPerPost
      };
    } catch (error) {
      console.error('TwitterApiService: Error collecting period statistics:', error);
      throw error;
    }
  }

  /**
   * Update all statistics (engagement metrics, daily engagement, period statistics)
   */
  async updateAllStatistics(): Promise<void> {
    try {
      console.log("TwitterApiService: Starting update of all statistics");
      
      // Calculate engagement metrics
      await this.calculateEngagementMetrics();
      
      // Analyze daily engagement
      await this.analyzeDailyEngagement();
      
      // Collect period statistics for 30 days
      await this.collectPeriodStatistics(30);
      
      // Collect period statistics for 7 days
      await this.collectPeriodStatistics(7);
      
      console.log("TwitterApiService: Successfully updated all statistics");
    } catch (error) {
      console.error("TwitterApiService: Error updating all statistics:", error);
      // Don't re-throw, just log - we don't want to disrupt the user experience if statistics fail
    }
  }

  /**
   * Start periodic statistics updates
   */
  startPeriodicStatisticsUpdates(intervalMinutes = 60): void {
    // Clear any existing interval
    this.stopPeriodicStatisticsUpdates();
    
    console.log(`TwitterApiService: Starting periodic statistics updates every ${intervalMinutes} minutes`);
    
    // Update immediately upon starting
    this.updateAllStatistics().catch(error => {
      console.error("TwitterApiService: Initial statistics update failed:", error);
    });
    
    // Then set up the interval
    this.statisticsInterval = setInterval(() => {
      this.updateAllStatistics().catch(error => {
        console.error("TwitterApiService: Periodic statistics update failed:", error);
      });
    }, intervalMinutes * 60 * 1000);
  }

  /**
   * Stop periodic statistics updates
   */
  stopPeriodicStatisticsUpdates(): void {
    if (this.statisticsInterval) {
      console.log("TwitterApiService: Stopping periodic statistics updates");
      clearInterval(this.statisticsInterval);
      this.statisticsInterval = null;
    }
  }

  /**
   * Manually trigger tweet fetching and import
   * This can be called from a settings page
   */
  async importTwitterPosts(): Promise<{ success: boolean; message: string }> {
    try {
      console.log("TwitterApiService: Starting manual import of tweets");
      
      // Fetch 50 tweets
      const tweets = await this.fetchUserTweets(50);
      
      return {
        success: true,
        message: `Successfully imported ${tweets.length} tweets from Twitter`
      };
    } catch (error) {
      console.error("TwitterApiService: Error in importTwitterPosts:", error);
      return {
        success: false,
        message: error instanceof Error ? error.message : "Unknown error importing tweets"
      };
    }
  }

  /**
   * Verify the Twitter credentials
   */
  async verifyCredentials(): Promise<any> {
    try {
      const response = await supabase.functions.invoke('twitter-integration', {
        method: 'POST',
        body: { endpoint: 'verify' }
      });
      
      if (response.error) {
        throw new Error(response.error.message);
      }
      
      return response.data;
    } catch (error) {
      console.error('Error verifying credentials:', error);
      throw error;
    }
  }

  /**
   * Initialize Twitter OAuth flow
   */
  async initiateAuth(): Promise<string> {
    try {
      console.log("TwitterApiService: Initiating Twitter OAuth flow");
      const response = await supabase.functions.invoke('twitter-integration', {
        method: 'POST',
        body: { endpoint: 'auth' }
      });
      
      console.log("TwitterApiService: Auth response:", response);
      
      if (response.error || !response.data?.success || !response.data?.authURL) {
        console.error("TwitterApiService: Error initiating auth:", response.error || 'Failed to get auth URL');
        throw new Error(response.error?.message || 'Failed to initialize Twitter authentication');
      }
      
      // Set up a message listener to handle the callback from the popup window
      this.setupAuthMessageListener();
      
      console.log("TwitterApiService: Successfully generated auth URL:", response.data.authURL);
      return response.data.authURL;
    } catch (error) {
      console.error('TwitterApiService: Error initiating Twitter auth:', error);
      throw error;
    }
  }
  
  /**
   * Set up a message listener to handle the callback from Twitter
   */
  private setupAuthMessageListener() {
    console.log("TwitterApiService: Setting up auth message listener");
    
    // Remove any existing listeners to avoid duplicates
    window.removeEventListener('message', this.handleAuthMessage);
    
    // Add the message listener
    window.addEventListener('message', this.handleAuthMessage);
    
    console.log("TwitterApiService: Auth message listener set up");
  }
  
  /**
   * Handle the message sent from the popup window
   */
  private handleAuthMessage = async (event: MessageEvent) => {
    console.log("TwitterApiService: Received message:", event);
    
    if (event.data && event.data.type === "TWITTER_AUTH_SUCCESS") {
      console.log("TwitterApiService: Received successful auth callback:", event.data);
      
      try {
        // Get user profile data from Twitter API
        let twitterUsername = 'twitter_user'; // Default value
        
        try {
          // Try to get the actual username if possible
          const profileResponse = await supabase.functions.invoke('twitter-integration', {
            method: 'POST',
            body: { endpoint: 'profile' }
          });
          
          if (profileResponse.data && profileResponse.data.data && profileResponse.data.data.username) {
            twitterUsername = profileResponse.data.data.username;
            console.log("TwitterApiService: Retrieved Twitter username:", twitterUsername);
          }
        } catch (profileError) {
          console.warn("TwitterApiService: Could not retrieve Twitter username, using default");
        }
        
        // Store the connection in the database
        const { error } = await supabase
          .from('platform_connections')
          .upsert({
            user_id: this.userId,
            platform: 'twitter',
            connected: true,
            username: twitterUsername,
            access_token: event.data.data.token,
            refresh_token: event.data.data.verifier, // Store the verifier as refresh_token
            updated_at: new Date().toISOString()
          });
          
        if (error) {
          console.error("TwitterApiService: Error storing Twitter connection:", error);
          toast.error("Failed to store Twitter connection");
        } else {
          console.log("TwitterApiService: Successfully stored Twitter connection");
          
          // Forward the auth success message back to the opener
          window.opener?.postMessage({ type: "TWITTER_AUTH_SUCCESS", data: event.data.data }, "*");
          
          // Also post to current window in case opener doesn't exist
          window.postMessage({ type: "TWITTER_AUTH_SUCCESS", data: event.data.data }, "*");
          
          // Add a parameter to the URL to indicate we came from auth flow
          // This is cleaner than reloading the page and will help the Settings component
          // know that it should refresh the connections
          window.location.href = "/settings?auth=success";
        }
      } catch (error) {
        console.error("TwitterApiService: Error handling auth success:", error);
        toast.error("Failed to complete Twitter authentication");
      }
      
      // Remove the listener since we're done with it
      window.removeEventListener('message', this.handleAuthMessage);
    }
  };

  /**
   * Factory method to create and initialize a TwitterApiService
   */
  static async create(session: Session | null): Promise<TwitterApiService | null> {
    if (!session?.user) {
      console.log("TwitterApiService: No session available for service creation");
      return null;
    }
    
    try {
      console.log(`TwitterApiService: Creating service for user ID: ${session.user.id}`);
      const service = new TwitterApiService(session.user.id);
      await service.initialize();
      
      // Start collecting statistics periodically
      service.startPeriodicStatisticsUpdates();
      
      // Set up auth state change listener to handle sign out and clean up
      supabase.auth.onAuthStateChange((event, _session) => {
        if (event === 'SIGNED_OUT') {
          console.log("TwitterApiService: User signed out, stopping statistics updates");
          service.stopPeriodicStatisticsUpdates();
        } else if (event === 'SIGNED_IN') {
          console.log("TwitterApiService: User signed in, starting statistics updates");
          service.startPeriodicStatisticsUpdates();
        }
      });
      
      console.log("TwitterApiService: Service successfully created and initialized with statistics updates");
      return service;
    } catch (error) {
      console.error('TwitterApiService: Error creating service:', error);
      return null;
    }
  }

  /**
   * Verify if the service can be initialized with the given user ID
   */
  static async verifyServiceInitialization(userId: string): Promise<{ success: boolean; message: string }> {
    try {
      console.log(`TwitterApiService: Verifying initialization for userId: ${userId}`);
      const service = new TwitterApiService(userId);
      await service.initialize();
      console.log(`TwitterApiService: Verification successful for user: ${userId}`);
      
      return {
        success: true,
        message: `Twitter service successfully initialized with username: ${service.username}`
      };
    } catch (error) {
      console.error('TwitterApiService: Verification failed:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error initializing Twitter service'
      };
    }
  }
}

// Utility function to get an instance of the Twitter API service
export async function getTwitterApiService(session: Session | null): Promise<TwitterApiService | null> {
  if (!session?.user) {
    console.log("TwitterApiService: No session provided to getTwitterApiService");
    return null;
  }
  
  return TwitterApiService.create(session);
}
