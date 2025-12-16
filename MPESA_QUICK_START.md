# M-Pesa Quick Start Guide

## 1. Where to Set M-Pesa Configuration

### Location: Supabase Dashboard

**Path**: `Project Settings` → `Edge Functions` → `Secrets`

### Required Secrets (6 total):

```
Name: MPESA_CONSUMER_KEY
Value: [Get from https://developer.safaricom.co.ke]

Name: MPESA_CONSUMER_SECRET
Value: [Get from https://developer.safaricom.co.ke]

Name: MPESA_SHORTCODE
Value: [Your Till Number, e.g., 123456]

Name: MPESA_PASSKEY
Value: bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919

Name: MPESA_CALLBACK_URL
Value: https://[project-ref].supabase.co/functions/v1/mpesa-callback

Name: MPESA_ENVIRONMENT
Value: production
```

**Note**: Replace `[project-ref]` with your actual Supabase project reference

## 2. Your Callback URLs

Once deployed, your M-Pesa callback URLs are:

### STK Push Callback
```
https://[project-ref].supabase.co/functions/v1/mpesa-callback
```
Receives confirmation after customer enters PIN

### C2B Confirmation (Auto-complete sales)
```
https://[project-ref].supabase.co/functions/v1/mpesa-c2b-confirmation
```
Auto-completes sales when customer sends money directly

## 3. Deploy Edge Functions

Deploy these 4 functions to Supabase:

```
1. mpesa-stkpush          (Push payment to customer phone)
2. mpesa-callback         (Receive STK push confirmation)
3. mpesa-c2b-confirmation (Receive direct payments)
4. mpesa-c2b-register     (Register C2B URL - run once)
```

## 4. Register C2B URL (One-time setup)

After deploying functions, run this once:

```bash
curl -X POST https://[project-ref].supabase.co/functions/v1/mpesa-c2b-register \
  -H "Authorization: Bearer [your-anon-key]" \
  -H "Content-Type: application/json"
```

This tells Safaricom where to send payment confirmations.

## 5. How It Works

### STK Push Flow:
1. User clicks "Pay with M-Pesa" in POS
2. Customer receives STK push on phone
3. Customer enters PIN
4. System receives confirmation via callback
5. Sale auto-completes

### C2B Flow (Customer initiates):
1. Create sale in POS (generates receipt number)
2. Customer opens M-Pesa app
3. Customer selects "Lipa Na M-Pesa" → "Buy Goods"
4. Customer enters your Till Number
5. **Account Number**: Receipt number from POS
6. Customer enters amount and PIN
7. System receives confirmation
8. Sale auto-completes

## 6. Testing

### Test in Sandbox (Free):
```
MPESA_ENVIRONMENT=sandbox
MPESA_SHORTCODE=174379
Test Phone: 254708374149
```

### Test in Production:
```
MPESA_ENVIRONMENT=production
MPESA_SHORTCODE=[Your real Till Number]
Test with small amount (KES 10)
```

## 7. Finding Your Project Reference

Your project reference is in your Supabase URL:

```
https://abcxyz123.supabase.co
         ↑
    Project Reference
```

Your callback URLs will be:
```
https://abcxyz123.supabase.co/functions/v1/mpesa-callback
https://abcxyz123.supabase.co/functions/v1/mpesa-c2b-confirmation
```

## 8. Database Migration

Run this migration to create M-Pesa tables:

```
supabase/migrations/20251016203000_mpesa_transactions_table.sql
```

It creates:
- `mpesa_transactions` table (stores all M-Pesa payments)
- Updates `sales` table (adds checkout_request_id, payment_status)
- Adds indexes for fast lookups

## 9. Monitoring

### View M-Pesa Transactions:
```sql
SELECT * FROM mpesa_transactions
ORDER BY created_at DESC
LIMIT 50;
```

### View Pending Sales:
```sql
SELECT * FROM sales
WHERE payment_status = 'pending'
ORDER BY created_at DESC;
```

## 10. Troubleshooting

### "M-Pesa credentials not configured"
→ Check all 6 secrets are set in Supabase

### "Invalid Access Token"
→ Check Consumer Key and Secret are correct

### "Invalid Shortcode"
→ Use your Till Number directly (no spaces/prefixes)

### STK Push not received
→ Check phone number format (254XXXXXXXXX)

### C2B not auto-completing
→ Customer must use exact receipt number as account number

## Support

**Safaricom Daraja**: apisupport@safaricom.co.ke | 0711 051 000

**Full Documentation**: See `MPESA_COMPLETE_SETUP.md` for detailed guide

## Quick Checklist

- [ ] Add 6 secrets to Supabase
- [ ] Deploy 5 edge functions
- [ ] Run database migration
- [ ] Register C2B URLs (run once)
- [ ] Test with sandbox credentials
- [ ] Test with production credentials
- [ ] Monitor transactions in database

That's it! Your M-Pesa integration is complete.
