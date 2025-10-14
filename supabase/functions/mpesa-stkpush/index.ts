import 'jsr:@supabase/functions-js/edge-runtime.d.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface STKPushRequest {
  phoneNumber: string;
  amount: number;
  accountReference: string;
  transactionDesc: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { phoneNumber, amount, accountReference, transactionDesc }: STKPushRequest = await req.json();

    if (!phoneNumber || !amount || !accountReference) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const MPESA_CONSUMER_KEY = Deno.env.get('MPESA_CONSUMER_KEY');
    const MPESA_CONSUMER_SECRET = Deno.env.get('MPESA_CONSUMER_SECRET');
    const MPESA_SHORTCODE = Deno.env.get('MPESA_SHORTCODE');
    const MPESA_PASSKEY = Deno.env.get('MPESA_PASSKEY');
    const MPESA_CALLBACK_URL = Deno.env.get('MPESA_CALLBACK_URL') || 'https://your-domain.com/mpesa/callback';
    const MPESA_ENVIRONMENT = Deno.env.get('MPESA_ENVIRONMENT') || 'sandbox';

    if (!MPESA_CONSUMER_KEY || !MPESA_CONSUMER_SECRET || !MPESA_SHORTCODE || !MPESA_PASSKEY) {
      return new Response(
        JSON.stringify({ error: 'M-Pesa credentials not configured. Please set up environment variables.' }),
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

    const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, 14);
    const password = btoa(`${MPESA_SHORTCODE}${MPESA_PASSKEY}${timestamp}`);

    let formattedPhone = phoneNumber.replace(/\D/g, '');
    if (formattedPhone.startsWith('0')) {
      formattedPhone = '254' + formattedPhone.slice(1);
    } else if (!formattedPhone.startsWith('254')) {
      formattedPhone = '254' + formattedPhone;
    }

    const stkPushUrl = MPESA_ENVIRONMENT === 'production'
      ? 'https://api.safaricom.co.ke/mpesa/stkpush/v1/processrequest'
      : 'https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest';

    const stkPushPayload = {
      BusinessShortCode: MPESA_SHORTCODE,
      Password: password,
      Timestamp: timestamp,
      TransactionType: 'CustomerPayBillOnline',
      Amount: Math.round(amount),
      PartyA: formattedPhone,
      PartyB: MPESA_SHORTCODE,
      PhoneNumber: formattedPhone,
      CallBackURL: MPESA_CALLBACK_URL,
      AccountReference: accountReference,
      TransactionDesc: transactionDesc || 'Payment',
    };

    const stkResponse = await fetch(stkPushUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(stkPushPayload),
    });

    const stkData = await stkResponse.json();

    if (!stkResponse.ok || stkData.ResponseCode !== '0') {
      return new Response(
        JSON.stringify({ 
          error: 'Failed to initiate M-Pesa payment', 
          details: stkData.ResponseDescription || stkData.errorMessage 
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
        message: 'STK Push sent successfully. Please check your phone.',
        merchantRequestID: stkData.MerchantRequestID,
        checkoutRequestID: stkData.CheckoutRequestID,
        responseCode: stkData.ResponseCode,
        responseDescription: stkData.ResponseDescription,
        customerMessage: stkData.CustomerMessage,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('M-Pesa STK Push error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});