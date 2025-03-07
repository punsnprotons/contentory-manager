
// Update the Twitter API edge function to use OAuth 1.0a for simplicity
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createHmac } from "https://deno.land/std@0.177.0/node/crypto.ts";

// Enhanced debugging for environment variables
console.log("[TWITTER-API] Function starting with OAuth 1.0a");
console.log("[TWITTER-API] SUPABASE_URL present:", !!Deno.env.get('SUPABASE_URL'), "Length:", Deno.env.get('SUPABASE_URL')?.length || 0);
console.log("[TWITTER-API] SUPABASE_ANON_KEY present:", !!Deno.env.get('SUPABASE_ANON_KEY'), "Length:", Deno.env.get('SUPABASE_ANON_KEY')?.length || 0);

// Check if the Twitter API keys are properly set in the environment with more detail
console.log("[TWITTER-API] Checking Twitter API OAuth 1.0a keys:");
const twitterApiKeys = [
  "TWITTER_API_KEY", 
  "TWITTER_API_SECRET", 
  "TWITTER_ACCESS_TOKEN", 
  "TWITTER_ACCESS_TOKEN_SECRET"
];

// Log detailed information about the credentials for debugging
for (const key of twitterApiKeys) {
  const value = Deno.env.get(key);
  const valueExists = !!value;
  const valueLength = value?.length || 0;
  const valuePattern = valueExists 
    ? value.substring(0, 4) + "..." + (valueLength > 8 ? value.substring(valueLength - 4) : "") 
    : "not set";
  const containsSpaces = valueExists ? value.includes(" ") : false;
  const containsQuotes = valueExists ? value.includes('"') || value.includes("'") : false;
  
  console.log(`[TWITTER-API] ${key}: ${valueExists ? "SET" : "NOT SET"}, Length: ${valueLength}, Pattern: ${valuePattern}, Contains spaces: ${containsSpaces}, Contains quotes: ${containsQuotes}`);
  
  // Additional format validation for specific keys
  if (key === "TWITTER_API_KEY" && valueExists) {
    console.log(`[TWITTER-API] ${key} format valid:`, /^[a-zA-Z0-9]{20,}$/.test(value));
  } else if (key === "TWITTER_API_SECRET" && valueExists) {
    console.log(`[TWITTER-API] ${key} format valid:`, /^[a-zA-Z0-9_-]{35,}$/.test(value));
  }
}

// CORS headers for browser requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, path',
};

// OAuth 1.0a helper functions - COMPLETELY REVISED FOR CORRECT TWITTER V1.1 API USAGE
function generateOAuthSignature(
  method: string,
  url: string,
  oauthParams: Record<string, string>,
  postParams: Record<string, string> = {},
  consumerSecret: string,
  tokenSecret: string
): string {
  // CRITICAL FIX: Combine OAuth parameters with POST parameters for signature base string
  const allParams = { ...oauthParams, ...postParams };
  
  // Sort parameters alphabetically by key
  const sortedParams = Object.keys(allParams)
    .sort()
    .reduce<Record<string, string>>((acc, key) => {
      acc[key] = allParams[key];
      return acc;
    }, {});
  
  // Create parameter string
  const paramString = Object.entries(sortedParams)
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join("&");
  
  // Create signature base string
  const signatureBaseString = [
    method.toUpperCase(),
    encodeURIComponent(url),
    encodeURIComponent(paramString)
  ].join("&");
  
  // Create signing key
  const signingKey = `${encodeURIComponent(consumerSecret)}&${encodeURIComponent(tokenSecret)}`;
  
  // Generate signature
  const hmacSha1 = createHmac("sha1", signingKey);
  const signature = hmacSha1.update(signatureBaseString).digest("base64");
  
  console.log("[TWITTER-API] Signature Base String:", signatureBaseString);
  console.log("[TWITTER-API] Generated Signature:", signature);
  
  return signature;
}

function generateOAuthHeader(
  method: string,
  url: string,
  postParams: Record<string, string> = {}
): string {
  const apiKey = Deno.env.get("TWITTER_API_KEY")?.trim();
  const apiSecret = Deno.env.get("TWITTER_API_SECRET")?.trim();
  const accessToken = Deno.env.get("TWITTER_ACCESS_TOKEN")?.trim();
  const accessTokenSecret = Deno.env.get("TWITTER_ACCESS_TOKEN_SECRET")?.trim();
  
  if (!apiKey || !apiSecret || !accessToken || !accessTokenSecret) {
    throw new Error("Missing required Twitter OAuth 1.0a credentials");
  }

  const oauthParams: Record<string, string> = {
    oauth_consumer_key: apiKey,
    oauth_nonce: Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2),
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_token: accessToken,
    oauth_version: "1.0"
  };

  // Generate signature using both OAuth params and post params
  const signature = generateOAuthSignature(
    method,
    url,
    oauthParams,
    postParams,
    apiSecret,
    accessTokenSecret
  );

  // Add signature to OAuth params
  oauthParams.oauth_signature = signature;

  // Build OAuth header string - only include OAuth params in the header
  return "OAuth " + Object.entries(oauthParams)
    .map(([key, value]) => `${encodeURIComponent(key)}="${encodeURIComponent(value)}"`)
    .join(", ");
}

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing Authorization header');
    }

    // Get the path for the Twitter API call
    const path = req.headers.get('path');
    if (!path) {
      throw new Error('Missing path header');
    }

    console.log(`[TWITTER-API] Processing request for path: ${path} (OAuth 1.0a)`);

    // Create a Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    // Get the user ID from the JWT token
    const {
      data: { user },
    } = await supabaseClient.auth.getUser();

    if (!user) {
      console.error('[TWITTER-API] User not found in auth token');
      throw new Error('User not found');
    }

    console.log(`[TWITTER-API] User authenticated: ${user.id}`);

    // Find the user in the database - handle the case where user record doesn't exist
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
      // Create the user if they don't exist
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

    console.log(`[TWITTER-API] Publishing content with user: ${user.id} (OAuth 1.0a)`);

    // Handle the Twitter API calls based on the path
    if (path === '/rate-limit-status') {
      console.log('[TWITTER-API] Fetching rate limit status with OAuth 1.0a');
      
      try {
        const baseUrl = "https://api.twitter.com/1.1/application/rate_limit_status.json";
        const method = "GET";
        const oauthHeader = generateOAuthHeader(method, baseUrl);
        
        const response = await fetch(baseUrl, {
          method: method,
          headers: {
            "Authorization": oauthHeader,
            "Content-Type": "application/json",
          }
        });
        
        if (!response.ok) {
          const text = await response.text();
          throw new Error(`Failed to get rate limit status: ${response.status} ${text}`);
        }
        
        const data = await response.json();
        
        return new Response(JSON.stringify({
          rateLimits: data,
          success: true,
          oauth: "1.0a"
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      } catch (error) {
        console.error('[TWITTER-API] Error in rate limit status:', error);
        throw error;
      }
    }

    // Verify Twitter environment variables
    if (path === '/verify-credentials') {
      console.log('[TWITTER-API] Verifying Twitter OAuth 1.0a credentials');
      try {
        const baseUrl = "https://api.twitter.com/1.1/account/verify_credentials.json";
        const method = "GET";
        const oauthHeader = generateOAuthHeader(method, baseUrl);
        
        const response = await fetch(baseUrl, {
          method: method,
          headers: {
            "Authorization": oauthHeader,
            "Content-Type": "application/json",
          }
        });
        
        if (!response.ok) {
          const text = await response.text();
          throw new Error(`Failed to verify credentials: ${response.status} ${text}`);
        }
        
        const userData = await response.json();
        
        // Store connection info in the platform_connections table
        try {
          // Check if connection already exists
          const { data: existingConnection } = await supabaseClient
            .from('platform_connections')
            .select('id')
            .eq('user_id', user.id)
            .eq('platform', 'twitter')
            .single();
            
          // If not exists, create a new connection record
          if (!existingConnection) {
            await supabaseClient
              .from('platform_connections')
              .insert({
                user_id: user.id,
                platform: 'twitter',
                connected: true,
                username: userData.screen_name,
                last_verified: new Date().toISOString()
              });
          } else {
            // Update existing connection
            await supabaseClient
              .from('platform_connections')
              .update({
                connected: true,
                username: userData.screen_name,
                last_verified: new Date().toISOString()
              })
              .eq('id', existingConnection.id);
          }
        } catch (dbError) {
          console.error('[TWITTER-API] Error storing/updating connection:', dbError);
          // Continue even if we can't update the DB
        }
        
        return new Response(JSON.stringify({
          verified: true,
          user: userData,
          success: true,
          oauth: "1.0a"
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      } catch (error) {
        console.error('[TWITTER-API] Error verifying credentials:', error);
        return new Response(JSON.stringify({
          verified: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          oauth: "1.0a"
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Handle tweeting - fixed to use v1.1 API with correct URL and parameters
    if (path === '/tweet') {
      const requestBody = await req.json();
      
      console.log('[TWITTER-API] Tweet content with OAuth 1.0a:', requestBody.content.substring(0, 50) + (requestBody.content.length > 50 ? '...' : ''));
      
      try {
        // Correct Twitter v1.1 API endpoint for posting tweets
        const baseUrl = "https://api.twitter.com/1.1/statuses/update.json";
        const method = "POST";
        
        // Post parameters - only include status and not media for simplicity
        const postParams = {
          status: requestBody.content
        };
        
        // Generate OAuth header with the post parameters included for signature
        const oauthHeader = generateOAuthHeader(method, baseUrl, postParams);
        
        console.log('[TWITTER-API] Tweet content with OAuth 1.0a:', postParams.status.substring(0, 50) + '...');
        console.log('[TWITTER-API] OAuth Header:', oauthHeader);
        
        // Convert post parameters to URL-encoded form data string
        const formData = new URLSearchParams();
        for (const [key, value] of Object.entries(postParams)) {
          formData.append(key, value);
        }
        
        const response = await fetch(baseUrl, {
          method: method,
          headers: {
            "Authorization": oauthHeader,
            "Content-Type": "application/x-www-form-urlencoded"
          },
          body: formData.toString()
        });
        
        const responseText = await response.text();
        console.log('[TWITTER-API] Tweet response status:', response.status);
        console.log('[TWITTER-API] Tweet response body:', responseText.substring(0, 500));
        
        if (!response.ok) {
          console.error('[TWITTER-API] Tweet posting error:', response.status, responseText);
          throw new Error(`Failed to post tweet: ${response.status} ${responseText}`);
        }
        
        let tweetData;
        try {
          tweetData = JSON.parse(responseText);
        } catch (e) {
          console.error('[TWITTER-API] Error parsing tweet response:', e);
          throw new Error(`Failed to parse tweet response: ${responseText}`);
        }
        
        // Store successful tweet in database
        try {
          await supabaseClient
            .from('social_posts')
            .insert({
              user_id: user.id,
              platform: 'twitter',
              content: requestBody.content,
              external_id: tweetData.id_str,
              posted_at: new Date().toISOString()
            });
        } catch (dbError) {
          console.error('[TWITTER-API] Error storing tweet in database:', dbError);
          // Continue even if we can't update the DB
        }
        
        return new Response(JSON.stringify({
          success: true,
          tweet: tweetData,
          oauth: "1.0a"
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      } catch (error) {
        console.error('[TWITTER-API] Error posting tweet:', error);
        return new Response(JSON.stringify({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          oauth: "1.0a"
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    } else if (path === '/refresh') {
      // For refresh endpoint, call the twitter-refresh function
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
        console.error('[TWITTER-API] Error calling twitter-refresh function with OAuth 1.0a:', error);
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
    
    // Check for specific error messages that indicate permission issues
    let errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    let statusCode = 500;
    let instructions = undefined;
    
    // Provide more specific error messages and instructions
    if (errorMessage.includes('Forbidden') || errorMessage.includes('403') || errorMessage.includes('permission')) {
      statusCode = 403;
      errorMessage = 'Twitter API permission error: Your Twitter app doesn\'t have write permissions. You need to ensure "Read and write" permissions are enabled.';
      instructions = "Make sure you've enabled 'Read and write' permissions in the 'User authentication settings' section of your Twitter Developer Portal.";
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
