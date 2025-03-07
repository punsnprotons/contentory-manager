
// Update the Twitter API edge function to use OAuth 1.0a for simplicity
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createHmac } from "crypto";

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

// OAuth 1.0a helper functions
function generateOAuthSignature(
  method: string,
  url: string,
  params: Record<string, string>,
  consumerSecret: string,
  tokenSecret: string
): string {
  const signatureBaseString = `${method}&${encodeURIComponent(
    url
  )}&${encodeURIComponent(
    Object.entries(params)
      .sort()
      .map(([k, v]) => `${k}=${v}`)
      .join("&")
  )}`;
  const signingKey = `${encodeURIComponent(
    consumerSecret
  )}&${encodeURIComponent(tokenSecret)}`;
  
  const hmacSha1 = createHmac("sha1", signingKey);
  const signature = hmacSha1.update(signatureBaseString).digest("base64");

  console.log("[TWITTER-API] Signature Base String:", signatureBaseString.substring(0, 100) + "...");
  console.log("[TWITTER-API] Generated Signature:", signature);

  return signature;
}

function generateOAuthHeader(method: string, url: string, params: Record<string, string> = {}): string {
  const apiKey = Deno.env.get("TWITTER_API_KEY")?.trim();
  const apiSecret = Deno.env.get("TWITTER_API_SECRET")?.trim();
  const accessToken = Deno.env.get("TWITTER_ACCESS_TOKEN")?.trim();
  const accessTokenSecret = Deno.env.get("TWITTER_ACCESS_TOKEN_SECRET")?.trim();
  
  if (!apiKey || !apiSecret || !accessToken || !accessTokenSecret) {
    throw new Error("Missing required Twitter OAuth 1.0a credentials");
  }

  const oauthParams = {
    oauth_consumer_key: apiKey,
    oauth_nonce: Math.random().toString(36).substring(2),
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_token: accessToken,
    oauth_version: "1.0",
    ...params
  };

  const signature = generateOAuthSignature(
    method,
    url,
    oauthParams,
    apiSecret,
    accessTokenSecret
  );

  const signedOAuthParams = {
    ...oauthParams,
    oauth_signature: signature,
  };

  const entries = Object.entries(signedOAuthParams).sort((a, b) =>
    a[0].localeCompare(b[0])
  );

  return (
    "OAuth " +
    entries
      .map(([k, v]) => `${encodeURIComponent(k)}="${encodeURIComponent(v)}"`)
      .join(", ")
  );
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

    // Find the user in the database
    const { data: userData, error: userError } = await supabaseClient
      .from('users')
      .select('id')
      .eq('auth_id', user.id)
      .single();

    if (userError || !userData) {
      console.error('[TWITTER-API] Error finding user in database:', userError);
      throw new Error('User not found in database');
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

    // Call the twitter-integration function based on the path
    if (path === '/tweet') {
      // For tweet endpoint, use OAuth 1.0a directly
      const requestBody = await req.json();
      
      console.log('[TWITTER-API] Tweet content with OAuth 1.0a:', requestBody.content.substring(0, 50) + (requestBody.content.length > 50 ? '...' : ''));
      
      try {
        const baseUrl = "https://api.twitter.com/1.1/statuses/update.json";
        const method = "POST";
        
        // Create the URL with parameters embedded
        const tweetText = requestBody.content;
        const queryParams = new URLSearchParams({
          status: tweetText
        });
        const fullUrl = `${baseUrl}?${queryParams.toString()}`;
        
        // Generate OAuth header
        const oauthHeader = generateOAuthHeader(method, baseUrl, {
          status: tweetText
        });
        
        // Send the tweet
        const response = await fetch(fullUrl, {
          method: method,
          headers: {
            "Authorization": oauthHeader,
            "Content-Type": "application/x-www-form-urlencoded"
          }
        });
        
        const responseText = await response.text();
        
        if (!response.ok) {
          console.error('[TWITTER-API] Tweet posting error:', response.status, responseText);
          throw new Error(`Failed to post tweet: ${response.status} ${responseText}`);
        }
        
        const tweetData = JSON.parse(responseText);
        
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
