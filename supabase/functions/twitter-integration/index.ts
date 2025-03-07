
// Twitter Integration Edge Function - OAuth 1.0a implementation
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createHmac } from "https://deno.land/std@0.177.0/node/crypto.ts";
import { Database } from "../_shared/supabase.types.ts";

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

// OAuth 1.0a helper functions - REVISED FOR CORRECTNESS
function generateOAuthSignature(
  method: string,
  url: string,
  oauthParams: Record<string, string>,
  postParams: Record<string, string> = {},
  consumerSecret: string,
  tokenSecret: string
): string {
  // Combine OAuth parameters with post parameters for signature generation
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
  
  console.log("[TWITTER-INTEGRATION] Signature Base String:", signatureBaseString.substring(0, 100) + "...");
  console.log("[TWITTER-INTEGRATION] Generated Signature:", signature);
  
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

// Auth function to verify Twitter OAuth 1.0a credentials
async function verifyTwitterCredentials(): Promise<{ verified: boolean, user?: any }> {
  console.log("[TWITTER-INTEGRATION] Verifying Twitter OAuth 1.0a credentials");
  
  try {
    const baseUrl = "https://api.twitter.com/1.1/account/verify_credentials.json";
    const method = "GET";
    const oauthHeader = generateOAuthHeader(method, baseUrl);
    
    console.log("[TWITTER-INTEGRATION] Verify credentials OAuth header:", oauthHeader);
    
    const response = await fetch(baseUrl, {
      method: method,
      headers: {
        "Authorization": oauthHeader,
        "Content-Type": "application/json",
      }
    });
    
    if (!response.ok) {
      const text = await response.text();
      console.error(`[TWITTER-INTEGRATION] Failed to verify credentials: ${response.status} ${text}`);
      return { verified: false };
    }
    
    const userData = await response.json();
    console.log("[TWITTER-INTEGRATION] OAuth 1.0a credentials verified successfully");
    
    return {
      verified: true,
      user: userData
    };
  } catch (error) {
    console.error('[TWITTER-INTEGRATION] Error verifying credentials:', error);
    return { verified: false };
  }
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
    const supabaseClient = createClient<Database>(
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

    // Handle the Twitter API calls based on the path
    if (path === '/auth' || path === '/verify') {
      console.log('[TWITTER-INTEGRATION] Processing auth verification with OAuth 1.0a');
      
      // With OAuth 1.0a, we just verify credentials directly using app tokens
      const verifyResult = await verifyTwitterCredentials();
      
      if (!verifyResult.verified) {
        console.error('[TWITTER-INTEGRATION] Failed to verify Twitter credentials');
        throw new Error('Twitter credentials verification failed');
      }
      
      console.log('[TWITTER-INTEGRATION] Twitter credentials verified successfully');
      
      // Store connection info in platform_connections table - FIX HERE
      try {
        console.log('[TWITTER-INTEGRATION] Storing Twitter connection in database for user:', user.id);
        
        // First check if the user exists in the users table, if not create them
        const { data: userData, error: userError } = await supabaseClient
          .from('users')
          .select('id')
          .eq('auth_id', user.id)
          .maybeSingle();

        if (userError) {
          console.error('[TWITTER-INTEGRATION] Error finding user:', userError);
          // Continue anyway to try to store the connection
        }
        
        let userId = user.id;
        
        if (!userData) {
          console.log('[TWITTER-INTEGRATION] User not found in users table, creating user entry');
          const { error: insertError } = await supabaseClient
            .from('users')
            .insert({
              auth_id: user.id,
              email: user.email
            });
          
          if (insertError) {
            console.error('[TWITTER-INTEGRATION] Error creating user in database:', insertError);
          } else {
            console.log('[TWITTER-INTEGRATION] Created new user in database');
          }
        }

        // Now store the connection - First check if one already exists
        const { data: existingConnection, error: checkError } = await supabaseClient
          .from('platform_connections')
          .select('id')
          .eq('user_id', userId)
          .eq('platform', 'twitter')
          .maybeSingle();
          
        if (checkError && checkError.code !== 'PGRST116') {
          console.error('[TWITTER-INTEGRATION] Error checking for existing connection:', checkError);
        }
        
        // Prepare the connection data
        const connectionData = {
          user_id: userId,
          platform: 'twitter',
          connected: true,
          username: verifyResult.user?.screen_name,
          profile_image: verifyResult.user?.profile_image_url_https,
          last_verified: new Date().toISOString()
        };
        
        console.log('[TWITTER-INTEGRATION] Connection data:', connectionData);
        
        let connectionResult;
        
        if (existingConnection) {
          // Update existing connection
          console.log('[TWITTER-INTEGRATION] Updating existing connection with ID:', existingConnection.id);
          connectionResult = await supabaseClient
            .from('platform_connections')
            .update(connectionData)
            .eq('id', existingConnection.id);
        } else {
          // Insert new connection
          console.log('[TWITTER-INTEGRATION] Creating new connection');
          connectionResult = await supabaseClient
            .from('platform_connections')
            .insert(connectionData);
        }
        
        if (connectionResult.error) {
          console.error('[TWITTER-INTEGRATION] Error storing/updating connection:', connectionResult.error);
          console.error('[TWITTER-INTEGRATION] Detailed error:', JSON.stringify(connectionResult.error));
          
          // Try with service role key if needed
          console.log('[TWITTER-INTEGRATION] Trying with service role...');
          const adminClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
          );
          
          if (existingConnection) {
            const { error: adminError } = await adminClient
              .from('platform_connections')
              .update(connectionData)
              .eq('id', existingConnection.id);
              
            if (adminError) {
              console.error('[TWITTER-INTEGRATION] Admin update error:', adminError);
            } else {
              console.log('[TWITTER-INTEGRATION] Successfully updated connection with service role');
            }
          } else {
            const { error: adminError } = await adminClient
              .from('platform_connections')
              .insert(connectionData);
              
            if (adminError) {
              console.error('[TWITTER-INTEGRATION] Admin insert error:', adminError);
            } else {
              console.log('[TWITTER-INTEGRATION] Successfully inserted connection with service role');
            }
          }
        } else {
          console.log('[TWITTER-INTEGRATION] Twitter connection stored/updated in database successfully');
        }
      } catch (dbError) {
        console.error('[TWITTER-INTEGRATION] Error storing/updating connection:', dbError);
        // Continue even if we can't update the DB, but log the error
      }
      
      return new Response(JSON.stringify({
        success: true,
        verified: true,
        user: verifyResult.user,
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
