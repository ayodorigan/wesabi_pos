import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface MPesaCallbackBody {
  Body: {
    stkCallback: {
      MerchantRequestID: string;
      CheckoutRequestID: string;
      ResultCode: number;
      ResultDesc: string;
      CallbackMetadata?: {
        Item: Array<{
          Name: string;
          Value: any;
        }>;
      };
    };
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const callbackData: MPesaCallbackBody = await req.json();
    console.log('M-Pesa Callback received:', JSON.stringify(callbackData, null, 2));

    const { stkCallback } = callbackData.Body;
    const {
      MerchantRequestID,
      CheckoutRequestID,
      ResultCode,
      ResultDesc,
      CallbackMetadata,
    } = stkCallback;

    let amount = 0;
    let mpesaReceiptNumber = '';
    let phoneNumber = '';
    let transactionDate = '';

    if (ResultCode === 0 && CallbackMetadata) {
      CallbackMetadata.Item.forEach((item) => {
        switch (item.Name) {
          case 'Amount':
            amount = item.Value;
            break;
          case 'MpesaReceiptNumber':
            mpesaReceiptNumber = item.Value;
            break;
          case 'PhoneNumber':
            phoneNumber = item.Value.toString();
            break;
          case 'TransactionDate':
            transactionDate = item.Value.toString();
            break;
        }
      });
    }

    const transactionStatus = ResultCode === 0 ? 'completed' : 'failed';

    const { error: insertError } = await supabase
      .from('mpesa_transactions')
      .insert({
        merchant_request_id: MerchantRequestID,
        checkout_request_id: CheckoutRequestID,
        result_code: ResultCode,
        result_description: ResultDesc,
        amount: amount,
        mpesa_receipt_number: mpesaReceiptNumber,
        phone_number: phoneNumber,
        transaction_date: transactionDate,
        transaction_status: transactionStatus,
      });

    if (insertError) {
      console.error('Error saving M-Pesa transaction:', insertError);
    }

    if (ResultCode === 0) {
      const { data: pendingSale, error: saleError } = await supabase
        .from('sales')
        .select('*')
        .eq('checkout_request_id', CheckoutRequestID)
        .eq('payment_status', 'pending')
        .maybeSingle();

      if (pendingSale && !saleError) {
        const { error: updateError } = await supabase
          .from('sales')
          .update({
            payment_status: 'completed',
            mpesa_receipt_number: mpesaReceiptNumber,
            customer_phone: phoneNumber,
            updated_at: new Date().toISOString(),
          })
          .eq('id', pendingSale.id);

        if (updateError) {
          console.error('Error updating sale:', updateError);
        } else {
          console.log(`Sale ${pendingSale.id} completed successfully`);
        }
      }
    }

    return new Response(
      JSON.stringify({
        ResultCode: 0,
        ResultDesc: 'Callback processed successfully',
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('M-Pesa Callback error:', error);
    return new Response(
      JSON.stringify({
        ResultCode: 1,
        ResultDesc: 'Internal server error',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
