# M-Pesa Integration Setup Guide for Till Numbers

This guide will help you set up M-Pesa STK Push payments for Wesabi Pharmacy POS system using a **Till Number**.

## Prerequisites

1. A Safaricom M-Pesa **Till Number** (Not Paybill)
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

## Step 3: Understanding Till Number Setup

### IMPORTANT: Till Number in Daraja Portal

When you check your app in the Daraja portal, you'll see **"Shortcode: N/A"**. This is **NORMAL** for Till Numbers!

**Your Till Number IS your Shortcode.**

For example:
- If your Till Number is **987654**, then use **987654** as your `MPESA_SHORTCODE`

### Getting Your Credentials

You need 4 things for Till Number setup:

1. ✅ **Consumer Key** - From your Daraja app (Step 2)
2. ✅ **Consumer Secret** - From your Daraja app (Step 2)
3. ✅ **Shortcode** - This is your Till Number (e.g., 987654)
4. ❓ **PassKey** - See below

### Getting the PassKey for Till Number

The PassKey is NOT shown in the Daraja portal. Here are 3 ways to get it:

#### Option 1: Use the Standard Till PassKey (Recommended - Try This First)

Most Till Numbers use this standard PassKey:
```
bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919
```

This is the same PassKey used for sandbox testing and works for most production Till Numbers.

#### Option 2: Contact Safaricom Support

If Option 1 doesn't work, contact Safaricom:
- **Email**: apisupport@safaricom.co.ke
- **Phone**: 0711 051 000
- **Request**: "I need the Lipa Na M-Pesa PassKey for my Till Number [YOUR_TILL_NUMBER] to integrate with Daraja API"

#### Option 3: Check M-Pesa Business Portal

1. Log in to https://org.ke.m-pesa.com
2. Go to "Organization Settings" → "API Settings"
3. Look for "Lipa Na M-Pesa PassKey"

## Step 4: Set Up Environment Variables in Supabase

1. Go to your Supabase project dashboard
2. Navigate to **Project Settings** → **Edge Functions** (or **Functions**)
3. Click on **Secrets** (or **Environment Variables**)
4. Add the following secrets one by one:

### Required Secrets for Till Number:

```
Secret Name: MPESA_CONSUMER_KEY
Value: [Your Consumer Key from Daraja - Production Credentials]

Secret Name: MPESA_CONSUMER_SECRET
Value: [Your Consumer Secret from Daraja - Production Credentials]

Secret Name: MPESA_SHORTCODE
Value: [Your Till Number, e.g., 987654]

Secret Name: MPESA_PASSKEY
Value: bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919

Secret Name: MPESA_CALLBACK_URL
Value: https://[your-project-ref].supabase.co/functions/v1/mpesa-callback

Secret Name: MPESA_ENVIRONMENT
Value: production
```

**Note**: Replace `[your-project-ref]` in the callback URL with your actual Supabase project reference. You can find this in your Supabase project URL.

## Step 5: Understanding the Callback URL

### What is a Callback URL?

A callback URL is where M-Pesa sends a confirmation after processing a payment. Think of it as:
- You send a payment request to M-Pesa
- Customer enters PIN on their phone
- M-Pesa processes the payment
- M-Pesa sends the result back to your callback URL

### Setting Up the Callback URL

The callback URL is **already handled automatically** by your Supabase Edge Function. You don't need to create it yourself!

Your callback URL format:
```
https://[your-project-ref].supabase.co/functions/v1/mpesa-callback
```

**Example**:
If your Supabase project URL is `https://abc123xyz.supabase.co`, then your callback URL is:
```
https://abc123xyz.supabase.co/functions/v1/mpesa-callback
```

### What the Callback Does

When M-Pesa sends payment confirmation to your callback URL:
1. The system receives the payment details
2. Records customer phone number
3. Records transaction reference
4. Updates payment status
5. Records transaction in database

**Note**: You'll need to create the `mpesa-callback` edge function to handle these confirmations (see below).

## Step 6: Test the Integration

### Testing with Real Till Number

1. Make sure all secrets are set in Supabase (Step 4)
2. Set `MPESA_ENVIRONMENT=production`
3. In your POS system, try a small transaction (e.g., KES 10)
4. Enter your own phone number
5. You should receive an STK Push prompt on your phone
6. Enter your M-Pesa PIN
7. Payment should be completed and received in your Till

### Testing Tips

- Start with very small amounts (KES 10)
- Use your own phone number first
- Check your Till balance to confirm payment received
- Check Supabase logs for any errors

## Step 7: Recording Customer Details from M-Pesa

To record customer details (phone number, name, etc.) from M-Pesa payments, you need to create a callback handler:

### Create M-Pesa Callback Edge Function

The callback function will automatically receive:
- Customer phone number
- Transaction amount
- M-Pesa receipt number
- Transaction timestamp

These details are automatically saved when the payment is completed.

## Important Notes

### Transaction Limits for Till Number
- **Minimum**: KES 10
- **Maximum**: KES 70,000 per transaction

### Phone Number Format
The system automatically formats phone numbers:
- `0712345678` → `254712345678`
- `712345678` → `254712345678`
- `254712345678` → `254712345678`

### Security
- Never share your Consumer Key, Consumer Secret, or PassKey
- Never commit credentials to code
- All credentials are stored securely in Supabase Secrets
- Credentials are automatically available to your Edge Functions

## Troubleshooting

### "M-Pesa credentials not configured"
**Solution**:
- Go to Supabase → Project Settings → Edge Functions → Secrets
- Verify all 6 secrets are added (MPESA_CONSUMER_KEY, MPESA_CONSUMER_SECRET, MPESA_SHORTCODE, MPESA_PASSKEY, MPESA_CALLBACK_URL, MPESA_ENVIRONMENT)
- Make sure there are no extra spaces in the values

### "Failed to get M-Pesa access token"
**Solution**:
- Verify your Consumer Key and Consumer Secret are correct
- Make sure you're using **Production Credentials**, not Test Credentials
- Check that your Daraja app has "Lipa Na M-Pesa Online" API enabled
- Try regenerating credentials in Daraja portal

### "Invalid Shortcode"
**Solution**:
- Use your Till Number directly (e.g., 987654)
- Don't add any prefixes or spaces
- Verify your Till Number is correct by checking your M-Pesa statement

### No STK Push received on phone
**Solution**:
- Verify phone number format is correct (254XXXXXXXXX)
- Make sure the phone number is registered for M-Pesa
- Check that the phone has network coverage
- Verify amount is between KES 10 and KES 70,000

### "Invalid Passkey"
**Solution**:
- First try the standard PassKey: `bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919`
- If that doesn't work, contact Safaricom support for your specific Till PassKey

## Quick Reference

### For Sandbox Testing (Development)
```
MPESA_CONSUMER_KEY=[From Daraja Test Credentials]
MPESA_CONSUMER_SECRET=[From Daraja Test Credentials]
MPESA_SHORTCODE=174379
MPESA_PASSKEY=bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919
MPESA_CALLBACK_URL=https://[project-ref].supabase.co/functions/v1/mpesa-callback
MPESA_ENVIRONMENT=sandbox
```

### For Production with Till Number
```
MPESA_CONSUMER_KEY=[From Daraja Production Credentials]
MPESA_CONSUMER_SECRET=[From Daraja Production Credentials]
MPESA_SHORTCODE=[Your Till Number]
MPESA_PASSKEY=bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919
MPESA_CALLBACK_URL=https://[project-ref].supabase.co/functions/v1/mpesa-callback
MPESA_ENVIRONMENT=production
```

## Support

### For M-Pesa Setup Issues:
- **Daraja Support**: https://developer.safaricom.co.ke/support
- **Email**: apisupport@safaricom.co.ke
- **Phone**: 0711 051 000

### For Application Issues:
- Check Supabase Edge Function logs in your project dashboard
- Verify all environment variables are set correctly
- Test with sandbox environment first before going live

## Next Steps

After successful setup:
1. Test thoroughly with small amounts
2. Train staff on handling M-Pesa payments
3. Monitor transactions in your Till statement
4. Keep your credentials secure
5. Regularly check Supabase logs for any errors
