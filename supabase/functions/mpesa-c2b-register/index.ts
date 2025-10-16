import 'jsr:@supabase/functions-js/edge-runtime.d.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const MPESA_CONSUMER_KEY = Deno.env.get('MPESA_CONSUMER_KEY');
    const MPESA_CONSUMER_SECRET = Deno.env.get('MPESA_CONSUMER_SECRET');
    const MPESA_SHORTCODE = Deno.env.get('MPESA_SHORTCODE');
    const MPESA_ENVIRONMENT = Deno.env.get('MPESA_ENVIRONMENT') || 'sandbox';
    const supabaseUrl = Deno.env.get('SUPABASE_URL');

    if (!MPESA_CONSUMER_KEY || !MPESA_CONSUMER_SECRET || !MPESA_SHORTCODE) {
      return new Response(
        JSON.stringify({ error: 'M-Pesa credentials not configured' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const authUrl = MPESA_ENVIRONMENT === 'production'
      ? 'https://api.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials'
      : 'https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials';

    const authString = btoa(`${MPESA_CONSUMER_KEY}:${MPESA_CONSUMER_SECRET}`);
    const authResponse = await fetch(authUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${authString}`,
      },
    });

    if (!authResponse.ok) {
      throw new Error('Failed to get M-Pesa access token');
    }

    const authData = await authResponse.json();
    const accessToken = authData.access_token;

    const registerUrl = MPESA_ENVIRONMENT === 'production'
      ? 'https://api.safaricom.co.ke/mpesa/c2b/v1/registerurl'
      : 'https://sandbox.safaricom.co.ke/mpesa/c2b/v1/registerurl';

    const registerPayload = {
      ShortCode: MPESA_SHORTCODE,
      ResponseType: 'Completed',
      ConfirmationURL: `${supabaseUrl}/functions/v1/mpesa-c2b-confirmation`,
    };

    console.log('Registering C2B URLs:', registerPayload);

    const registerResponse = await fetch(registerUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(registerPayload),
    });

    const registerData = await registerResponse.json();

    if (!registerResponse.ok) {
      return new Response(
        JSON.stringify({
          error: 'Failed to register C2B URLs',
          details: registerData,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'C2B URLs registered successfully',
        data: registerData,
        urls: {
          confirmation: `${supabaseUrl}/functions/v1/mpesa-c2b-confirmation`,
        },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('C2B Registration error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});