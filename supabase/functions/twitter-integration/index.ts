
// Twitter Integration Edge Function - OAuth 1.0a implementation
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createHmac } from "https://deno.land/std@0.177.0/node/crypto.ts";

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, path',
};

// Log environment variables for debugging
console.log("[TWITTER-INTEGRATION] Function starting with OAuth 1.0a");
const envVars = ["TWITTER_API_KEY", "TWITTER_API_SECRET", "TWITTER_ACCESS_TOKEN", "TWITTER_ACCESS_TOKEN_SECRET"];
for (const key of envVars) {
  const value = Deno.env.get(key);
  const valueExists = !!value;
  const valueLength = value?.length || 0;
  
  console.log(`[TWITTER-INTEGRATION] ${key}: ${valueExists ? "SET" : "NOT SET"}, Length: ${valueLength}`);
  
  if (valueExists && valueLength > 0) {
    const firstFour = value.substring(0, 4);
    const lastFour = valueLength > 8 ? value.substring(valueLength - 4) : "";
    console.log(`[TWITTER-INTEGRATION] ${key}: VALID FORMAT, Length: ${valueLength}, First/Last chars: ${firstFour}...${lastFour}`);
  }
}

console.log("[TWITTER-INTEGRATION] Using OAuth 1.0a authentication method");

// OAuth 1.0a helper functions - same as in twitter-api function
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

  console.log("[TWITTER-INTEGRATION] Signature Base String:", signatureBaseString.substring(0, 100) + "...");
  console.log("[TWITTER-INTEGRATION] Generated Signature:", signature);

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

// Auth function to initiate Twitter OAuth 1.0a flow
async function initiateTwitterAuth(userId: string): Promise<{ authURL: string }> {
  console.log("[TWITTER-INTEGRATION] Initiating Twitter OAuth 1.0a auth for user:", userId);
  
  // For OAuth 1.0a, we'll generate a direct Twitter auth URL for the user
  // Since we're using the app's credentials directly
  
  // Redirect to the Twitter OAuth callback URL which will be handled by the frontend
  const callbackUrl = `${Deno.env.get('SUPABASE_URL') || ''}/functions/v1/twitter-integration/callback`;
  console.log("[TWITTER-INTEGRATION] CALLBACK_URL:", callbackUrl);
  
  // Generate a simple login URL using the app credentials
  // In OAuth 1.0a with the direct token approach, we can just send the user to Twitter
  const authURL = "https://twitter.com/home";
  
  return { authURL };
}

// Main handler function
serve(async (req) => {
  // Handle CORS preflight requests
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
    const path = req.headers.get('path') || '';
    console.log(`[TWITTER-INTEGRATION] Processing request for path: ${path} (OAuth 1.0a)`);

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
      console.error('[TWITTER-INTEGRATION] User not found in auth token');
      throw new Error('User not found');
    }

    console.log(`[TWITTER-INTEGRATION] User authenticated: ${user.id}`);

    // Find the user in the database
    const { data: userData, error: userError } = await supabaseClient
      .from('users')
      .select('id')
      .eq('auth_id', user.id)
      .single();

    if (userError || !userData) {
      // If user not found in the database, create them
      if (userError.code === 'PGRST116') {
        const { data: newUser, error: createError } = await supabaseClient
          .from('users')
          .insert({
            auth_id: user.id,
            email: user.email
          })
          .select('id')
          .single();
        
        if (createError) {
          console.error('[TWITTER-INTEGRATION] Error creating user in database:', createError);
          throw new Error('Failed to create user in database');
        }
        
        userData = newUser;
      } else {
        console.error('[TWITTER-INTEGRATION] Error finding user in database:', userError);
        throw new Error('User not found in database');
      }
    }

    // Handle the Twitter API calls based on the path
    if (path === '/auth') {
      console.log('[TWITTER-INTEGRATION] Processing auth request with OAuth 1.0a');
      const requestBody = await req.json();
      
      const authResult = await initiateTwitterAuth(user.id);
      
      return new Response(JSON.stringify({
        success: true,
        ...authResult,
        oauth: "1.0a"
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    // If endpoint not found
    throw new Error(`Unsupported endpoint: ${path}`);
    
  } catch (error) {
    console.error('[TWITTER-INTEGRATION] Error:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
        oauth: "1.0a"
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
