
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
          if (typeof error.message === 'string' && error.message.includes('{')) {
            // Extract the JSON part of the error message if present
            const jsonStart = error.message.indexOf('{');
            const jsonEnd = error.message.lastIndexOf('}') + 1;
            const jsonString = error.message.substring(jsonStart, jsonEnd);
            const parsedError = JSON.parse(jsonString);
            
            throw new Error(`Failed to post tweet: ${parsedError.details || parsedError.message || error.message}`);
          }
        } catch {
          // If we can't parse JSON, just use the original error
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
    } else {
      throw new Error(`Unknown path: ${path}`);
    }
  } catch (error) {
    console.error('Error publishing to Twitter:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'An unknown error occurred'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
