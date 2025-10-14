# M-Pesa Integration Setup Guide

This guide will help you set up M-Pesa STK Push payments for Wesabi Pharmacy POS system.

## Prerequisites

1. A Safaricom M-Pesa Paybill or Till Number
2. Access to Safaricom Daraja API Portal (https://developer.safaricom.co.ke)
3. Supabase account with your project set up

## Step 1: Create Daraja API Account

1. Go to https://developer.safaricom.co.ke
2. Click "Sign Up" and create an account
3. Verify your email address
4. Log in to your account

## Step 2: Create an App on Daraja

1. Once logged in, go to "My Apps"
2. Click "Add a New App"
3. Fill in the required details:
   - **App Name**: Wesabi Pharmacy POS
   - **Description**: POS system for pharmacy sales
4. Select the following APIs:
   - **Lipa Na M-Pesa Online (STK Push)** - Required for payments
5. Click "Create App"
6. You'll receive:
   - **Consumer Key**
   - **Consumer Secret**

## Step 3: Get Your M-Pesa Credentials

### For Sandbox Testing (Development)

1. In Daraja portal, go to your app
2. Under "Test Credentials", you'll find:
   - **Consumer Key** (Sandbox)
   - **Consumer Secret** (Sandbox)
   - **Test Shortcode**: 174379
   - **Passkey**: Available in Lipa Na M-Pesa Online documentation

### For Production (Live)

1. Apply for Go-Live approval in Daraja portal
2. Once approved, you'll receive production credentials
3. You'll use your actual **Paybill Number** or **Till Number** as the shortcode
4. You'll receive a production **Passkey** from Safaricom

## Step 4: Set Up Environment Variables in Supabase

1. Go to your Supabase project dashboard
2. Navigate to **Project Settings** → **Edge Functions** → **Secrets**
3. Add the following secrets:

### Required Secrets:

```
MPESA_CONSUMER_KEY=your_consumer_key_here
MPESA_CONSUMER_SECRET=your_consumer_secret_here
MPESA_SHORTCODE=your_paybill_or_till_number
MPESA_PASSKEY=your_passkey_here
MPESA_CALLBACK_URL=https://your-project.supabase.co/functions/v1/mpesa-callback
MPESA_ENVIRONMENT=sandbox
```

### For Paybill Setup:
- Use your Paybill Business Number as `MPESA_SHORTCODE`
- TransactionType is already set to `CustomerPayBillOnline`

### For Till Number Setup:
- Use your Till Number as `MPESA_SHORTCODE`
- TransactionType is already set to `CustomerPayBillOnline` (works for both)

### Environment Setting:
- Use `sandbox` for testing
- Use `production` for live transactions

## Step 5: Test the Integration

### Sandbox Testing

1. Set `MPESA_ENVIRONMENT=sandbox`
2. Use Safaricom's test credentials
3. Test phone numbers (provided by Safaricom):
   - 254708374149
   - 254729876543
4. Test transactions in the POS system

### Production Testing

1. Set `MPESA_ENVIRONMENT=production`
2. Use your production credentials
3. Test with a real phone number and small amount (e.g., KES 1)
4. Verify the payment is received in your Paybill/Till

## Important Notes

### Callback URL
The callback URL is where M-Pesa will send payment confirmation. The edge function is already deployed at:
```
https://your-project-ref.supabase.co/functions/v1/mpesa-callback
```

Replace `your-project-ref` with your actual Supabase project reference.

### Security
- Never commit M-Pesa credentials to version control
- Use Supabase Secrets for all credentials
- Credentials are automatically available to Edge Functions

### Transaction Limits
- **Sandbox**: No real money is transferred
- **Production Paybill**:
  - Minimum: KES 10
  - Maximum: KES 150,000
- **Production Till**:
  - Minimum: KES 10
  - Maximum: KES 70,000

### Phone Number Format
The system automatically formats phone numbers:
- `0712345678` → `254712345678`
- `712345678` → `254712345678`
- `254712345678` → `254712345678`

## Troubleshooting

### "M-Pesa credentials not configured"
- Check that all required secrets are set in Supabase
- Verify secret names match exactly (case-sensitive)

### "Failed to get M-Pesa access token"
- Verify Consumer Key and Secret are correct
- Check that the app has STK Push API enabled
- Ensure you're using the correct environment (sandbox/production)

### "Invalid Access Token"
- Consumer Key/Secret might be incorrect
- Try regenerating credentials in Daraja portal

### "The service request is processed successfully"
- Payment initiated successfully
- User should check their phone for M-Pesa prompt
- If no prompt appears, verify phone number is correct

## Support

For M-Pesa specific issues:
- Safaricom Daraja Support: https://developer.safaricom.co.ke/support
- Email: apisupport@safaricom.co.ke

For application issues:
- Check Supabase Edge Function logs
- Verify all environment variables are set correctly
