
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

// CORS headers for browser requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    const url = new URL(req.url);
    const oauth_token = url.searchParams.get('oauth_token');
    const oauth_verifier = url.searchParams.get('oauth_verifier');
    
    console.log("Received Twitter OAuth callback:", { oauth_token, oauth_verifier });
    
    if (!oauth_token || !oauth_verifier) {
      console.error("Missing required OAuth parameters");
      return new Response(JSON.stringify({ 
        error: "Missing required OAuth parameters" 
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }
    
    // Redirect to the application with success flag
    const redirectUrl = new URL(url.origin);
    redirectUrl.pathname = "/settings";
    redirectUrl.searchParams.set('auth_success', 'true');
    redirectUrl.searchParams.set('oauth_token', oauth_token);
    redirectUrl.searchParams.set('oauth_verifier', oauth_verifier);
    
    console.log("Redirecting to:", redirectUrl.toString());
    
    return new Response(null, {
      status: 302,
      headers: { 
        ...corsHeaders,
        "Location": redirectUrl.toString()
      }
    });
  } catch (error) {
    console.error("Error handling Twitter OAuth callback:", error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : "Unknown error handling callback" 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
