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
    const url = new URL(req.url);
    const action = url.searchParams.get('action') || 'check-credentials';

    // Check credentials
    if (action === 'check-credentials') {
      const credentials = {
        MPESA_CONSUMER_KEY: Deno.env.get('MPESA_CONSUMER_KEY') ? 'SET (length: ' + Deno.env.get('MPESA_CONSUMER_KEY')!.length + ')' : 'NOT SET',
        MPESA_CONSUMER_SECRET: Deno.env.get('MPESA_CONSUMER_SECRET') ? 'SET (length: ' + Deno.env.get('MPESA_CONSUMER_SECRET')!.length + ')' : 'NOT SET',
        MPESA_SHORTCODE: Deno.env.get('MPESA_SHORTCODE') ? 'SET (value: ' + Deno.env.get('MPESA_SHORTCODE') + ')' : 'NOT SET',
        MPESA_PASSKEY: Deno.env.get('MPESA_PASSKEY') ? 'SET (length: ' + Deno.env.get('MPESA_PASSKEY')!.length + ')' : 'NOT SET',
        MPESA_CALLBACK_URL: Deno.env.get('MPESA_CALLBACK_URL') || 'NOT SET (will use default)',
        MPESA_ENVIRONMENT: Deno.env.get('MPESA_ENVIRONMENT') || 'NOT SET (defaults to sandbox)',
        SUPABASE_URL: Deno.env.get('SUPABASE_URL') || 'NOT SET',
      };

      return new Response(
        JSON.stringify({
          message: 'M-Pesa Configuration Status',
          credentials,
          allSet: !Object.values(credentials).some(v => v.includes('NOT SET')),
        }, null, 2),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Simulate C2B confirmation for testing
    if (action === 'simulate-c2b') {
      const receiptNumber = url.searchParams.get('receipt') || 'RCPT001234';
      const amount = parseFloat(url.searchParams.get('amount') || '100');
      const phone = url.searchParams.get('phone') || '254708374149';

      const c2bPayload = {
        TransactionType: 'Pay Bill',
        TransID: 'TEST' + Date.now(),
        TransTime: new Date().toISOString().replace(/[-:TZ]/g, '').slice(0, 14),
        TransAmount: amount,
        BusinessShortCode: Deno.env.get('MPESA_SHORTCODE') || '174379',
        BillRefNumber: receiptNumber,
        InvoiceNumber: '',
        OrgAccountBalance: '',
        ThirdPartyTransID: '',
        MSISDN: phone,
        FirstName: 'Test',
        MiddleName: '',
        LastName: 'Customer',
      };

      const supabaseUrl = Deno.env.get('SUPABASE_URL');
      const confirmationUrl = `${supabaseUrl}/functions/v1/mpesa-c2b-confirmation`;

      console.log('Simulating C2B confirmation to:', confirmationUrl);
      console.log('Payload:', JSON.stringify(c2bPayload, null, 2));

      const response = await fetch(confirmationUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(c2bPayload),
      });

      const result = await response.json();

      return new Response(
        JSON.stringify({
          message: 'C2B Simulation Sent',
          sentTo: confirmationUrl,
          payload: c2bPayload,
          response: result,
          status: response.status,
        }, null, 2),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    return new Response(
      JSON.stringify({
        error: 'Invalid action',
        availableActions: [
          'check-credentials - Check if all M-Pesa credentials are set',
          'simulate-c2b - Simulate a C2B payment (use ?action=simulate-c2b&receipt=RCPT123&amount=100&phone=254708374149)',
        ],
      }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Test error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
