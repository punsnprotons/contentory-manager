
import { createHmac } from "node:crypto";
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

// Twitter API credentials from environment variables
const API_KEY = Deno.env.get("TWITTER_API_KEY")?.trim();
const API_SECRET = Deno.env.get("TWITTER_API_SECRET")?.trim();
const ACCESS_TOKEN = Deno.env.get("TWITTER_ACCESS_TOKEN")?.trim();
const ACCESS_TOKEN_SECRET = Deno.env.get("TWITTER_ACCESS_TOKEN_SECRET")?.trim();
const CALLBACK_URL = "https://fxzamjowvpnyuxthusib.supabase.co/functions/v1/twitter-integration/callback";

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
  console.log("API_KEY length:", API_KEY?.length);
  console.log("API_SECRET length:", API_SECRET?.length);
  console.log("ACCESS_TOKEN length:", ACCESS_TOKEN?.length);
  console.log("ACCESS_TOKEN_SECRET length:", ACCESS_TOKEN_SECRET?.length);
  console.log("ACCESS_TOKEN first 5 chars:", ACCESS_TOKEN?.substring(0, 5));
  console.log("ACCESS_TOKEN_SECRET first 5 chars:", ACCESS_TOKEN_SECRET?.substring(0, 5));
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
  console.log("Signing Key pattern:", signingKey.replace(/./g, '*') + " (redacted for security)");
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
    
  console.log("Full OAuth Header pattern:", authHeader.substring(0, 20) + "... (abbreviated for security)");
  return authHeader;
}

// Request a temporary token from Twitter
async function getRequestToken(): Promise<{ oauth_token: string, oauth_token_secret: string, oauth_callback_confirmed: string }> {
  // Use the v1.1 OAuth endpoints which are still operational
  const requestTokenURL = 'https://api.twitter.com/oauth/request_token';
  const method = 'POST';
  
  // The callback URL should be properly encoded just once in the OAuth parameters
  const oauthParams: Record<string, string> = {
    oauth_callback: CALLBACK_URL
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
      oauth_token_secret: responseParams.oauth_token_secret,
      oauth_callback_confirmed: responseParams.oauth_callback_confirmed
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
  
  console.log("Received callback with token:", oauth_token, "and verifier:", oauth_verifier);
  
  if (!oauth_token || !oauth_verifier) {
    throw new Error("Missing oauth_token or oauth_verifier in callback");
  }
  
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

  // Generate a unique OAuth header for this request
  const authHeader = generateOAuthHeader(method, url, {}, ACCESS_TOKEN, ACCESS_TOKEN_SECRET);
  
  console.log("Sending tweet:", tweetText);
  console.log("Request method:", method);
  console.log("Request URL:", url);
  console.log("Request body:", JSON.stringify(requestBody));
  
  try {
    // Test access tokens with a GET request first to verify credentials
    console.log("Testing Twitter credentials with a simple GET request first...");
    const testUrl = `${BASE_URL}/users/me`;
    const testMethod = "GET";
    const testAuthHeader = generateOAuthHeader(testMethod, testUrl, {}, ACCESS_TOKEN, ACCESS_TOKEN_SECRET);
    
    const testResponse = await fetch(testUrl, {
      method: testMethod,
      headers: {
        Authorization: testAuthHeader,
        "Content-Type": "application/json",
      },
    });
    
    const testResponseText = await testResponse.text();
    console.log("Test Response Status:", testResponse.status);
    console.log("Test Response Body:", testResponseText);
    
    if (!testResponse.ok) {
      throw new Error(`Credentials test failed! status: ${testResponse.status}, body: ${testResponseText}`);
    }
    
    console.log("Credentials test passed. Proceeding with tweet...");
    
    // Now send the actual tweet
    const response = await fetch(url, {
      method: method,
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    const responseText = await response.text();
    console.log("Tweet Response Status:", response.status);
    console.log("Tweet Response Body:", responseText);

    if (!response.ok) {
      // Specific handling for 403 Forbidden errors
      if (response.status === 403) {
        try {
          const errorBody = JSON.parse(responseText);
          const errorDetail = {
            status: response.status,
            statusText: response.statusText,
            body: responseText,
            detail: errorBody.detail,
            title: errorBody.title,
            message: "This error indicates your access tokens don't have write permissions.",
            solution: "You need to regenerate your Twitter access tokens after enabling 'Read and write' permissions. Go to the Twitter Developer Portal, find your app's 'Keys and tokens' tab, and regenerate your 'Access Token and Secret'. Then update TWITTER_ACCESS_TOKEN and TWITTER_ACCESS_TOKEN_SECRET in your Supabase project settings."
          };
          console.error("Detailed 403 error:", JSON.stringify(errorDetail, null, 2));
          throw new Error(`403 Forbidden: ${errorBody.detail || "You don't have permission to post tweets"}. ${JSON.stringify(errorDetail)}`);
        } catch (parseError) {
          const errorDetail = {
            status: response.status,
            statusText: response.statusText,
            body: responseText,
            solution: "This is likely a permissions issue. Make sure your Twitter Developer App has WRITE permissions enabled. Go to the Twitter Developer Portal, find your app, go to 'User authentication settings' and ensure 'Read and write' permissions are selected, then regenerate your access tokens."
          };
          throw new Error(`Forbidden: You don't have permission to post tweets. ${JSON.stringify(errorDetail)}`);
        }
      }
      
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
  const userProfile = await getUser();
  const userId = userProfile.data.id;
  
  if (!userId) {
    throw new Error("Could not determine user ID");
  }
  
  console.log(`Fetching tweets for user ID: ${userId}, limit: ${limit}`);
  
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
      
      // Get the application URL for redirect - updated to use the production URL
      const appUrl = "https://contentory-manager.lovable.app/settings?auth=success";
      
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
              // If window.opener is not available, redirect to the application
              window.location.href = "${appUrl}";
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
      const result = await verifyCredentials();
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } else if (endpoint === 'tweet' || endpoint === 'twitter-integration' && req.method === 'POST' && (body as any).endpoint === 'tweet') {
      const tweetText = (body as any).text;
      
      if (!tweetText) {
        return new Response(JSON.stringify({ error: "Missing tweet text" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      try {
        // Generate a shorter unique tag for the tweet to avoid Twitter duplicate content error
        const randomSuffix = Math.random().toString(36).substring(2, 5);
        const uniqueTweetText = `${tweetText} #t${randomSuffix}`;
        
        const tweet = await sendTweet(uniqueTweetText);
        return new Response(JSON.stringify(tweet), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } catch (error) {
        console.error("Tweet error details:", error);
        
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        let status = 500;
        let responseBody: any = { 
          success: false,
          error: "Failed to post tweet", 
          details: errorMessage
        };
        
        // Check if this is a permissions issue
        if (errorMessage.includes("Forbidden") || errorMessage.includes("403")) {
          status = 403;
          responseBody.instructions = "After updating permissions in the Twitter Developer Portal to 'Read and write', you need to regenerate your access tokens and update both TWITTER_ACCESS_TOKEN and TWITTER_ACCESS_TOKEN_SECRET in your Supabase project settings.";
          responseBody.tokenInfo = "The original access tokens retain their original permission level, even after updating the app permissions. You must generate new tokens after changing permissions.";
        }
        
        return new Response(JSON.stringify(responseBody), {
          status: status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } else if (endpoint === 'user' || endpoint === 'twitter-integration' && req.method === 'POST' && (body as any).endpoint === 'user') {
      const user = await getUser();
      return new Response(JSON.stringify(user), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } else if (endpoint === 'profile' || endpoint === 'twitter-integration' && req.method === 'POST' && (body as any).endpoint === 'profile') {
      const profile = await getUserProfile();
      return new Response(JSON.stringify(profile), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } else if (endpoint === 'tweets' || endpoint === 'twitter-integration' && req.method === 'POST' && (body as any).endpoint === 'tweets') {
      const limit = (body as any).limit || 50;
      const tweets = await getUserTweets(limit);
      return new Response(JSON.stringify(tweets), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } else if (endpoint === 'auth' || endpoint === 'twitter-integration' && req.method === 'POST' && (body as any).endpoint === 'auth') {
      const result = await initiateOAuth();
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } else {
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
