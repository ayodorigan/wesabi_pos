# Supabase Setup Instructions for Wesabi Pharmacy

## 1. Database Migrations

Run the following migrations in order:

1. **Reset existing auth system:**
   ```sql
   -- Run: supabase/migrations/reset_auth_system.sql
   ```

2. **Create new auth system:**
   ```sql
   -- Run: supabase/migrations/create_auth_system.sql
   ```

## 2. Supabase Console Configuration

### Authentication Settings

1. **Go to Authentication > Settings**
   - Enable email confirmations: **DISABLED**
   - Enable email change confirmations: **DISABLED**
   - Enable phone confirmations: **DISABLED**
   - Minimum password length: **6**

2. **Go to Authentication > URL Configuration**
   - Site URL: `http://localhost:5173` (for development)
   - Redirect URLs: Add `http://localhost:5173/reset-password`

### Email Templates (Optional - for password reset)

1. **Go to Authentication > Email Templates**
2. **Configure "Reset Password" template:**
   ```html
   <h2>Reset your password</h2>
   <p>Follow this link to reset the password for your Wesabi Pharmacy account:</p>
   <p><a href="{{ .ConfirmationURL }}">Reset Password</a></p>
   ```

### SMTP Configuration (Required for password reset)

1. **Go to Settings > Auth**
2. **Configure SMTP settings:**
   - Enable custom SMTP
   - Add your SMTP provider details (Gmail, SendGrid, etc.)

## 3. Edge Functions Deployment

Deploy the password reset function:

```bash
supabase functions deploy reset-password
```

## 4. Environment Variables

Ensure your `.env` file contains:

```env
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

## 5. Testing the Authentication System

### Test Super Admin Creation

1. **Create first user (becomes super admin automatically):**
   - Go to Authentication > Users in Supabase dashboard
   - Click "Add user"
   - Email: `admin@wesabi.co.ke`
   - Password: `admin123`
   - Auto Confirm User: **YES**

2. **Verify super admin role:**
   - Check `user_profiles` table
   - First user should have `role = 'super_admin'`

### Test Login Flow

1. **Open the application**
2. **Login with super admin credentials:**
   - Email: `admin@wesabi.co.ke`
   - Password: `admin123`
3. **Verify access to all features**

### Test User Management

1. **Go to Settings page**
2. **Create different user types:**
   - Sales user (name + phone only)
   - Inventory user (name + phone only)
   - Stock take user (name + phone only)
   - Admin user (email + password required)

3. **Test role-based access:**
   - Login as different users
   - Verify menu items show/hide based on role
   - Test page access restrictions

### Test Password Reset (Super Admin Only)

1. **Login as super admin**
2. **Go to Settings > User Management**
3. **Click password reset icon for a user**
4. **Verify email is sent (check SMTP logs)**

## 6. Role-Based Access Control

### Super Admin
- Full access to everything
- Can create/manage all users
- Can reset passwords via email
- Can delete users and products

### Admin
- Access to all features except user deletion
- Can manage inventory, sales, analytics
- Can assign roles to users
- Cannot reset passwords

### Sales
- Access to: Inventory (add/edit), POS, Drug History
- Cannot delete products or manage pricing

### Inventory
- Access only to Inventory page
- Can add/edit items
- Cannot delete or set prices

### Stock Take
- Access only to Stock Take section
- Can perform stock counts

## 7. Security Features

### Row Level Security (RLS)
- All tables have RLS enabled
- Users can only access data based on their role
- Super admins can override all restrictions

### Secure Functions
- All functions use `SECURITY DEFINER`
- Clean search path to prevent injection
- Proper role checking before operations

### Password Reset Security
- Only super admins can trigger resets
- Uses service role key securely
- Validates permissions before sending emails

## 8. Troubleshooting

### Common Issues

1. **"User not found" error:**
   - Check if user profile was created in `user_profiles` table
   - Verify trigger is working: `handle_new_user()`

2. **Permission denied errors:**
   - Check RLS policies are correctly applied
   - Verify user role in `user_profiles` table
   - Check `get_user_role()` function returns correct role

3. **Password reset not working:**
   - Verify SMTP configuration
   - Check edge function is deployed
   - Ensure user has super admin role

4. **Menu items not showing:**
   - Check `canAccessPage()` function in AuthContext
   - Verify user role is correctly loaded

### Database Verification Queries

```sql
-- Check user profiles
SELECT * FROM user_profiles ORDER BY created_at;

-- Check RLS policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE schemaname = 'public';

-- Test role function
SELECT get_user_role('user-uuid-here');
```

## 9. Production Deployment

1. **Update environment variables for production**
2. **Configure production SMTP settings**
3. **Update redirect URLs in Supabase console**
4. **Test all functionality in production environment**
5. **Create initial super admin user**

This completes the authentication and authorization setup for Wesabi Pharmacy POS system.