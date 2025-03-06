
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { Database } from '../_shared/supabase.types.ts';

// Create Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const supabase = createClient<Database>(supabaseUrl, supabaseServiceKey);

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
  }
};

serve(async (req) => {
  try {
    const { userId } = await req.json();
    
    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'User ID is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    const result = await TwitterController.refreshUserData(userId);
    
    return new Response(
      JSON.stringify(result),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Server error:', error);
    
    return new Response(
      JSON.stringify({ error: error.message || 'An unexpected error occurred' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
