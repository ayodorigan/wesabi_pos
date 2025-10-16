# Where to Add M-Pesa Payment Configurations

## Quick Answer

M-Pesa configurations are added in **Supabase Dashboard** as **Environment Secrets/Variables**.

## Step-by-Step Instructions

### 1. Open Your Supabase Dashboard
- Go to https://supabase.com
- Log in to your account
- Select your Wesabi Pharmacy project

### 2. Navigate to Secrets/Environment Variables

**Path**: `Project Settings` → `Edge Functions` → `Secrets`

Or alternatively:
- Click on the project name in the top left
- Click "Project Settings" (gear icon) in the left sidebar
- Scroll down to find "Edge Functions" section
- Click on "Secrets" or "Environment Variables"

### 3. Add M-Pesa Secrets

Click "Add Secret" or "New Secret" and add each of the following:

#### Secret 1: Consumer Key
```
Name: MPESA_CONSUMER_KEY
Value: [Your Consumer Key from Daraja Portal]
```

#### Secret 2: Consumer Secret
```
Name: MPESA_CONSUMER_SECRET
Value: [Your Consumer Secret from Daraja Portal]
```

#### Secret 3: Shortcode (Till Number)
```
Name: MPESA_SHORTCODE
Value: [Your Till Number, e.g., 123456]
```

#### Secret 4: PassKey
```
Name: MPESA_PASSKEY
Value: bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919
```
*Note: This is the standard Till Number PassKey. If it doesn't work, contact Safaricom support.*

#### Secret 5: Callback URL
```
Name: MPESA_CALLBACK_URL
Value: https://[your-project-ref].supabase.co/functions/v1/mpesa-callback
```
*Replace `[your-project-ref]` with your actual Supabase project reference ID*

#### Secret 6: Environment
```
Name: MPESA_ENVIRONMENT
Value: production
```
*Use "sandbox" for testing, "production" for live transactions*

### 4. Finding Your Supabase Project Reference

Your project reference ID is in your Supabase project URL:
```
https://[PROJECT-REF].supabase.co
```

For example, if your URL is:
```
https://abc123xyz.supabase.co
```

Then your callback URL would be:
```
https://abc123xyz.supabase.co/functions/v1/mpesa-callback
```

### 5. Save and Deploy

- After adding all 6 secrets, they are automatically available to your Edge Functions
- No need to restart or redeploy
- The M-Pesa integration will immediately use these credentials

## Verification

To verify your configuration is working:

1. Go to the POS system
2. Try to complete a sale with M-Pesa payment
3. Enter a test phone number (your own)
4. You should receive an STK Push prompt on your phone
5. Enter your M-Pesa PIN to complete the transaction

## Troubleshooting

### "M-Pesa credentials not configured"
- Check that all 6 secrets are added in Supabase
- Verify the secret names match exactly (they are case-sensitive)
- Make sure there are no extra spaces in the values

### "Failed to get M-Pesa access token"
- Verify your Consumer Key and Secret are correct
- Check that you're using Production credentials (not Test credentials)
- Ensure your Daraja app has "Lipa Na M-Pesa Online" API enabled

### No STK Push received
- Verify the phone number format is correct (254XXXXXXXXX)
- Check that the phone number is registered for M-Pesa
- Ensure the amount is between KES 10 and KES 70,000

## Important Notes

1. **Never commit credentials to code**: All M-Pesa credentials must only be stored in Supabase Secrets
2. **Security**: Secrets are encrypted and only accessible to your Edge Functions
3. **No code changes needed**: Once secrets are added, the application will automatically use them
4. **Till Number is your Shortcode**: Don't add any prefix or suffix to your Till Number

## Need Help?

- Full setup guide: See `MPESA_SETUP.md` in the project root
- Safaricom Support: apisupport@safaricom.co.ke or call 0711 051 000
- Supabase Support: https://supabase.com/dashboard/support

## Summary

**Location**: Supabase Dashboard → Project Settings → Edge Functions → Secrets

**Required Secrets** (6 total):
1. MPESA_CONSUMER_KEY
2. MPESA_CONSUMER_SECRET
3. MPESA_SHORTCODE
4. MPESA_PASSKEY
5. MPESA_CALLBACK_URL
6. MPESA_ENVIRONMENT

That's it! Once these 6 secrets are added in your Supabase Dashboard, M-Pesa payments will work in your POS system.
