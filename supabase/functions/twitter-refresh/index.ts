
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { Database } from '../_shared/supabase.types.ts';

// Create Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const supabase = createClient<Database>(supabaseUrl, supabaseServiceKey);

// CORS headers for browser requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Mock TwitterController functionality since we can't directly import it
const TwitterController = {
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
        console.error("User not found error:", userError);
        throw new Error(`User not found: ${userError?.message || 'User ID does not exist'}`);
      }
      
      console.log("Found user in database:", userData);
      
      // 1. Mock fetch profile data
      console.log('Fetching profile data...');
      // In a real implementation, this would call the Twitter API
      
      // 2. Update follower metrics
      const currentFollowers = Math.floor(Math.random() * 10000);
      
      // Check for existing metrics for today to avoid duplicates
      const today = new Date().toISOString().split('T')[0];
      const { data: existingMetrics, error: metricsCheckError } = await supabase
        .from('follower_metrics')
        .select('id')
        .eq('user_id', userId)
        .eq('platform', 'twitter')
        .eq('recorded_at', today)
        .maybeSingle();
        
      if (metricsCheckError) {
        console.error("Error checking existing metrics:", metricsCheckError);
      }
      
      if (existingMetrics) {
        // Update existing metrics
        const { error: updateError } = await supabase
          .from('follower_metrics')
          .update({ follower_count: currentFollowers })
          .eq('id', existingMetrics.id);
          
        if (updateError) {
          console.error('Error updating follower metrics:', updateError);
        } else {
          console.log('Updated existing follower metrics for today');
        }
      } else {
        // Insert new metrics
        const { error: followerError } = await supabase
          .from('follower_metrics')
          .insert({
            user_id: userId,
            platform: 'twitter',
            follower_count: currentFollowers,
            recorded_at: today
          });
        
        if (followerError) {
          console.error('Error updating follower metrics:', followerError);
        } else {
          console.log('Inserted new follower metrics for today');
        }
      }
      
      // 3. Update engagement metrics - check for duplicates first
      const engagementRate = Math.random() * 5; // Random engagement rate between 0-5%
      
      const { data: existingEngagement, error: engagementCheckError } = await supabase
        .from('engagement_metrics')
        .select('id')
        .eq('user_id', userId)
        .eq('platform', 'twitter')
        .eq('recorded_at', today)
        .maybeSingle();
        
      if (engagementCheckError) {
        console.error("Error checking existing engagement metrics:", engagementCheckError);
      }
      
      if (existingEngagement) {
        // Update existing metrics
        const { error: updateError } = await supabase
          .from('engagement_metrics')
          .update({ engagement_rate: engagementRate })
          .eq('id', existingEngagement.id);
          
        if (updateError) {
          console.error('Error updating engagement metrics:', updateError);
        } else {
          console.log('Updated existing engagement metrics for today');
        }
      } else {
        // Insert new metrics
        const { error: engagementError } = await supabase
          .from('engagement_metrics')
          .insert({
            user_id: userId,
            platform: 'twitter',
            engagement_rate: engagementRate,
            recorded_at: today
          });
        
        if (engagementError) {
          console.error('Error updating engagement metrics:', engagementError);
        } else {
          console.log('Inserted new engagement metrics for today');
        }
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
          const { error: updateError } = await supabase
            .from('daily_engagement')
            .update({ engagement_count: engagementCount })
            .eq('id', existingData.id);
            
          if (updateError) {
            console.error(`Error updating daily engagement for ${day}:`, updateError);
          }
        } else {
          // Create new entry
          const { error: insertError } = await supabase
            .from('daily_engagement')
            .insert({
              user_id: userId,
              platform: 'twitter',
              day_of_week: day,
              engagement_count: engagementCount
            });
            
          if (insertError) {
            console.error(`Error inserting daily engagement for ${day}:`, insertError);
          }
        }
      }
      
      // 5. Update platform statistics - check for existing records first
      const periodStart = new Date();
      periodStart.setDate(periodStart.getDate() - 30);
      const periodStartStr = periodStart.toISOString().split('T')[0];
      const periodEndStr = new Date().toISOString().split('T')[0];
      
      // Check for existing stats record
      const { data: existingStats, error: statsCheckError } = await supabase
        .from('platform_statistics')
        .select('id')
        .eq('user_id', userId)
        .eq('platform', 'twitter')
        .eq('period_start', periodStartStr)
        .eq('period_end', periodEndStr)
        .maybeSingle();
        
      if (statsCheckError) {
        console.error("Error checking existing platform statistics:", statsCheckError);
      }
      
      if (existingStats) {
        // Update existing stats
        const { error: updateError } = await supabase
          .from('platform_statistics')
          .update({
            total_followers: currentFollowers,
            post_count: Math.floor(Math.random() * 50),
            engagement_rate: engagementRate,
            avg_reach_per_post: Math.floor(Math.random() * 500)
          })
          .eq('id', existingStats.id);
          
        if (updateError) {
          console.error('Error updating platform statistics:', updateError);
        } else {
          console.log('Updated existing platform statistics');
        }
      } else {
        try {
          // Create new stats record
          const { error: statsError } = await supabase
            .from('platform_statistics')
            .insert({
              user_id: userId,
              platform: 'twitter',
              period_start: periodStartStr,
              period_end: periodEndStr,
              total_followers: currentFollowers,
              post_count: Math.floor(Math.random() * 50),
              engagement_rate: engagementRate,
              avg_reach_per_post: Math.floor(Math.random() * 500)
            });
          
          if (statsError) {
            console.error('Error updating platform statistics:', statsError);
          } else {
            console.log('Inserted new platform statistics');
          }
        } catch (error) {
          console.error('Exception when inserting platform statistics:', error);
        }
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
      
      // Create error notification - only if the user exists
      try {
        const { data: userExists } = await supabase
          .from('users')
          .select('id')
          .eq('id', userId)
          .maybeSingle();
          
        if (userExists) {
          await supabase
            .from('notifications')
            .insert({
              user_id: userId,
              type: 'error',
              message: `Failed to refresh Twitter data: ${error instanceof Error ? error.message : 'Unknown error'}`
            });
        }
      } catch (notificationError) {
        console.error('Error creating error notification:', notificationError);
      }
      
      throw error;
    }
  }
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      status: 204, 
      headers: corsHeaders 
    });
  }
  
  try {
    // Parse JSON request body safely with error handling
    let userId;
    try {
      const body = await req.text();
      const parsed = body ? JSON.parse(body) : {};
      userId = parsed.userId;
      
      console.log("Received refresh request for userId:", userId);
    } catch (error) {
      console.error('Error parsing request body:', error);
      return new Response(
        JSON.stringify({ error: 'Invalid request body format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'User ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // First, validate that the user exists in the users table
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('id', userId)
      .maybeSingle();
      
    if (userError) {
      console.error("Database error when checking user:", userError);
      return new Response(
        JSON.stringify({ error: `Database error: ${userError.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    if (!userData) {
      console.error(`User with ID ${userId} not found in database`);
      return new Response(
        JSON.stringify({ error: `User with ID ${userId} not found in database` }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const result = await TwitterController.refreshUserData(userId);
    
    return new Response(
      JSON.stringify(result),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Server error:', error);
    
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'An unexpected error occurred' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
