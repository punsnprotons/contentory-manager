
// Instagram webhook edge function
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// This should match the verify token configured in your Meta app
const VERIFY_TOKEN = 'my_custom_token_123';

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  console.log(`[INSTAGRAM-WEBHOOK] Received ${req.method} request`);

  try {
    // Handle GET requests (webhook verification)
    if (req.method === 'GET') {
      // Parse URL and query params
      const url = new URL(req.url);
      const mode = url.searchParams.get('hub.mode');
      const token = url.searchParams.get('hub.verify_token');
      const challenge = url.searchParams.get('hub.challenge');

      console.log(`[INSTAGRAM-WEBHOOK] Verification attempt - Mode: ${mode}, Token: ${token}, Challenge: ${challenge}`);

      // Check if token and mode is correct
      if (mode === 'subscribe' && token === VERIFY_TOKEN) {
        if (!challenge) {
          console.error('[INSTAGRAM-WEBHOOK] Missing hub.challenge parameter');
          return new Response('Bad Request: Missing hub.challenge parameter', { 
            status: 400,
            headers: { ...corsHeaders }
          });
        }
        
        console.log(`[INSTAGRAM-WEBHOOK] Verification successful, responding with challenge: ${challenge}`);
        
        // Respond with the challenge string to verify
        return new Response(challenge, { 
          status: 200,
          headers: { ...corsHeaders }
        });
      } else {
        console.error('[INSTAGRAM-WEBHOOK] Verification failed - invalid token or mode');
        return new Response('Forbidden: Invalid verify token', { 
          status: 403,
          headers: { ...corsHeaders }
        });
      }
    } 
    
    // Handle POST requests (actual webhook events)
    else if (req.method === 'POST') {
      const payload = await req.json();
      console.log('[INSTAGRAM-WEBHOOK] Received webhook event:', JSON.stringify(payload));
      
      // Here you would process different webhook events based on their type
      // For example:
      // if (payload.object === 'instagram' && payload.entry) {
      //   for (const entry of payload.entry) {
      //     // Process the entry based on its content
      //   }
      // }
      
      // Always respond with 200 OK to acknowledge receipt
      return new Response('EVENT_RECEIVED', { 
        status: 200,
        headers: { ...corsHeaders }
      });
    }
    
    // Handle unsupported methods
    else {
      return new Response(`Method ${req.method} not allowed`, { 
        status: 405,
        headers: { ...corsHeaders }
      });
    }
  } catch (error) {
    console.error(`[INSTAGRAM-WEBHOOK] Error:`, error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "An unknown error occurred" 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
