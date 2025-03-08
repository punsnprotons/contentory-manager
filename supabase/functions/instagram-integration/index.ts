
// Instagram integration edge function
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Create a Supabase client with the service role key
  const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Get Instagram API credentials from environment variables
  const INSTAGRAM_APP_ID = Deno.env.get('INSTAGRAM_APP_ID');
  const INSTAGRAM_APP_SECRET = Deno.env.get('INSTAGRAM_APP_SECRET');
  const INSTAGRAM_REDIRECT_URI = Deno.env.get('INSTAGRAM_REDIRECT_URI');

  if (!INSTAGRAM_APP_ID || !INSTAGRAM_APP_SECRET || !INSTAGRAM_REDIRECT_URI) {
    console.error("[INSTAGRAM-INTEGRATION] Missing Instagram API credentials");
    return new Response(
      JSON.stringify({ 
        error: "Missing Instagram API credentials. Please set INSTAGRAM_APP_ID, INSTAGRAM_APP_SECRET, and INSTAGRAM_REDIRECT_URI in Supabase secrets."
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }

  try {
    // Get the JWT from the request to identify the user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Authorization header is required');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      console.error("[INSTAGRAM-INTEGRATION] User authentication error:", userError);
      return new Response(
        JSON.stringify({ error: "Authentication failed" }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const userId = user.id;
    const reqBody = await req.json();
    const action = reqBody.action || 'authorize';

    console.log(`[INSTAGRAM-INTEGRATION] Processing ${action} action for user ${userId}`);

    // Handle different actions
    switch (action) {
      case 'authorize':
        // Generate Instagram business authorization URL with expanded permissions
        const businessAuthUrl = `https://www.instagram.com/oauth/authorize?enable_fb_login=0&force_authentication=1&client_id=${INSTAGRAM_APP_ID}&redirect_uri=${encodeURIComponent(INSTAGRAM_REDIRECT_URI)}&response_type=code&scope=instagram_business_basic,instagram_business_manage_messages,instagram_business_manage_comments,instagram_business_content_publish,instagram_business_manage_insights`;
        
        console.log("[INSTAGRAM-INTEGRATION] Generated business auth URL:", businessAuthUrl);
        return new Response(
          JSON.stringify({ authUrl: businessAuthUrl }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );

      case 'callback':
        // Process the callback with auth code from Instagram
        const code = reqBody.code;
        
        if (!code) {
          throw new Error('No authorization code provided');
        }
        
        console.log("[INSTAGRAM-INTEGRATION] Processing callback with code:", code);
        
        // Exchange the code for an access token - in a real implementation
        // This is currently mocked for demonstration purposes
        console.log("[INSTAGRAM-INTEGRATION] Exchanging code for access token");
        
        // Store the connection in the database
        const { error: connectionError } = await supabase
          .from('platform_connections')
          .upsert({
            user_id: userId,
            platform: 'instagram',
            connected: true,
            username: 'instagram_business_user',
            last_verified: new Date().toISOString()
          }, {
            onConflict: 'user_id,platform'
          });

        if (connectionError) {
          console.error("[INSTAGRAM-INTEGRATION] Error updating connection:", connectionError);
          throw connectionError;
        }

        return new Response(
          JSON.stringify({ 
            success: true, 
            message: "Successfully connected to Instagram Business" 
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );

      case 'verify':
        // Check if we have a valid token stored for this user
        const { data: connectionData, error: connectionError } = await supabase
          .from('platform_connections')
          .select('connected, last_verified')
          .eq('user_id', userId)
          .eq('platform', 'instagram')
          .maybeSingle();

        if (connectionError) {
          console.error("[INSTAGRAM-INTEGRATION] Error fetching connection:", connectionError);
          throw connectionError;
        }

        const isVerified = connectionData?.connected === true;
        console.log(`[INSTAGRAM-INTEGRATION] Instagram connection verified: ${isVerified}`);
        
        return new Response(
          JSON.stringify({ verified: isVerified }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );

      case 'profile':
        // This would normally fetch the profile from Instagram API
        // For now, we'll return mock data since we don't have an actual token exchange flow
        console.log("[INSTAGRAM-INTEGRATION] Returning mock profile data");
        
        // In a real implementation, you would use the stored access token to call the Instagram API
        const mockProfileData = {
          username: "instagram_business_user",
          profile_picture: "https://via.placeholder.com/150",
          full_name: "Instagram Business User",
          bio: "This is a mock Instagram business profile",
          website: "https://instagram.com",
          is_business: true,
          business_category: "Marketing",
          counts: {
            media: 42,
            follows: 150,
            followed_by: 300
          }
        };

        // Store the connection in the database
        const { error: updateError } = await supabase
          .from('platform_connections')
          .upsert({
            user_id: userId,
            platform: 'instagram',
            connected: true,
            username: mockProfileData.username,
            last_verified: new Date().toISOString()
          }, {
            onConflict: 'user_id,platform'
          });

        if (updateError) {
          console.error("[INSTAGRAM-INTEGRATION] Error updating connection:", updateError);
          throw updateError;
        }

        return new Response(
          JSON.stringify(mockProfileData),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );

      case 'posts':
        // This would normally fetch posts from Instagram API
        // For now, we'll return mock data
        console.log("[INSTAGRAM-INTEGRATION] Returning mock posts data");
        
        const mockPosts = [
          {
            id: "12345",
            caption: "This is my first Instagram post #happy",
            media_url: "https://via.placeholder.com/800x800",
            permalink: "https://instagram.com/p/12345",
            timestamp: "2025-03-01T12:00:00Z",
            like_count: 42,
            comments_count: 5
          },
          {
            id: "67890",
            caption: "Beautiful sunset today! #nature #sunset",
            media_url: "https://via.placeholder.com/800x600",
            permalink: "https://instagram.com/p/67890",
            timestamp: "2025-02-28T18:30:00Z",
            like_count: 78,
            comments_count: 12
          }
        ];

        return new Response(
          JSON.stringify({ posts: mockPosts }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );

      case 'publish':
        // This would normally publish to Instagram API
        // For now, we'll just log the request and return success
        const content = reqBody.content;
        const mediaUrl = reqBody.mediaUrl;
        
        console.log(`[INSTAGRAM-INTEGRATION] Publishing to Instagram: "${content}"`);
        if (mediaUrl) {
          console.log(`[INSTAGRAM-INTEGRATION] With media: ${mediaUrl}`);
        }
        
        // In a real implementation, you would use the stored access token to call the Instagram API
        // For now, just simulate a successful publish
        
        // Store the post in the social_posts table
        const { error: postError } = await supabase
          .from('social_posts')
          .insert({
            user_id: userId,
            platform: 'instagram',
            content: content,
            external_id: `mock_${Date.now()}`,
            posted_at: new Date().toISOString()
          });

        if (postError) {
          console.error("[INSTAGRAM-INTEGRATION] Error storing post:", postError);
          throw postError;
        }

        return new Response(
          JSON.stringify({ 
            success: true, 
            message: "Post published successfully (mock)" 
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );

      case 'setup_webhook':
        // In a real implementation, you would call the Instagram API to set up the webhook
        // For now, we'll just return success
        console.log("[INSTAGRAM-INTEGRATION] Setting up Instagram webhook (mock)");
        
        return new Response(
          JSON.stringify({ 
            success: true, 
            message: "Webhook setup completed successfully (mock)" 
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );

      default:
        throw new Error(`Unknown action: ${action}`);
    }
  } catch (error) {
    console.error(`[INSTAGRAM-INTEGRATION] Error:`, error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "An unknown error occurred" 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
