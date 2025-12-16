# Complete M-Pesa Integration Setup Guide

This guide covers the complete M-Pesa integration including STK Push, C2B (Customer to Business), and automatic sale completion.

## Overview

Your system now supports two M-Pesa payment methods:

1. **STK Push** - You initiate payment by pushing to customer's phone
2. **C2B (Customer to Business)** - Customer sends money directly to your Till/Paybill, system auto-completes sale

## Part 1: Where to Configure M-Pesa

### Option 1: Supabase Dashboard (Recommended)

**Location**: Supabase Dashboard → Project Settings → Edge Functions → Secrets

Add these 6 secrets:

```
MPESA_CONSUMER_KEY=[Your Consumer Key from Daraja]
MPESA_CONSUMER_SECRET=[Your Consumer Secret from Daraja]
MPESA_SHORTCODE=[Your Till Number or Paybill]
MPESA_PASSKEY=[See below for how to get this]
MPESA_CALLBACK_URL=[Auto-configured, see Part 2]
MPESA_ENVIRONMENT=production
```

### Option 2: In-App Configuration (Coming Soon)

We've prepared a database table `mpesa_config` for in-app configuration. You can add a Settings page section to manage M-Pesa credentials through the UI.

## Part 2: Your Callback URLs

Your system has 3 callback endpoints that M-Pesa will call:

### 1. STK Push Callback URL
```
https://[your-project-ref].supabase.co/functions/v1/mpesa-callback
```

**What it does**: Receives confirmation when customer completes STK Push payment

**When it's called**: After customer enters M-Pesa PIN

**What it updates**:
- Marks sale as completed
- Records M-Pesa receipt number
- Saves customer phone number

### 2. C2B Confirmation URL
```
https://[your-project-ref].supabase.co/functions/v1/mpesa-c2b-confirmation
```

**What it does**: Receives confirmation when customer sends money directly to your Till/Paybill

**When it's called**: Immediately after customer sends money

**What it updates**:
- Auto-completes pending sale matching the receipt number
- Records transaction details
- Updates customer information

### 3. C2B Validation URL
```
https://[your-project-ref].supabase.co/functions/v1/mpesa-c2b-validation
```

**What it does**: Validates incoming C2B payments before M-Pesa processes them

**When it's called**: Before money is received (you can reject if needed)

**What it returns**: Accepts all payments by default

## Part 3: Setting Up STK Push

### Step 1: Deploy Edge Functions

The following functions are ready to deploy:

```bash
# Deploy all M-Pesa functions
supabase functions deploy mpesa-stkpush
supabase functions deploy mpesa-callback
supabase functions deploy mpesa-c2b-confirmation
supabase functions deploy mpesa-c2b-validation
```

Or use the Supabase MCP tool to deploy them.

### Step 2: Get Your Callback URL

Your callback URL is automatically configured as:
```
https://[project-ref].supabase.co/functions/v1/mpesa-callback
```

Replace `[project-ref]` with your actual Supabase project reference (found in your project URL).

### Step 3: Test STK Push

1. Go to POS system
2. Add items to cart
3. Select "M-Pesa" as payment method
4. Enter customer phone number
5. Click "Complete Sale"
6. Customer receives STK Push prompt
7. After entering PIN, sale auto-completes

## Part 4: Setting Up C2B (Customer to Business)

### What is C2B?

C2B allows customers to send money directly to your Till/Paybill from their M-Pesa app. When they use your receipt number as the account reference, the system automatically matches and completes the sale.

### Step 1: Register C2B URLs with Safaricom

You need to tell Safaricom where to send payment notifications.

**Option A: Using Daraja Portal (Recommended)**

1. Log in to https://developer.safaricom.co.ke
2. Go to your app
3. Look for "C2B" or "Lipa Na M-Pesa Online" settings
4. Register your URLs:
   - **Validation URL**: `https://[project-ref].supabase.co/functions/v1/mpesa-c2b-validation`
   - **Confirmation URL**: `https://[project-ref].supabase.co/functions/v1/mpesa-c2b-confirmation`

**Option B: Using C2B Register API**

Create an edge function to register C2B URLs (code provided below).

### Step 2: How C2B Works

1. **Create Sale in POS**
   - User creates a sale, selects M-Pesa
   - System generates unique receipt number (e.g., "RCPT001234")
   - Sale is saved with `payment_status = 'pending'`

2. **Customer Sends Money**
   - Customer opens M-Pesa on their phone
   - Selects "Lipa Na M-Pesa" → "Paybill/Buy Goods"
   - Enters your Till/Paybill number
   - **Account Number**: Uses the receipt number (RCPT001234)
   - **Amount**: Exact sale amount
   - Sends money

3. **Auto-Completion**
   - M-Pesa sends confirmation to your C2B confirmation URL
   - System finds pending sale by receipt number
   - Verifies amount matches
   - Auto-completes the sale
   - Records M-Pesa receipt, phone, customer name

### Step 3: Enable C2B in Your Code

The C2B confirmation handler is already created. No code changes needed in POS - it works automatically!

## Part 5: Database Schema

### New Table: `mpesa_transactions`

Stores all M-Pesa transactions:

```sql
- id (uuid)
- merchant_request_id (STK Push ID)
- checkout_request_id (STK Push tracking)
- mpesa_receipt_number (M-Pesa confirmation code)
- transaction_date
- phone_number
- amount
- business_short_code (Your Till/Paybill)
- bill_ref_number (Receipt number for C2B)
- result_code (0 = success)
- result_description
- transaction_status (pending/completed/failed)
- transaction_type (STK/C2B)
- customer_name
```

### Updated Table: `sales`

New columns added:

```sql
- checkout_request_id (links to STK Push)
- payment_status (pending/completed/failed)
- mpesa_receipt_number (M-Pesa receipt)
- customer_phone (from M-Pesa)
```

## Part 6: Testing

### Test STK Push

1. **Sandbox Mode**:
   - Set `MPESA_ENVIRONMENT=sandbox`
   - Use test phone: 254708374149
   - Use test shortcode: 174379
   - Use test passkey: `bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919`

2. **Production Mode**:
   - Set `MPESA_ENVIRONMENT=production`
   - Use your real Till Number
   - Test with small amount (KES 10)

### Test C2B

1. Create a sale in POS
2. Note the receipt number
3. Send money from M-Pesa app to your Till
4. Use receipt number as account number
5. Check if sale auto-completes

## Part 7: Registering C2B URLs (Code)

Create this edge function to register your C2B URLs with Safaricom:

```typescript
// supabase/functions/mpesa-c2b-register/index.ts

import 'jsr:@supabase/functions-js/edge-runtime.d.ts';

Deno.serve(async (req: Request) => {
  const MPESA_CONSUMER_KEY = Deno.env.get('MPESA_CONSUMER_KEY');
  const MPESA_CONSUMER_SECRET = Deno.env.get('MPESA_CONSUMER_SECRET');
  const MPESA_SHORTCODE = Deno.env.get('MPESA_SHORTCODE');
  const MPESA_ENVIRONMENT = Deno.env.get('MPESA_ENVIRONMENT');
  const supabaseUrl = Deno.env.get('SUPABASE_URL');

  // Get access token
  const authUrl = MPESA_ENVIRONMENT === 'production'
    ? 'https://api.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials'
    : 'https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials';

  const authString = btoa(`${MPESA_CONSUMER_KEY}:${MPESA_CONSUMER_SECRET}`);
  const authResponse = await fetch(authUrl, {
    headers: { 'Authorization': `Basic ${authString}` },
  });
  const { access_token } = await authResponse.json();

  // Register C2B URLs
  const registerUrl = MPESA_ENVIRONMENT === 'production'
    ? 'https://api.safaricom.co.ke/mpesa/c2b/v1/registerurl'
    : 'https://sandbox.safaricom.co.ke/mpesa/c2b/v1/registerurl';

  const response = await fetch(registerUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      ShortCode: MPESA_SHORTCODE,
      ResponseType: 'Completed',
      ConfirmationURL: `${supabaseUrl}/functions/v1/mpesa-c2b-confirmation`,
      ValidationURL: `${supabaseUrl}/functions/v1/mpesa-c2b-validation`,
    }),
  });

  const data = await response.json();
  return new Response(JSON.stringify(data), {
    headers: { 'Content-Type': 'application/json' },
  });
});
```

Run this function once to register your URLs:
```
curl -X POST https://[project-ref].supabase.co/functions/v1/mpesa-c2b-register \
  -H "Authorization: Bearer [your-anon-key]"
```

## Part 8: Monitoring Transactions

### View All M-Pesa Transactions

Query the `mpesa_transactions` table:

```sql
SELECT
  mpesa_receipt_number,
  amount,
  phone_number,
  customer_name,
  transaction_status,
  transaction_type,
  created_at
FROM mpesa_transactions
ORDER BY created_at DESC;
```

### View Pending Sales

```sql
SELECT
  receipt_number,
  total_amount,
  payment_method,
  payment_status,
  customer_name,
  created_at
FROM sales
WHERE payment_status = 'pending'
ORDER BY created_at DESC;
```

## Part 9: Troubleshooting

### STK Push not working

1. **Check credentials**: Verify all 6 environment variables are set
2. **Check callback URL**: Must be publicly accessible HTTPS
3. **Check phone format**: Should be 254XXXXXXXXX
4. **Check amount**: Must be integer, between 10-70000 for Till

### C2B not auto-completing sales

1. **Check receipt number**: Customer must use exact receipt number
2. **Check amount**: Must match sale amount (within KES 1)
3. **Check C2B registration**: URLs must be registered with Safaricom
4. **Check logs**: View Supabase function logs for errors

### Common Errors

**"Invalid Access Token"**
- Consumer Key/Secret incorrect
- Regenerate credentials in Daraja portal

**"Invalid Shortcode"**
- Use your Till Number directly (no prefixes)
- Verify it matches your M-Pesa account

**"Request failed"**
- Check internet connection
- Verify M-Pesa environment (sandbox vs production)

## Part 10: Security Best Practices

1. **Never expose credentials**: Always use environment variables
2. **Use HTTPS only**: M-Pesa requires secure callbacks
3. **Validate amounts**: Check that payment matches sale amount
4. **Log all transactions**: Keep audit trail in `mpesa_transactions`
5. **Handle duplicates**: Check for existing transactions before processing

## Quick Reference

### Your Callback URLs

```
STK Push Callback:
https://[project-ref].supabase.co/functions/v1/mpesa-callback

C2B Confirmation:
https://[project-ref].supabase.co/functions/v1/mpesa-c2b-confirmation

C2B Validation:
https://[project-ref].supabase.co/functions/v1/mpesa-c2b-validation
```

### Environment Variables

```
MPESA_CONSUMER_KEY=[from Daraja]
MPESA_CONSUMER_SECRET=[from Daraja]
MPESA_SHORTCODE=[Your Till Number]
MPESA_PASSKEY=[bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919]
MPESA_CALLBACK_URL=[Auto-configured]
MPESA_ENVIRONMENT=production
```

### Edge Functions to Deploy

```
- mpesa-stkpush (initiates payment)
- mpesa-callback (receives STK confirmation)
- mpesa-c2b-confirmation (receives C2B payment)
- mpesa-c2b-validation (validates C2B payment)
- mpesa-c2b-register (registers C2B URLs - run once)
```

## Support

- **Safaricom Daraja**: apisupport@safaricom.co.ke | 0711 051 000
- **Documentation**: https://developer.safaricom.co.ke/docs
