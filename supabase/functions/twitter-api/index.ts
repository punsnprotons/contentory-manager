
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
      throw new Error('User not found');
    }

    // Find the user in the database
    const { data: userData, error: userError } = await supabaseClient
      .from('users')
      .select('id')
      .eq('auth_id', user.id)
      .single();

    if (userError || !userData) {
      console.error('Error finding user in database:', userError);
      throw new Error('User not found in database');
    }

    console.log(`Publishing content with user: ${user.id}`);

    // Call the twitter-integration function based on the path
    if (path === '/tweet') {
      // For tweet endpoint, forward the request to the twitter-integration function
      const requestBody = await req.json();
      
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
        console.error('Error calling twitter-integration function:', error);
        
        // Check if error contains JSON with more details
        try {
          const errorResponse = {
            success: false,
            error: 'Failed to post tweet',
            originalError: error.message
          };
          
          if (typeof error.message === 'string') {
            // First, try to extract the JSON part of the error message if present
            if (error.message.includes('{')) {
              try {
                const jsonStart = error.message.indexOf('{');
                const jsonEnd = error.message.lastIndexOf('}') + 1;
                const jsonString = error.message.substring(jsonStart, jsonEnd);
                const parsedError = JSON.parse(jsonString);
                
                errorResponse.details = parsedError.detail || parsedError.message || parsedError.body;
                errorResponse.status = parsedError.status;
                errorResponse.instructions = parsedError.solution || parsedError.instructions;
              } catch (parseError) {
                console.error('Error parsing JSON from error message:', parseError);
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
          console.error('Error parsing error details:', parseError);
        }
        
        throw new Error(`Failed to post tweet: ${error.message}`);
      }

      // Return the response from the twitter-integration function
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
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
        console.error('Error calling twitter-refresh function:', error);
        throw new Error(`Failed to refresh Twitter data: ${error.message}`);
      }

      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } else if (path === '/verify-credentials') {
      // Add a new endpoint to verify Twitter credentials
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
        console.error('Error verifying Twitter credentials:', error);
        throw new Error(`Failed to verify Twitter credentials: ${error.message}`);
      }

      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } else {
      throw new Error(`Unknown path: ${path}`);
    }
  } catch (error) {
    console.error('Error publishing to Twitter:', error);
    
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
        status: statusCode
      }),
      {
        status: statusCode,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
