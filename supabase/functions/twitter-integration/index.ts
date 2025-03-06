
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
  const missingVars = [];
  
  if (!API_KEY) missingVars.push("TWITTER_API_KEY");
  if (!API_SECRET) missingVars.push("TWITTER_API_SECRET");
  if (!ACCESS_TOKEN) missingVars.push("TWITTER_ACCESS_TOKEN");
  if (!ACCESS_TOKEN_SECRET) missingVars.push("TWITTER_ACCESS_TOKEN_SECRET");
  
  if (missingVars.length > 0) {
    throw new Error(`Missing environment variables: ${missingVars.join(", ")}`);
  }
  
  console.log("All Twitter API credentials are present");
  console.log("Using callback URL:", CALLBACK_URL);
}

// Generate OAuth 1.0a signature
function generateOAuthSignature(
  method: string,
  url: string,
  params: Record<string, string>,
  consumerSecret: string,
  tokenSecret: string = ""
): string {
  // 1. Create parameter string - all parameters must be sorted alphabetically
  const parameterString = Object.keys(params)
    .sort()
    .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
    .join('&');
    
  // 2. Create signature base string
  const signatureBaseString = [
    method.toUpperCase(),
    encodeURIComponent(url),
    encodeURIComponent(parameterString)
  ].join('&');
  
  // 3. Create signing key
  const signingKey = `${encodeURIComponent(consumerSecret)}&${encodeURIComponent(tokenSecret || "")}`;
  
  // 4. Generate HMAC-SHA1 signature
  const hmac = createHmac('sha1', signingKey);
  const signature = hmac.update(signatureBaseString).digest('base64');
  
  console.log("Parameter String:", parameterString);
  console.log("Signature Base String:", signatureBaseString);
  console.log("Signing Key:", signingKey);
  console.log("Generated Signature:", signature);
  
  return signature;
}

// Generate OAuth authorization header
function generateOAuthHeader(
  method: string,
  url: string,
  additionalParams: Record<string, string> = {},
  token: string | null = null,
  tokenSecret: string = ""
): string {
  // Create OAuth parameters
  const oauthParams: Record<string, string> = {
    oauth_consumer_key: API_KEY!,
    oauth_nonce: Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2),
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_version: '1.0',
    ...additionalParams
  };
  
  // Add token if provided (not used for request token)
  if (token) {
    oauthParams.oauth_token = token;
  }
  
  // Generate signature
  const signature = generateOAuthSignature(
    method,
    url,
    oauthParams,
    API_SECRET!,
    tokenSecret
  );
  
  // Add signature to OAuth parameters
  oauthParams.oauth_signature = signature;
  
  // Build authorization header string
  const authHeader = 'OAuth ' + Object.keys(oauthParams)
    .sort()
    .map(key => `${encodeURIComponent(key)}="${encodeURIComponent(oauthParams[key])}"`)
    .join(', ');
    
  console.log("Full OAuth Header:", authHeader);
  return authHeader;
}

// Request a temporary token from Twitter
async function getRequestToken(): Promise<{ oauth_token: string, oauth_token_secret: string }> {
  const requestTokenURL = 'https://api.twitter.com/oauth/request_token';
  const method = 'POST';
  
  // Create OAuth parameters including callback
  const oauthParams: Record<string, string> = {
    oauth_callback: encodeURIComponent(CALLBACK_URL)
  };
  
  // Generate authorization header
  const authHeader = generateOAuthHeader(method, requestTokenURL, oauthParams);
  
  console.log("Requesting token with header:", authHeader);
  console.log("Request URL:", requestTokenURL);
  
  try {
    const response = await fetch(requestTokenURL, {
      method: method,
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });
    
    const responseText = await response.text();
    console.log("Response status:", response.status);
    console.log("Response text:", responseText);
    
    if (!response.ok) {
      throw new Error(`Error getting request token: ${response.status} ${response.statusText}`);
    }
    
    // Parse response parameters
    const responseParts = responseText.split('&');
    const responseParams: Record<string, string> = {};
    
    for (const part of responseParts) {
      const [key, value] = part.split('=');
      responseParams[key] = value;
    }
    
    if (!responseParams.oauth_token || !responseParams.oauth_token_secret) {
      throw new Error("Invalid response: missing token or token secret");
    }
    
    return {
      oauth_token: responseParams.oauth_token,
      oauth_token_secret: responseParams.oauth_token_secret
    };
  } catch (error) {
    console.error("Error requesting token:", error);
    throw error;
  }
}

// Generate authentication URL
async function generateTwitterAuthURL(): Promise<string> {
  try {
    const { oauth_token } = await getRequestToken();
    const authURL = `https://api.twitter.com/oauth/authenticate?oauth_token=${oauth_token}`;
    console.log("Generated Auth URL:", authURL);
    return authURL;
  } catch (error) {
    console.error("Error generating auth URL:", error);
    throw error;
  }
}

// Twitter API v2 base URL
const BASE_URL = "https://api.twitter.com/2";

// Get current user profile
async function getUser() {
  const url = `${BASE_URL}/users/me`;
  const method = "GET";
  const authHeader = generateOAuthHeader(method, url, {}, ACCESS_TOKEN, ACCESS_TOKEN_SECRET);
  
  console.log("Getting Twitter user profile");
  
  const response = await fetch(url, {
    method: method,
    headers: {
      Authorization: authHeader,
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
  const requestBody = { text: tweetText };

  const authHeader = generateOAuthHeader(method, url, {}, ACCESS_TOKEN, ACCESS_TOKEN_SECRET);
  
  console.log("Sending tweet:", tweetText);
  
  const response = await fetch(url, {
    method: method,
    headers: {
      Authorization: authHeader,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(requestBody),
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

// Initiate OAuth authentication flow
async function initiateOAuth(): Promise<any> {
  try {
    const authURL = await generateTwitterAuthURL();
    return {
      success: true,
      authURL,
      message: "Twitter authentication URL generated"
    };
  } catch (error) {
    console.error("Error generating Twitter authentication URL:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Unknown error generating authentication URL"
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
    
    // Extract URL path to determine the endpoint
    const url = new URL(req.url);
    const endpoint = url.pathname.split('/').pop() || '';
    
    console.log(`Processing request for endpoint: ${endpoint}, method: ${req.method}`);
    
    // For POST requests, parse the JSON body
    let body = {};
    if (req.method === 'POST') {
      body = await req.json().catch(() => ({}));
      console.log("Request body:", body);
    }
    
    if (endpoint === 'verify' || endpoint === 'twitter-integration' && req.method === 'POST' && (body as any).endpoint === 'verify') {
      // Verify Twitter credentials
      const result = await verifyCredentials();
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } else if (endpoint === 'tweet' || endpoint === 'twitter-integration' && req.method === 'POST' && (body as any).endpoint === 'tweet') {
      // Send a tweet
      const tweetText = (body as any).text;
      
      if (!tweetText) {
        return new Response(JSON.stringify({ error: "Missing tweet text" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      const tweet = await sendTweet(tweetText);
      return new Response(JSON.stringify(tweet), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } else if (endpoint === 'user' || endpoint === 'twitter-integration' && req.method === 'POST' && (body as any).endpoint === 'user') {
      // Get user profile
      const user = await getUser();
      return new Response(JSON.stringify(user), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } else if (endpoint === 'auth' || endpoint === 'twitter-integration' && req.method === 'POST' && (body as any).endpoint === 'auth') {
      // Initiate OAuth flow
      const result = await initiateOAuth();
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } else {
      // Default response for the root endpoint or unknown endpoints
      const allEndpoints = {
        endpoints: {
          "/verify": "Verify Twitter credentials",
          "/tweet": "Send a tweet",
          "/user": "Get user profile",
          "/auth": "Initiate OAuth flow"
        },
        message: "Twitter Integration API"
      };
      
      return new Response(JSON.stringify(allEndpoints), {
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
