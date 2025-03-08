
// Instagram integration edge function
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Initialize the Supabase client with service role (needed for authenticated API calls)
const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const supabase = createClient(supabaseUrl, supabaseKey);

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
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

    // Debug: Log the redirect URI being used
    console.log("[INSTAGRAM-INTEGRATION] Using redirect URI:", INSTAGRAM_REDIRECT_URI);
    
    // Important: verify that this redirect URI matches exactly what's in your Meta Developer Portal
    console.log("[INSTAGRAM-INTEGRATION] Make sure this redirect URI is authorized in Meta Developer Portal");

    // Handle different actions
    switch (action) {
      case 'authorize':
        // Generate Instagram business authorization URL with expanded permissions
        const businessAuthUrl = `https://www.instagram.com/oauth/authorize?client_id=${INSTAGRAM_APP_ID}&redirect_uri=${encodeURIComponent(INSTAGRAM_REDIRECT_URI)}&scope=user_profile,user_media&response_type=code`;
        
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
        
        // In a real implementation, you would exchange the code for an access token
        // For now simulate a successful token exchange and store it securely
        
        // Store the connection in the database with a longer token expiry
        const { error: connectionError } = await supabase
          .from('platform_connections')
          .upsert({
            user_id: userId,
            platform: 'instagram',
            connected: true,
            username: 'instagram_business_user',
            last_verified: new Date().toISOString(),
            token_expires_at: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString() // 60 days
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
        const { data: connectionData, error: verifyError } = await supabase
          .from('platform_connections')
          .select('connected, last_verified, token_expires_at')
          .eq('user_id', userId)
          .eq('platform', 'instagram')
          .maybeSingle();

        if (verifyError) {
          console.error("[INSTAGRAM-INTEGRATION] Error fetching connection:", verifyError);
          throw verifyError;
        }

        // Check if connection exists and token hasn't expired
        let isVerified = false;
        let needsReauth = false;
        
        if (connectionData?.connected === true) {
          isVerified = true;
          
          // Check if token has expired or is about to expire (within 7 days)
          if (connectionData.token_expires_at) {
            const expiryDate = new Date(connectionData.token_expires_at);
            const sevenDaysFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
            
            if (expiryDate < new Date()) {
              isVerified = false;
              needsReauth = true;
            } else if (expiryDate < sevenDaysFromNow) {
              // Token is valid but will expire soon, flag for reauth
              needsReauth = true;
            }
          }
        }
        
        console.log(`[INSTAGRAM-INTEGRATION] Instagram connection verified: ${isVerified}, needs reauth: ${needsReauth}`);
        
        // Update last_verified timestamp if connection is valid
        if (isVerified) {
          const { error: updateError } = await supabase
            .from('platform_connections')
            .update({ last_verified: new Date().toISOString() })
            .eq('user_id', userId)
            .eq('platform', 'instagram');
            
          if (updateError) {
            console.error("[INSTAGRAM-INTEGRATION] Error updating last_verified:", updateError);
          }
        }
        
        return new Response(
          JSON.stringify({ 
            verified: isVerified,
            needsReauth: needsReauth
          }),
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

        // Update the connection in the database
        const { error: updateError } = await supabase
          .from('platform_connections')
          .upsert({
            user_id: userId,
            platform: 'instagram',
            connected: true,
            username: mockProfileData.username,
            profile_image: mockProfileData.profile_picture,
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
            message: "Post published successfully to Instagram", 
            id: `mock_${Date.now()}`
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );

      case 'setup_webhook':
        // In a real implementation, you would call the Instagram API to set up the webhook
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
