
// Update the Twitter API edge function to use OAuth 1.0a for simplicity
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createHmac } from "https://deno.land/std@0.177.0/node/crypto.ts";

// Enhanced debugging for environment variables
console.log("[TWITTER-API] Function starting with OAuth 1.0a");
console.log("[TWITTER-API] SUPABASE_URL present:", !!Deno.env.get('SUPABASE_URL'), "Length:", Deno.env.get('SUPABASE_URL')?.length || 0);
console.log("[TWITTER-API] SUPABASE_ANON_KEY present:", !!Deno.env.get('SUPABASE_ANON_KEY'), "Length:", Deno.env.get('SUPABASE_ANON_KEY')?.length || 0);

// Log detailed information about API keys without exposing sensitive data
const logKeyStatus = (key: string, value?: string) => {
  console.log(`[TWITTER-API] ${key}: ${value ? "SET" : "NOT SET"}, Length: ${value?.length || 0}`);
  if (value) {
    const firstChars = value.substring(0, 4);
    const lastChars = value.length > 8 ? value.substring(value.length - 4) : "";
    console.log(`[TWITTER-API] ${key} pattern: ${firstChars}...${lastChars}`);
    console.log(`[TWITTER-API] ${key} contains spaces: ${value.includes(" ")}`);
    console.log(`[TWITTER-API] ${key} contains quotes: ${value.includes('"') || value.includes("'")}`);
  }
};

const twitterKeys = [
  "TWITTER_API_KEY", 
  "TWITTER_API_SECRET", 
  "TWITTER_ACCESS_TOKEN", 
  "TWITTER_ACCESS_TOKEN_SECRET"
];

for (const key of twitterKeys) {
  logKeyStatus(key, Deno.env.get(key)?.trim());
}

// CORS headers for browser requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, path',
};

// COMPLETELY REWRITTEN OAUTH 1.0A IMPLEMENTATION FOR TWITTER API
function generateOAuthSignature(
  method: string,
  baseUrl: string,
  params: Record<string, string>,
  consumerSecret: string,
  tokenSecret: string
): string {
  // Create parameter string - this MUST include ALL params for the signature
  const paramString = Object.keys(params)
    .sort()
    .map(key => {
      return `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`;
    })
    .join("&");
  
  // Create the signature base string
  const signatureBaseString = [
    method.toUpperCase(),
    encodeURIComponent(baseUrl),
    encodeURIComponent(paramString)
  ].join("&");
  
  // Create the signing key
  const signingKey = `${encodeURIComponent(consumerSecret)}&${encodeURIComponent(tokenSecret)}`;
  
  // Generate HMAC-SHA1 signature
  const hmac = createHmac("sha1", signingKey);
  hmac.update(signatureBaseString);
  const signature = hmac.digest("base64");
  
  console.log("[TWITTER-API] Signature Base String:", signatureBaseString);
  console.log("[TWITTER-API] Signing Key:", signingKey);
  console.log("[TWITTER-API] Generated Signature:", signature);
  
  return signature;
}

function generateOAuthAuthorizationHeader(
  method: string,
  url: string,
  status?: string
): string {
  // Get credentials from environment variables
  const apiKey = Deno.env.get("TWITTER_API_KEY")?.trim() || "";
  const apiSecret = Deno.env.get("TWITTER_API_SECRET")?.trim() || "";
  const accessToken = Deno.env.get("TWITTER_ACCESS_TOKEN")?.trim() || "";
  const accessTokenSecret = Deno.env.get("TWITTER_ACCESS_TOKEN_SECRET")?.trim() || "";

  if (!apiKey || !apiSecret || !accessToken || !accessTokenSecret) {
    throw new Error("Missing Twitter API credentials");
  }

  // OAuth parameters
  const oauthParams: Record<string, string> = {
    oauth_consumer_key: apiKey,
    oauth_nonce: Math.random().toString(36).substring(2) + Date.now().toString(),
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_token: accessToken,
    oauth_version: "1.0"
  };

  // Add status parameter if for a tweet POST
  const params = { ...oauthParams };
  if (status && method.toUpperCase() === "POST") {
    params.status = status;
  }

  // Generate signature
  const signature = generateOAuthSignature(
    method,
    url,
    params,
    apiSecret,
    accessTokenSecret
  );

  // Add signature to oauth params (NOT to params used for signature generation)
  oauthParams.oauth_signature = signature;

  // Format authorization header
  return "OAuth " + Object.keys(oauthParams)
    .sort()
    .map(key => {
      return `${encodeURIComponent(key)}="${encodeURIComponent(oauthParams[key])}"`;
    })
    .join(", ");
}

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get authorization header from request
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing Authorization header');
    }

    // Get the Twitter API endpoint path from request header
    const path = req.headers.get('path');
    if (!path) {
      throw new Error('Missing path header');
    }

    console.log(`[TWITTER-API] Processing request for path: ${path}`);

    // Create Supabase client with user's auth token
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    // Authenticate the user
    const {
      data: { user },
    } = await supabaseClient.auth.getUser();

    if (!user) {
      console.error('[TWITTER-API] User not found in auth token');
      throw new Error('User not found');
    }

    console.log(`[TWITTER-API] User authenticated: ${user.id}`);

    // Find or create user in database
    let userData;
    const { data: existingUser, error: userError } = await supabaseClient
      .from('users')
      .select('id')
      .eq('auth_id', user.id)
      .maybeSingle();

    if (userError && userError.code !== 'PGRST116') {
      console.error('[TWITTER-API] Error finding user in database:', userError);
      throw new Error('Error querying user in database');
    }

    if (!existingUser) {
      // Create user if not found
      console.log(`[TWITTER-API] User ${user.id} not found in database, creating new record`);
      const { data: newUser, error: insertError } = await supabaseClient
        .from('users')
        .insert({
          auth_id: user.id,
          email: user.email
        })
        .select('id')
        .single();

      if (insertError || !newUser) {
        console.error('[TWITTER-API] Error creating user in database:', insertError);
        throw new Error('Failed to create user record');
      }
      
      userData = newUser;
      console.log(`[TWITTER-API] Created new user record with ID: ${userData.id}`);
    } else {
      userData = existingUser;
      console.log(`[TWITTER-API] Found existing user record with ID: ${userData.id}`);
    }

    // Handle different Twitter API endpoints
    if (path === '/verify-credentials') {
      console.log('[TWITTER-API] Verifying Twitter credentials');
      
      const baseUrl = "https://api.twitter.com/1.1/account/verify_credentials.json";
      const method = "GET";
      const oauthHeader = generateOAuthAuthorizationHeader(method, baseUrl);
      
      console.log('[TWITTER-API] OAuth Header for verify:', oauthHeader);
      
      const response = await fetch(baseUrl, {
        method: method,
        headers: {
          "Authorization": oauthHeader
        }
      });
      
      console.log('[TWITTER-API] Verify response status:', response.status);
      const responseText = await response.text();
      console.log('[TWITTER-API] Verify response body:', responseText.substring(0, 500));
      
      if (!response.ok) {
        throw new Error(`Failed to verify credentials: ${response.status} ${responseText}`);
      }
      
      const userData = JSON.parse(responseText);
      
      // Update connection record in database
      try {
        const { data: existingConnection } = await supabaseClient
          .from('platform_connections')
          .select('id')
          .eq('user_id', user.id)
          .eq('platform', 'twitter')
          .single();
          
        if (existingConnection) {
          await supabaseClient
            .from('platform_connections')
            .update({
              connected: true,
              username: userData.screen_name,
              profile_image: userData.profile_image_url_https,
              last_verified: new Date().toISOString()
            })
            .eq('id', existingConnection.id);
        } else {
          await supabaseClient
            .from('platform_connections')
            .insert({
              user_id: user.id,
              platform: 'twitter',
              connected: true,
              username: userData.screen_name,
              profile_image: userData.profile_image_url_https,
              last_verified: new Date().toISOString()
            });
        }
      } catch (dbError) {
        console.error('[TWITTER-API] Error storing/updating connection:', dbError);
        // Continue even if database update fails
      }
      
      return new Response(JSON.stringify({
        verified: true,
        user: userData,
        success: true,
        oauth: "1.0a"
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } else if (path === '/tweet') {
      // Get tweet content from request body
      const requestBody = await req.json();
      const tweetContent = requestBody.content;
      
      if (!tweetContent) {
        throw new Error('Missing tweet content');
      }
      
      console.log('[TWITTER-API] Posting tweet:', tweetContent.substring(0, 50) + '...');
      
      // API endpoint for posting a tweet
      const baseUrl = "https://api.twitter.com/1.1/statuses/update.json";
      
      // Generate the OAuth header WITH the status parameter included in signature
      const oauthHeader = generateOAuthAuthorizationHeader("POST", baseUrl, tweetContent);
      console.log('[TWITTER-API] OAuth Header for tweet:', oauthHeader);
      
      // Create the form data for the POST request
      const formData = new URLSearchParams();
      formData.append("status", tweetContent);
      const formDataString = formData.toString();
      console.log('[TWITTER-API] Form data:', formDataString);
      
      // Make the request to post the tweet
      const response = await fetch(baseUrl, {
        method: "POST",
        headers: {
          "Authorization": oauthHeader,
          "Content-Type": "application/x-www-form-urlencoded"
        },
        body: formDataString
      });
      
      console.log('[TWITTER-API] Tweet response status:', response.status);
      const responseText = await response.text();
      console.log('[TWITTER-API] Tweet response body:', responseText);
      
      if (!response.ok) {
        console.error('[TWITTER-API] Tweet posting error:', response.status, responseText);
        throw new Error(`Failed to post tweet: ${response.status} ${responseText}`);
      }
      
      const tweetData = JSON.parse(responseText);
      
      // Record successful tweet in database
      try {
        await supabaseClient.from('social_posts').insert({
          user_id: user.id,
          platform: 'twitter',
          content: tweetContent,
          external_id: tweetData.id_str,
          posted_at: new Date().toISOString()
        });
      } catch (dbError) {
        console.error('[TWITTER-API] Error storing tweet in database:', dbError);
        // Continue even if database update fails
      }
      
      return new Response(JSON.stringify({
        success: true,
        tweet: tweetData,
        oauth: "1.0a"
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } else if (path === '/rate-limit-status') {
      console.log('[TWITTER-API] Fetching rate limit status');
      
      const baseUrl = "https://api.twitter.com/1.1/application/rate_limit_status.json";
      const method = "GET";
      const oauthHeader = generateOAuthAuthorizationHeader(method, baseUrl);
      
      const response = await fetch(baseUrl, {
        method: method,
        headers: {
          "Authorization": oauthHeader
        }
      });
      
      const responseText = await response.text();
      console.log('[TWITTER-API] Rate limit response status:', response.status);
      
      if (!response.ok) {
        throw new Error(`Failed to get rate limit status: ${response.status} ${responseText}`);
      }
      
      const responseData = JSON.parse(responseText);
      
      return new Response(JSON.stringify({
        rateLimits: responseData,
        success: true,
        oauth: "1.0a"
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } else if (path === '/refresh') {
      // Call twitter-refresh edge function for data refresh
      const { data, error } = await supabaseClient.functions.invoke(
        'twitter-refresh',
        {
          method: 'POST',
          body: { 
            userId: userData.id
          }
        }
      );

      if (error) {
        console.error('[TWITTER-API] Error calling twitter-refresh function:', error);
        throw new Error(`Failed to refresh Twitter data: ${error.message}`);
      }

      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } else {
      throw new Error(`Unknown path: ${path}`);
    }
  } catch (error) {
    console.error('[TWITTER-API] Error:', error);
    
    // Provide specific error messages for common issues
    let errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    let statusCode = 500;
    let instructions = undefined;
    
    if (errorMessage.includes('Forbidden') || errorMessage.includes('403') || errorMessage.includes('permission')) {
      statusCode = 403;
      errorMessage = 'Twitter API permission error: Your Twitter app lacks write permissions. Ensure "Read and write" permissions are enabled.';
      instructions = "Go to your Twitter Developer Portal, select your app, and enable 'Read and write' permissions in the 'User authentication settings' section. After changing permissions, regenerate your access tokens.";
    } else if (errorMessage.includes('Could not authenticate you') || errorMessage.includes('32')) {
      statusCode = 401;
      errorMessage = 'Twitter API authentication error: Invalid credentials or incorrect API token format.';
      instructions = "Check your Twitter API credentials in Supabase edge function secrets. Make sure there are no extra spaces, quotes, or special characters. Regenerate your Twitter access tokens in the Twitter Developer Portal.";
    }
    
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
        instructions,
        status: statusCode,
        timestamp: new Date().toISOString(),
        oauth: "1.0a"
      }),
      {
        status: statusCode,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
