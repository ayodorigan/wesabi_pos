# Security Configuration Guide

This guide covers important security configurations for the Wesabi Pharmacy application.

## Database Security Fixes Applied

### 1. Function Search Path Security ✅ FIXED

**Issue**: Database functions with `SECURITY DEFINER` had mutable search paths, which could allow malicious users to inject schemas and execute unauthorized code.

**Fix Applied**: All security-definer functions now have a fixed `search_path = public` to prevent search path injection attacks.

**Functions Fixed**:
- `add_drug_to_registry`
- `trigger_add_drug_from_products`
- `trigger_add_drug_from_invoice_items`
- `trigger_add_drug_from_supplier_order_items`
- `generate_invoice_number`
- `generate_order_number`
- `get_all_users`
- `check_if_users_exist`
- `get_users_with_emails`

### 2. Database Indexes ✅ OPTIMIZED

**Decision**: All indexes have been kept as they provide value for query performance.

**Why Indexes Are Important**:

1. **Foreign Key Indexes** - Improve JOIN performance and CASCADE operations:
   - `idx_invoice_items_product_id`
   - `idx_sale_items_product_id`
   - `idx_stock_takes_product_id`
   - `idx_credit_note_items_product_id`
   - And others...

2. **User ID Indexes** - Essential for filtering data by user (RLS policies):
   - `idx_invoices_user_id`
   - `idx_credit_notes_user_id`
   - `idx_stock_takes_user_id`
   - And others...

3. **Lookup Indexes** - Improve search and filtering:
   - `idx_supplier_orders_order_number`
   - `idx_drug_registry_name`
   - `idx_drug_registry_usage_count`
   - And others...

**Note**: Indexes may appear "unused" in a new database but become critical as data volume grows.

## Required Manual Configuration

### 3. Leaked Password Protection ⚠️ REQUIRES MANUAL SETUP

Supabase Auth can prevent users from using compromised passwords by checking against the HaveIBeenPwned.org database.

**To Enable This Feature**:

1. Go to your Supabase Dashboard: https://app.supabase.com
2. Select your project
3. Navigate to **Authentication** → **Policies**
4. Find **"Password Protection"** section
5. Enable **"Check for breached passwords"**

**What This Does**:
- Checks new passwords against HaveIBeenPwned.org database
- Prevents users from setting passwords that have been exposed in data breaches
- Improves overall account security

**Recommendation**: Enable this immediately to prevent users from choosing compromised passwords.

## Additional Security Best Practices

### Row Level Security (RLS)

All tables have RLS enabled with appropriate policies:
- Users can only access their own data
- Authentication is required for all operations
- Admin users have elevated permissions

### API Keys

- Use environment variables for all API keys
- Never commit `.env` files to version control
- Rotate API keys periodically
- Use different keys for development and production

### HTTPS

- Always use HTTPS in production
- Supabase provides HTTPS by default
- Never transmit sensitive data over HTTP

### Password Requirements

Current requirements:
- Minimum 6 characters (Supabase default)
- Consider enforcing stronger requirements in production:
  - Minimum 12 characters
  - Mix of uppercase, lowercase, numbers, and symbols
  - Regular password rotation for admin accounts

### Audit Logging

The application includes comprehensive audit logging:
- All user actions are logged in `activity_logs` table
- Includes user ID, action type, and timestamp
- Review logs regularly for suspicious activity

### Data Backup

**Recommended Backup Strategy**:
1. Enable daily automatic backups in Supabase Dashboard
2. Test restore procedures regularly
3. Keep backups for at least 30 days
4. Store critical backups off-site

### Multi-Factor Authentication (MFA)

Consider implementing MFA for:
- Admin accounts
- Super admin accounts
- Users accessing sensitive data

Supabase supports TOTP-based MFA which can be enabled in the Auth settings.

### Rate Limiting

Implement rate limiting for:
- Login attempts (prevent brute force)
- Password reset requests
- API endpoints

Configure in Supabase Dashboard under **Authentication** → **Rate Limits**.

## Security Checklist

- [x] Function search paths fixed
- [x] Database indexes optimized
- [x] Row Level Security enabled on all tables
- [x] API keys stored in environment variables
- [ ] Password breach protection enabled (manual setup required)
- [ ] HTTPS configured for production
- [ ] Regular security audits scheduled
- [ ] Backup and restore procedures tested
- [ ] MFA enabled for admin accounts
- [ ] Rate limiting configured

## Monitoring

Monitor these metrics regularly:
- Failed login attempts
- Unusual data access patterns
- Database performance metrics
- API error rates
- Unauthorized access attempts

## Incident Response

In case of a security incident:
1. Immediately rotate all API keys
2. Review activity logs for affected period
3. Notify affected users if data was compromised
4. Document the incident and response
5. Update security measures to prevent recurrence

## Updates

Keep the following updated:
- Supabase client libraries
- Database extensions
- Application dependencies
- Node.js and npm packages

Run `npm audit` regularly to check for vulnerabilities.

## Support

For security concerns:
- Supabase Security: https://supabase.com/docs/guides/platform/security
- Report vulnerabilities through appropriate channels
- Keep security configurations up to date

---

Last Updated: 2025-12-18
