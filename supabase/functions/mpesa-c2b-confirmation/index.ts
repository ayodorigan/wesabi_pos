import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface C2BPayment {
  TransactionType: string;
  TransID: string;
  TransTime: string;
  TransAmount: number;
  BusinessShortCode: string;
  BillRefNumber: string;
  InvoiceNumber?: string;
  OrgAccountBalance?: number;
  ThirdPartyTransID?: string;
  MSISDN: string;
  FirstName?: string;
  MiddleName?: string;
  LastName?: string;
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

    const c2bPayment: C2BPayment = await req.json();
    console.log('C2B Payment received:', JSON.stringify(c2bPayment, null, 2));

    const {
      TransID,
      TransTime,
      TransAmount,
      BusinessShortCode,
      BillRefNumber,
      MSISDN,
      FirstName,
      MiddleName,
      LastName,
    } = c2bPayment;

    const customerName = [FirstName, MiddleName, LastName]
      .filter(Boolean)
      .join(' ') || 'M-Pesa Customer';

    const { error: insertError } = await supabase
      .from('mpesa_transactions')
      .insert({
        mpesa_receipt_number: TransID,
        transaction_date: TransTime,
        amount: TransAmount,
        phone_number: MSISDN,
        business_short_code: BusinessShortCode,
        bill_ref_number: BillRefNumber,
        transaction_status: 'completed',
        transaction_type: 'C2B',
        customer_name: customerName,
      });

    if (insertError) {
      console.error('Error saving C2B transaction:', insertError);
    }

    const { data: pendingSale, error: saleError } = await supabase
      .from('sales')
      .select('*')
      .eq('receipt_number', BillRefNumber)
      .eq('payment_method', 'M-Pesa')
      .eq('payment_status', 'pending')
      .maybeSingle();

    if (pendingSale && !saleError) {
      console.log(`Found pending sale: ${pendingSale.id} for receipt ${BillRefNumber}`);

      if (Math.abs(parseFloat(pendingSale.total_amount) - TransAmount) <= 1) {
        const { error: updateError } = await supabase
          .from('sales')
          .update({
            payment_status: 'completed',
            mpesa_receipt_number: TransID,
            customer_phone: MSISDN,
            customer_name: customerName,
            updated_at: new Date().toISOString(),
          })
          .eq('id', pendingSale.id);

        if (updateError) {
          console.error('Error updating sale:', updateError);
        } else {
          console.log(`Sale ${pendingSale.id} auto-completed via C2B payment`);
        }
      } else {
        console.warn(
          `Amount mismatch: Expected ${pendingSale.total_amount}, Received ${TransAmount}`
        );
      }
    } else {
      console.log(
        `No pending sale found for receipt ${BillRefNumber}. Payment recorded but not linked to sale.`
      );
    }

    return new Response(
      JSON.stringify({
        ResultCode: 0,
        ResultDesc: 'Confirmation received successfully',
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('C2B Confirmation error:', error);
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
