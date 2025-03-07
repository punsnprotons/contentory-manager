
// Only update the beginning of the file with better debugging

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Enhanced debugging for environment variables
console.log("[TWITTER-API] Function starting");
console.log("[TWITTER-API] SUPABASE_URL present:", !!Deno.env.get('SUPABASE_URL'), "Length:", Deno.env.get('SUPABASE_URL')?.length || 0);
console.log("[TWITTER-API] SUPABASE_ANON_KEY present:", !!Deno.env.get('SUPABASE_ANON_KEY'), "Length:", Deno.env.get('SUPABASE_ANON_KEY')?.length || 0);

// Check if the Twitter API keys are properly set in the environment with more detail
console.log("[TWITTER-API] Checking Twitter API keys:");
const twitterApiKeys = [
  "TWITTER_API_KEY", 
  "TWITTER_API_SECRET", 
  "TWITTER_ACCESS_TOKEN", 
  "TWITTER_ACCESS_TOKEN_SECRET"
];

// Log partial credentials for debugging without revealing full values
for (const key of twitterApiKeys) {
  const value = Deno.env.get(key);
  const valueExists = !!value;
  const valueLength = value?.length || 0;
  const valuePattern = valueExists 
    ? value.substring(0, 4) + "..." + (valueLength > 8 ? value.substring(valueLength - 4) : "") 
    : "not set";
  const containsSpaces = valueExists ? value.includes(" ") : false;
  
  console.log(`[TWITTER-API] ${key}: ${valueExists ? "SET" : "NOT SET"}, Length: ${valueLength}, Pattern: ${valuePattern}, Contains spaces: ${containsSpaces}`);
  
  // Additional format validation for specific keys
  if (key === "TWITTER_API_KEY" && valueExists) {
    console.log(`[TWITTER-API] ${key} format valid:`, /^[a-zA-Z0-9]{25,}$/.test(value));
  } else if (key === "TWITTER_API_SECRET" && valueExists) {
    console.log(`[TWITTER-API] ${key} format valid:`, /^[a-zA-Z0-9]{40,}$/.test(value));
  } else if (key === "TWITTER_ACCESS_TOKEN" && valueExists) {
    console.log(`[TWITTER-API] ${key} format valid:`, /^\d+-[a-zA-Z0-9]{40,}$/.test(value));
  } else if (key === "TWITTER_ACCESS_TOKEN_SECRET" && valueExists) {
    console.log(`[TWITTER-API] ${key} format valid:`, /^[a-zA-Z0-9]{35,}$/.test(value));
  }
}

// CORS headers for browser requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, path',
};

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

    console.log(`[TWITTER-API] Processing request for path: ${path}`);

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

    console.log(`[TWITTER-API] Publishing content with user: ${user.id}`);

    // Handle new rate-limit-status endpoint
    if (path === '/rate-limit-status') {
      console.log('[TWITTER-API] Fetching rate limit status');
      
      try {
        const { data, error } = await supabaseClient.functions.invoke(
          'twitter-integration',
          {
            method: 'POST',
            body: { 
              endpoint: 'rate-limits'
            }
          }
        );

        if (error) {
          console.error('[TWITTER-API] Error fetching rate limit status:', error);
          throw new Error(`Failed to fetch rate limit status: ${error.message}`);
        }

        return new Response(JSON.stringify(data), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      } catch (error) {
        console.error('[TWITTER-API] Error in rate limit status:', error);
        throw error;
      }
    }

    // Verify Twitter environment variables
    if (path === '/verify-credentials') {
      console.log('[TWITTER-API] Verifying Twitter credentials');
      try {
        const { data, error } = await supabaseClient.functions.invoke(
          'twitter-integration',
          {
            method: 'POST',
            body: { 
              endpoint: 'verify'
            }
          }
        );

        if (error) {
          console.error('[TWITTER-API] Error verifying Twitter credentials:', error);
          throw new Error(`Failed to verify Twitter credentials: ${error.message}`);
        }

        console.log('[TWITTER-API] Twitter credentials verified:', data?.verified);
        return new Response(JSON.stringify(data), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      } catch (error) {
        console.error('[TWITTER-API] Unexpected error during verification:', error);
        throw error;
      }
    }

    // Handle auth initialization endpoint
    if (path === '/auth') {
      console.log('[TWITTER-API] Initializing Twitter authentication');
      try {
        // Forward the request to the twitter-integration function with enhanced error handling
        try {
          const { data, error } = await supabaseClient.functions.invoke(
            'twitter-integration',
            {
              method: 'POST',
              body: { 
                endpoint: 'auth'
              }
            }
          );
          
          if (error) {
            console.error('[TWITTER-API] Error calling twitter-integration auth endpoint:', error);
            console.error('[TWITTER-API] Full error details:', error);
            throw new Error(`Failed to initialize Twitter authentication: ${error.message}`);
          }
          
          if (!data || !data.success || !data.authURL) {
            console.error('[TWITTER-API] Invalid response from twitter-integration:', data);
            throw new Error('Invalid response from twitter-integration function');
          }

          console.log('[TWITTER-API] Twitter auth initialization successful, authURL received');
          return new Response(JSON.stringify(data), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        } catch (invokeError) {
          console.error('[TWITTER-API] Error invoking twitter-integration function:', invokeError);
          throw new Error(`Failed to invoke twitter-integration function: ${invokeError.message}`);
        }
      } catch (error) {
        console.error('[TWITTER-API] Unexpected error during auth initialization:', error);
        throw error;
      }
    }

    // Call the twitter-integration function based on the path
    if (path === '/tweet') {
      // For tweet endpoint, forward the request to the twitter-integration function
      const requestBody = await req.json();
      
      console.log('[TWITTER-API] Tweet content:', requestBody.content.substring(0, 50) + (requestBody.content.length > 50 ? '...' : ''));
      
      try {
        // Forward the request to the twitter-integration function
        const { data, error } = await supabaseClient.functions.invoke(
          'twitter-integration',
          {
            method: 'POST',
            body: { 
              endpoint: 'tweet',
              text: requestBody.content 
            }
          }
        );

        if (error) {
          console.error('[TWITTER-API] Error calling twitter-integration function:', error);
          
          // Check if error contains JSON with more details
          try {
            const errorResponse = {
              success: false,
              error: 'Failed to post tweet',
              originalError: error.message,
              timestamp: new Date().toISOString()
            };
            
            console.error('[TWITTER-API] Full error details:', errorResponse);
            
            if (typeof error.message === 'string') {
              // First, try to extract the JSON part of the error message if present
              if (error.message.includes('{')) {
                try {
                  const jsonStart = error.message.indexOf('{');
                  const jsonEnd = error.message.lastIndexOf('}') + 1;
                  const jsonString = error.message.substring(jsonStart, jsonEnd);
                  const parsedError = JSON.parse(jsonString);
                  
                  console.error('[TWITTER-API] Parsed error details:', parsedError);
                  
                  errorResponse.details = parsedError.detail || parsedError.message || parsedError.body;
                  errorResponse.status = parsedError.status;
                  errorResponse.instructions = parsedError.solution || parsedError.instructions;
                } catch (parseError) {
                  console.error('[TWITTER-API] Error parsing JSON from error message:', parseError);
                }
              }
              
              // Check for 403 error to give specific remediation steps
              if (error.message.includes('403') || error.message.includes('Forbidden')) {
                errorResponse.error = 'Twitter API permission error';
                errorResponse.remediation = 'After updating permissions in the Twitter Developer Portal to "Read and write", you need to regenerate your access tokens and update both TWITTER_ACCESS_TOKEN and TWITTER_ACCESS_TOKEN_SECRET in your Supabase project settings.';
              }
            }
            
            return new Response(JSON.stringify(errorResponse), {
              status: 403,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          } catch (parseError) {
            console.error('[TWITTER-API] Error parsing error details:', parseError);
          }
          
          throw new Error(`Failed to post tweet: ${error.message}`);
        }

        // Return the response from the twitter-integration function
        console.log('[TWITTER-API] Tweet posted successfully');
        return new Response(JSON.stringify(data), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      } catch (tweetError) {
        console.error('[TWITTER-API] Unexpected error posting tweet:', tweetError);
        throw tweetError;
      }
    } else if (path === '/refresh') {
      // For refresh endpoint, call the twitter-refresh function
      const { data, error } = await supabaseClient.functions.invoke(
        'twitter-refresh',
        {
          method: 'POST',
          body: { userId: userData.id }
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
    
    // Check for specific error messages that indicate permission issues
    let errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    let statusCode = 500;
    let instructions = undefined;
    
    // Provide more specific error messages and instructions
    if (errorMessage.includes('Forbidden') || errorMessage.includes('403') || errorMessage.includes('permission')) {
      statusCode = 403;
      errorMessage = 'Twitter API permission error: Your Twitter access tokens don\'t have write permissions. You need to generate new access tokens after enabling "Read and write" permissions.';
      instructions = "After updating permissions in the Twitter Developer Portal to 'Read and write', you need to regenerate your access tokens and update both TWITTER_ACCESS_TOKEN and TWITTER_ACCESS_TOKEN_SECRET in your Supabase project settings.";
    }
    
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
        instructions,
        status: statusCode,
        timestamp: new Date().toISOString()
      }),
      {
        status: statusCode,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
