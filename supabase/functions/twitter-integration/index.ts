
import { createHmac } from "node:crypto";
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

// Twitter API credentials from environment variables
const API_KEY = Deno.env.get("TWITTER_API_KEY")?.trim();
const API_SECRET = Deno.env.get("TWITTER_API_SECRET")?.trim();
const ACCESS_TOKEN = Deno.env.get("TWITTER_ACCESS_TOKEN")?.trim();
const ACCESS_TOKEN_SECRET = Deno.env.get("TWITTER_ACCESS_TOKEN_SECRET")?.trim();
const CALLBACK_URL = Deno.env.get("TWITTER_CALLBACK_URL")?.trim() || "https://fxzamjowvpnyuxthusib.supabase.co/auth/v1/callback";

// CORS headers for browser requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Validate environment variables
function validateEnvironmentVariables() {
  if (!API_KEY) {
    throw new Error("Missing TWITTER_API_KEY environment variable");
  }
  if (!API_SECRET) {
    throw new Error("Missing TWITTER_API_SECRET environment variable");
  }
  if (!ACCESS_TOKEN) {
    throw new Error("Missing TWITTER_ACCESS_TOKEN environment variable");
  }
  if (!ACCESS_TOKEN_SECRET) {
    throw new Error("Missing TWITTER_ACCESS_TOKEN_SECRET environment variable");
  }
}

// Generate OAuth signature for Twitter API
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

  console.log("Signature Base String:", signatureBaseString);
  console.log("Generated Signature:", signature);

  return signature;
}

// Generate OAuth header for Twitter API requests
function generateOAuthHeader(method: string, url: string): string {
  const oauthParams = {
    oauth_consumer_key: API_KEY!,
    oauth_nonce: Math.random().toString(36).substring(2),
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_token: ACCESS_TOKEN!,
    oauth_version: "1.0",
  };

  const signature = generateOAuthSignature(
    method,
    url,
    oauthParams,
    API_SECRET!,
    ACCESS_TOKEN_SECRET!
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

const BASE_URL = "https://api.x.com/2";

// Get current Twitter user profile
async function getUser() {
  const url = `${BASE_URL}/users/me`;
  const method = "GET";
  const oauthHeader = generateOAuthHeader(method, url);
  
  console.log("Getting Twitter user profile");
  console.log("OAuth Header:", oauthHeader);
  
  const response = await fetch(url, {
    method: method,
    headers: {
      Authorization: oauthHeader,
      "Content-Type": "application/json",
    },
  });
  
  const responseText = await response.text();
  console.log("Response Status:", response.status);
  console.log("Response Body:", responseText);
  
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}, body: ${responseText}`);
  }
  
  return JSON.parse(responseText);
}

// Send a tweet
async function sendTweet(tweetText: string): Promise<any> {
  const url = `${BASE_URL}/tweets`;
  const method = "POST";
  const params = { text: tweetText };

  const oauthHeader = generateOAuthHeader(method, url);
  console.log("Sending tweet:", tweetText);
  console.log("OAuth Header:", oauthHeader);

  const response = await fetch(url, {
    method: method,
    headers: {
      Authorization: oauthHeader,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(params),
  });

  const responseText = await response.text();
  console.log("Response Status:", response.status);
  console.log("Response Body:", responseText);

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}, body: ${responseText}`);
  }

  return JSON.parse(responseText);
}

// Verify Twitter credentials
async function verifyCredentials(): Promise<any> {
  try {
    const user = await getUser();
    return {
      verified: true,
      user: user.data,
      message: "Twitter credentials verified successfully"
    };
  } catch (error) {
    console.error("Error verifying Twitter credentials:", error);
    return {
      verified: false,
      message: error instanceof Error ? error.message : "Unknown error verifying credentials"
    };
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    validateEnvironmentVariables();
    
    // Get the endpoint from the URL
    const url = new URL(req.url);
    const endpoint = url.pathname.split('/').pop();
    
    if (endpoint === 'verify') {
      // Verify Twitter credentials
      const result = await verifyCredentials();
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } else if (endpoint === 'tweet') {
      // Send a tweet
      const body = await req.json();
      if (!body.text) {
        return new Response(JSON.stringify({ error: "Missing tweet text" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      const tweet = await sendTweet(body.text);
      return new Response(JSON.stringify(tweet), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } else if (endpoint === 'user') {
      // Get user profile
      const user = await getUser();
      return new Response(JSON.stringify(user), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } else {
      // Unknown endpoint
      return new Response(JSON.stringify({ error: "Unknown endpoint" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  } catch (error: any) {
    console.error("An error occurred:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
