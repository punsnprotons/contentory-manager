
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { Database } from "../_shared/supabase.types.ts";

// Create Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const supabase = createClient<Database>(supabaseUrl, supabaseServiceKey);

// CORS headers for browser requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, path',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

// Twitter controller functions
const TwitterController = {
  // Refresh user data - reusing the implementation from twitter-refresh
  async refreshUserData(userId: string) {
    try {
      console.log(`Starting data refresh for user: ${userId}`);
      
      // Get user from database to verify it exists
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (userError || !userData) {
        throw new Error(`User not found: ${userError?.message}`);
      }
      
      // 1. Mock fetch profile data
      console.log('Fetching profile data...');
      // In a real implementation, this would call the Twitter API
      
      // 2. Update follower metrics
      const currentFollowers = Math.floor(Math.random() * 10000);
      const { error: followerError } = await supabase
        .from('follower_metrics')
        .insert({
          user_id: userId,
          platform: 'twitter',
          follower_count: currentFollowers,
          recorded_at: new Date().toISOString()
        });
      
      if (followerError) {
        console.error('Error updating follower metrics:', followerError);
      }
      
      // 3. Update engagement metrics
      const engagementRate = Math.random() * 5; // Random engagement rate between 0-5%
      const { error: engagementError } = await supabase
        .from('engagement_metrics')
        .insert({
          user_id: userId,
          platform: 'twitter',
          engagement_rate: engagementRate,
          recorded_at: new Date().toISOString()
        });
      
      if (engagementError) {
        console.error('Error updating engagement metrics:', engagementError);
      }
      
      // 4. Update daily engagement
      const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
      for (const day of days) {
        const engagementCount = Math.floor(Math.random() * 100);
        
        // Check if entry exists
        const { data: existingData } = await supabase
          .from('daily_engagement')
          .select('id')
          .eq('user_id', userId)
          .eq('platform', 'twitter')
          .eq('day_of_week', day)
          .maybeSingle();
        
        if (existingData) {
          // Update existing entry
          await supabase
            .from('daily_engagement')
            .update({ engagement_count: engagementCount })
            .eq('id', existingData.id);
        } else {
          // Create new entry
          await supabase
            .from('daily_engagement')
            .insert({
              user_id: userId,
              platform: 'twitter',
              day_of_week: day,
              engagement_count: engagementCount
            });
        }
      }
      
      // 5. Update platform statistics
      const periodStart = new Date();
      periodStart.setDate(periodStart.getDate() - 30);
      
      const { error: statsError } = await supabase
        .from('platform_statistics')
        .insert({
          user_id: userId,
          platform: 'twitter',
          period_start: periodStart.toISOString(),
          period_end: new Date().toISOString(),
          total_followers: currentFollowers,
          post_count: Math.floor(Math.random() * 50),
          engagement_rate: engagementRate,
          avg_reach_per_post: Math.floor(Math.random() * 500)
        });
      
      if (statsError) {
        console.error('Error updating platform statistics:', statsError);
      }
      
      // 6. Create notification
      const { error: notificationError } = await supabase
        .from('notifications')
        .insert({
          user_id: userId,
          type: 'info',
          message: 'Your Twitter data has been refreshed successfully.'
        });
      
      if (notificationError) {
        console.error('Error creating notification:', notificationError);
      }
      
      return {
        success: true,
        message: 'Twitter data refreshed successfully',
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      console.error('Error in refreshUserData:', error);
      
      // Create error notification
      await supabase
        .from('notifications')
        .insert({
          user_id: userId,
          type: 'error',
          message: `Failed to refresh Twitter data: ${error.message}`
        });
      
      throw error;
    }
  },
  
  // Post a new tweet
  async postTweet(userId: string, content: string, mediaUrl?: string) {
    try {
      console.log(`Posting tweet for user: ${userId}`);
      console.log(`Tweet content: ${content}`);
      if (mediaUrl) console.log(`Media URL: ${mediaUrl}`);
      
      // Get user from database to verify it exists
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('id', userId)
        .single();
      
      if (userError || !userData) {
        throw new Error(`User not found: ${userError?.message}`);
      }
      
      // Call the Twitter API through the existing twitter-integration function
      const { data, error } = await supabase.functions.invoke('twitter-integration', {
        body: { 
          endpoint: 'tweet',
          text: content 
        }
      });
      
      if (error) {
        console.error('Error posting tweet:', error);
        throw new Error(`Failed to post tweet: ${error.message}`);
      }
      
      // Store the tweet in the content table
      const { data: contentData, error: contentError } = await supabase
        .from('content')
        .insert({
          user_id: userId,
          platform: 'twitter',
          type: mediaUrl ? 'image' : 'text',
          intent: 'news',
          status: 'published',
          content: content,
          media_url: mediaUrl || null,
          published_at: new Date().toISOString()
        })
        .select('id')
        .single();
        
      if (contentError) {
        console.error('Error storing tweet in content table:', contentError);
      }
      
      // Record activity
      if (contentData) {
        const { error: activityError } = await supabase
          .from('activity_history')
          .insert({
            user_id: userId,
            content_id: contentData.id,
            platform: 'twitter',
            activity_type: 'post',
            activity_detail: { tweet_id: data?.data?.id || 'unknown' },
            occurred_at: new Date().toISOString()
          });
          
        if (activityError) {
          console.error('Error recording activity:', activityError);
        }
      }
      
      // Create notification
      const { error: notificationError } = await supabase
        .from('notifications')
        .insert({
          user_id: userId,
          type: 'success',
          message: 'Your tweet was posted successfully.',
          related_content_id: contentData?.id
        });
        
      if (notificationError) {
        console.error('Error creating notification:', notificationError);
      }
      
      return {
        success: true,
        message: 'Tweet posted successfully',
        data: data?.data,
        contentId: contentData?.id,
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      console.error('Error in postTweet:', error);
      
      // Create error notification
      await supabase
        .from('notifications')
        .insert({
          user_id: userId,
          type: 'error',
          message: `Failed to post tweet: ${error.message}`
        });
      
      throw error;
    }
  }
};

// User authentication check
async function authenticateRequest(req: Request) {
  try {
    // Extract the auth token from the Authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new Error('Missing or invalid authorization token');
    }
    
    const token = authHeader.split(' ')[1];
    
    // Verify the token and get the user
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      throw new Error('Invalid authorization token');
    }
    
    // Get the database ID for the user
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('auth_id', user.id)
      .single();
      
    if (userError || !userData) {
      throw new Error('User not found in database');
    }
    
    return userData.id;
  } catch (error) {
    console.error('Authentication error:', error);
    throw error;
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      status: 204, 
      headers: corsHeaders 
    });
  }
  
  try {
    // Parse the URL to determine the endpoint
    const url = new URL(req.url);
    const path = req.headers.get('path') || url.pathname;
    const endpoint = path.split('/').pop();
    
    console.log(`Request received for endpoint: ${endpoint}, method: ${req.method}, path: ${path}`);
    
    let userId = '';
    
    try {
      // Authenticate the request and get the user ID
      userId = await authenticateRequest(req);
      console.log(`Authenticated user ID: ${userId}`);
    } catch (authError) {
      console.error('Authentication failed:', authError.message);
      return new Response(
        JSON.stringify({ success: false, error: 'Authentication failed', message: authError.message }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Handle the refresh endpoint (GET /refresh)
    if (endpoint === 'refresh' && req.method === 'GET') {
      console.log('Processing refresh request');
      let result;
      try {
        result = await TwitterController.refreshUserData(userId);
      } catch (refreshError) {
        console.error('Error during refresh:', refreshError);
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: refreshError instanceof Error ? refreshError.message : 'Unknown error during refresh' 
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      console.log('Refresh completed successfully');
      return new Response(
        JSON.stringify({ success: true, data: result }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Handle the tweet endpoint (POST /tweet)
    if (endpoint === 'tweet' && req.method === 'POST') {
      // Parse the request body
      let body;
      try {
        body = await req.json();
        console.log('Received tweet request with body:', body);
      } catch (parseError) {
        console.error('Error parsing request body:', parseError);
        return new Response(
          JSON.stringify({ success: false, error: 'Invalid request body' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      const { content, mediaUrl } = body;
      
      if (!content) {
        console.error('Tweet request missing content');
        return new Response(
          JSON.stringify({ success: false, error: 'Tweet content is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      let result;
      try {
        result = await TwitterController.postTweet(userId, content, mediaUrl);
      } catch (tweetError) {
        console.error('Error posting tweet:', tweetError);
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: tweetError instanceof Error ? tweetError.message : 'Unknown error posting tweet'
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      console.log('Tweet posted successfully');
      return new Response(
        JSON.stringify({ success: true, data: result }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // If endpoint not found
    console.error(`Endpoint not found: ${endpoint}`);
    return new Response(
      JSON.stringify({ success: false, error: 'Endpoint not found' }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error('Server error:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'An unexpected error occurred'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
