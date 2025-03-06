
import { createHmac } from "node:crypto";
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

// Twitter API credentials from environment variables
const API_KEY = Deno.env.get("TWITTER_API_KEY")?.trim();
const API_SECRET = Deno.env.get("TWITTER_API_SECRET")?.trim();
const ACCESS_TOKEN = Deno.env.get("TWITTER_ACCESS_TOKEN")?.trim();
const ACCESS_TOKEN_SECRET = Deno.env.get("TWITTER_ACCESS_TOKEN_SECRET")?.trim();
const CALLBACK_URL = Deno.env.get("TWITTER_CALLBACK_URL")?.trim() || "https://fxzamjowvpnyuxthusib.supabase.co/functions/v1/twitter-integration/callback";

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
  
  // Build authorization header string - using key in map function instead of hardcoded 'k'
  const authHeader = 'OAuth ' + Object.keys(oauthParams)
    .sort()
    .map(key => `${encodeURIComponent(key)}="${encodeURIComponent(oauthParams[key])}"`)
    .join(', ');
    
  console.log("Full OAuth Header:", authHeader);
  return authHeader;
}

// Request a temporary token from Twitter
async function getRequestToken(): Promise<{ oauth_token: string, oauth_token_secret: string }> {
  // Use the v1.1 OAuth endpoints which are still operational
  const requestTokenURL = 'https://api.twitter.com/oauth/request_token';
  const method = 'POST';
  
  // CRITICAL FIX: Don't double-encode the callback URL
  // The callback URL should be properly encoded just once in the OAuth parameters
  const oauthParams: Record<string, string> = {
    oauth_callback: CALLBACK_URL
  };
  
  // Generate authorization header
  const authHeader = generateOAuthHeader(method, requestTokenURL, oauthParams);
  
  console.log("Requesting token with header:", authHeader);
  console.log("Request URL:", requestTokenURL);
  console.log("Using callback URL:", CALLBACK_URL);
  
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
      throw new Error(`Error getting request token: ${response.status} ${response.statusText} - ${responseText}`);
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
    
    // Using the authorize endpoint which requires explicit user approval each time
    const authURL = `https://api.twitter.com/oauth/authorize?oauth_token=${oauth_token}`;
    console.log("Generated Auth URL:", authURL);
    return authURL;
  } catch (error) {
    console.error("Error generating auth URL:", error);
    throw error;
  }
}

// Handle the Twitter callback
async function handleCallback(url: URL): Promise<any> {
  const oauth_token = url.searchParams.get("oauth_token");
  const oauth_verifier = url.searchParams.get("oauth_verifier");
  
  if (!oauth_token || !oauth_verifier) {
    throw new Error("Missing oauth_token or oauth_verifier in callback");
  }
  
  console.log("Received callback with token:", oauth_token, "and verifier:", oauth_verifier);
  
  // Return success and include the origin of the request for dynamic redirect
  return {
    success: true,
    token: oauth_token,
    verifier: oauth_verifier,
    message: "Successfully authenticated with Twitter"
  };
}

// Twitter API v2 base URL
const BASE_URL = "https://api.twitter.com/2";

// Get current user profile
async function getUser() {
  const url = `${BASE_URL}/users/me`;
  const method = "GET";
  const authHeader = generateOAuthHeader(method, url, {}, ACCESS_TOKEN, ACCESS_TOKEN_SECRET);
  
  console.log("Getting Twitter user profile");
  
  try {
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
  } catch (error) {
    console.error("Error fetching user:", error);
    throw error;
  }
}

// Send a tweet
async function sendTweet(tweetText: string): Promise<any> {
  const url = `${BASE_URL}/tweets`;
  const method = "POST";
  const requestBody = { text: tweetText };

  const authHeader = generateOAuthHeader(method, url, {}, ACCESS_TOKEN, ACCESS_TOKEN_SECRET);
  
  console.log("Sending tweet:", tweetText);
  
  try {
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
  } catch (error) {
    console.error("Error sending tweet:", error);
    throw error;
  }
}

// Get user profile details with profile image and follower metrics
async function getUserProfile() {
  // The /users/me endpoint without field expansions doesn't include the data we need
  // Let's use it with expanded fields
  const url = `${BASE_URL}/users/me?user.fields=profile_image_url,description,public_metrics`;
  const method = "GET";
  const authHeader = generateOAuthHeader(method, url, {}, ACCESS_TOKEN, ACCESS_TOKEN_SECRET);
  
  console.log("Getting Twitter user profile with expanded fields");
  
  try {
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
  } catch (error) {
    console.error("Error fetching profile:", error);
    throw error;
  }
}

// Get user tweets
async function getUserTweets(limit = 10) {
  // First get the user ID from the user profile
  const userProfile = await getUser();
  const userId = userProfile.data.id;
  
  if (!userId) {
    throw new Error("Could not determine user ID");
  }
  
  console.log(`Fetching tweets for user ID: ${userId}, limit: ${limit}`);
  
  // Construct URL with query parameters
  const params = new URLSearchParams({
    'max_results': limit.toString(),
    'tweet.fields': 'created_at,public_metrics,attachments,entities',
    'expansions': 'attachments.media_keys',
    'media.fields': 'url,preview_image_url,type'
  });
  
  const url = `${BASE_URL}/users/${userId}/tweets?${params.toString()}`;
  const method = "GET";
  const authHeader = generateOAuthHeader(method, url, {}, ACCESS_TOKEN, ACCESS_TOKEN_SECRET);
  
  console.log("Getting user tweets with URL:", url);
  
  try {
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
  } catch (error) {
    console.error("Error fetching tweets:", error);
    throw error;
  }
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
    
    console.log(`Processing request for endpoint: ${endpoint}, method: ${req.method}, URL: ${req.url}`);
    
    // Handle the callback from Twitter
    if (endpoint === 'callback' || url.pathname.includes('/callback')) {
      console.log("Handling Twitter callback");
      const result = await handleCallback(url);
      
      // Return HTML that will post a message to the opener window and then close itself
      return new Response(
        `<html><body>
          <script>
            // Post message to the parent window that opened this window
            if (window.opener) {
              window.opener.postMessage({type: "TWITTER_AUTH_SUCCESS", data: ${JSON.stringify(result)}}, "*");
              console.log("Posted authentication success message to opener");
              // Close the popup window after posting the message
              window.close();
            } else {
              // If window.opener is not available, redirect to the main application
              window.location.href = "https://fxzamjowvpnyuxthusib.vercel.app";
            }
          </script>
          <p>Authentication successful. You can close this window and return to the application.</p>
        </body></html>`,
        { 
          headers: { 
            ...corsHeaders,
            "Content-Type": "text/html"
          }
        }
      );
    }
    
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
      
      // Add a random string to prevent duplicate tweet errors
      const randomSuffix = Math.random().toString(36).substring(2, 6);
      const uniqueTweetText = `${tweetText} #${randomSuffix}`;
      
      const tweet = await sendTweet(uniqueTweetText);
      return new Response(JSON.stringify(tweet), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } else if (endpoint === 'user' || endpoint === 'twitter-integration' && req.method === 'POST' && (body as any).endpoint === 'user') {
      // Get user profile
      const user = await getUser();
      return new Response(JSON.stringify(user), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } else if (endpoint === 'profile' || endpoint === 'twitter-integration' && req.method === 'POST' && (body as any).endpoint === 'profile') {
      // Get detailed user profile
      const profile = await getUserProfile();
      return new Response(JSON.stringify(profile), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } else if (endpoint === 'tweets' || endpoint === 'twitter-integration' && req.method === 'POST' && (body as any).endpoint === 'tweets') {
      // Get user tweets - increase default limit to fetch more tweets
      const limit = (body as any).limit || 50; // Increase default limit to 50
      const tweets = await getUserTweets(limit);
      return new Response(JSON.stringify(tweets), {
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
          "/profile": "Get detailed profile with follower metrics",
          "/tweets": "Get user tweets",
          "/auth": "Initiate OAuth flow",
          "/callback": "Handle Twitter OAuth callback"
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
