# M-Pesa Testing & Troubleshooting Guide

## Problem: "M-Pesa credentials not configured"

This error means one or more environment variables are not set in Supabase. Let's debug it.

## Step 1: Check Your Configuration

### Deploy the Test Function

First, deploy the test function:

```bash
# Using MCP tool or Supabase CLI
supabase functions deploy mpesa-test
```

### Check If Credentials Are Set

Call this endpoint to see which credentials are missing:

```bash
curl "https://[project-ref].supabase.co/functions/v1/mpesa-test?action=check-credentials" \
  -H "Authorization: Bearer [anon-key]"
```

**Expected Response**:
```json
{
  "message": "M-Pesa Configuration Status",
  "credentials": {
    "MPESA_CONSUMER_KEY": "SET (length: 30)",
    "MPESA_CONSUMER_SECRET": "SET (length: 20)",
    "MPESA_SHORTCODE": "SET (value: 174379)",
    "MPESA_PASSKEY": "SET (length: 64)",
    "MPESA_CALLBACK_URL": "NOT SET (will use default)",
    "MPESA_ENVIRONMENT": "sandbox",
    "SUPABASE_URL": "https://abcxyz123.supabase.co"
  },
  "allSet": true
}
```

### What to Look For:

- ❌ **"NOT SET"** - You need to add this secret in Supabase
- ✅ **"SET (length: X)"** - This secret is configured correctly

## Step 2: Fix Missing Credentials

If any show "NOT SET", go to Supabase Dashboard and add them:

### Path: Project Settings → Edge Functions → Secrets

**Important**:
- Secret names are **case-sensitive**
- Make sure there are **no extra spaces** before or after values
- Click **"Save"** or **"Add Secret"** after each one

### Required Secrets:

```
MPESA_CONSUMER_KEY
MPESA_CONSUMER_SECRET
MPESA_SHORTCODE
MPESA_PASSKEY
```

### Optional (but recommended):

```
MPESA_CALLBACK_URL
MPESA_ENVIRONMENT
```

## Step 3: Redeploy Functions After Adding Secrets

**IMPORTANT**: After adding secrets, you MUST redeploy your functions!

```bash
supabase functions deploy mpesa-stkpush
supabase functions deploy mpesa-callback
supabase functions deploy mpesa-c2b-confirmation
supabase functions deploy mpesa-c2b-register
```

### Why?

Edge functions cache environment variables. They won't see new secrets until redeployed.

## Testing C2B Confirmation Without STK Push

You want to test C2B auto-completion independently? Here's how:

### Method 1: Use the Test Function (Easiest)

After deploying `mpesa-test` function:

```bash
curl "https://[project-ref].supabase.co/functions/v1/mpesa-test?action=simulate-c2b&receipt=RCPT001234&amount=100&phone=254708374149" \
  -H "Authorization: Bearer [anon-key]"
```

**Parameters**:
- `receipt` - Receipt number of sale you created in POS
- `amount` - Amount to simulate
- `phone` - Test phone number

**What it does**:
1. Creates a fake M-Pesa C2B payload
2. Sends it to your C2B confirmation endpoint
3. Shows you the response

### Method 2: Manual Curl Test

Create a sale in POS first, then send this:

```bash
curl -X POST "https://[project-ref].supabase.co/functions/v1/mpesa-c2b-confirmation" \
  -H "Content-Type: application/json" \
  -d '{
    "TransactionType": "Pay Bill",
    "TransID": "TEST123456789",
    "TransTime": "20240116203045",
    "TransAmount": 100,
    "BusinessShortCode": "174379",
    "BillRefNumber": "RCPT001234",
    "InvoiceNumber": "",
    "OrgAccountBalance": "",
    "ThirdPartyTransID": "",
    "MSISDN": "254708374149",
    "FirstName": "Test",
    "MiddleName": "",
    "LastName": "Customer"
  }'
```

**Key Fields**:
- `BillRefNumber` - Must match your receipt number exactly
- `TransAmount` - Amount paid
- `TransID` - M-Pesa transaction ID (use any test value)
- `MSISDN` - Customer phone number

### Method 3: Test with Real M-Pesa (Sandbox)

1. **Set up sandbox credentials**:
```
MPESA_ENVIRONMENT=sandbox
MPESA_SHORTCODE=174379
MPESA_PASSKEY=bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919
```

2. **Register C2B URL** (run once):
```bash
curl -X POST "https://[project-ref].supabase.co/functions/v1/mpesa-c2b-register" \
  -H "Authorization: Bearer [anon-key]"
```

3. **Create a sale in POS** - Note the receipt number (e.g., RCPT001234)

4. **Use Safaricom's C2B simulation**:
```bash
curl -X POST "https://sandbox.safaricom.co.ke/mpesa/c2b/v1/simulate" \
  -H "Authorization: Bearer [access-token]" \
  -H "Content-Type: application/json" \
  -d '{
    "ShortCode": "174379",
    "CommandID": "CustomerPayBillOnline",
    "Amount": 100,
    "Msisdn": "254708374149",
    "BillRefNumber": "RCPT001234"
  }'
```

## Complete Testing Workflow

### 1. Create Sale in POS
- Open POS
- Add items
- Click checkout
- Note the receipt number (e.g., RCPT001234)
- Don't complete payment yet

### 2. Check Sale is Created
```sql
SELECT * FROM sales WHERE receipt_number = 'RCPT001234';
```

Should show:
- `payment_status` = 'pending'
- `payment_method` = 'M-Pesa'

### 3. Simulate C2B Payment
```bash
curl "https://[project-ref].supabase.co/functions/v1/mpesa-test?action=simulate-c2b&receipt=RCPT001234&amount=100&phone=254708374149" \
  -H "Authorization: Bearer [anon-key]"
```

### 4. Check Sale is Completed
```sql
SELECT * FROM sales WHERE receipt_number = 'RCPT001234';
```

Should now show:
- `payment_status` = 'completed'
- `mpesa_receipt_number` = 'TEST...'
- `customer_phone` = '254708374149'

### 5. Check M-Pesa Transaction Created
```sql
SELECT * FROM mpesa_transactions
WHERE bill_ref_number = 'RCPT001234';
```

## Common Issues & Fixes

### Issue 1: "M-Pesa credentials not configured"

**Cause**: Secrets not set in Supabase

**Fix**:
1. Check secrets: `curl ...mpesa-test?action=check-credentials`
2. Add missing secrets in Supabase Dashboard
3. Redeploy functions

### Issue 2: "Sale not found"

**Cause**: Receipt number doesn't match

**Fix**:
- Make sure `BillRefNumber` exactly matches receipt number
- Check sale exists: `SELECT * FROM sales WHERE receipt_number = 'RCPT001234'`
- Receipt numbers are case-sensitive

### Issue 3: Functions not seeing new secrets

**Cause**: Functions cache environment variables

**Fix**: Redeploy all functions after adding secrets

### Issue 4: C2B not auto-completing

**Cause**: C2B URL not registered with Safaricom

**Fix**:
```bash
curl -X POST "https://[project-ref].supabase.co/functions/v1/mpesa-c2b-register" \
  -H "Authorization: Bearer [anon-key]"
```

### Issue 5: "Invalid Access Token"

**Cause**: Wrong Consumer Key/Secret

**Fix**:
- Get fresh credentials from Daraja Portal
- Make sure using Production credentials (not Test App)
- Check no extra spaces in secrets

## Finding Your Values

### Project Reference
Look at your Supabase dashboard URL:
```
https://supabase.com/dashboard/project/abcxyz123
                                      ↑
                                This is your project-ref
```

### Anon Key
Go to: Project Settings → API → Project API keys → `anon` `public`

### Access Token (for direct Safaricom API calls)
```bash
curl -X GET "https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials" \
  -H "Authorization: Basic $(echo -n 'CONSUMER_KEY:CONSUMER_SECRET' | base64)"
```

## Quick Checklist

Before testing, verify:

- [ ] All 4 edge functions deployed
- [ ] All 6 secrets set in Supabase
- [ ] Database migration applied
- [ ] C2B URL registered (run once)
- [ ] Functions redeployed after adding secrets

## Test Commands Summary

**Check credentials**:
```bash
curl "https://[project-ref].supabase.co/functions/v1/mpesa-test?action=check-credentials" \
  -H "Authorization: Bearer [anon-key]"
```

**Simulate C2B**:
```bash
curl "https://[project-ref].supabase.co/functions/v1/mpesa-test?action=simulate-c2b&receipt=RCPT001234&amount=100&phone=254708374149" \
  -H "Authorization: Bearer [anon-key]"
```

**Check sales**:
```sql
SELECT * FROM sales ORDER BY created_at DESC LIMIT 10;
```

**Check M-Pesa transactions**:
```sql
SELECT * FROM mpesa_transactions ORDER BY created_at DESC LIMIT 10;
```

## Support

If still having issues:

1. **Check function logs**: Supabase Dashboard → Edge Functions → Logs
2. **Check database**: Look for error messages in sales/mpesa_transactions tables
3. **Safaricom Support**: apisupport@safaricom.co.ke | 0711 051 000

---

**Pro Tip**: Always test with the test function first before using real M-Pesa. It's faster and free!
