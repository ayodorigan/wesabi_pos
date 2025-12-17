# Production Database Setup Guide for Bolt

## 🔧 Configuring Production on Bolt

### Current Setup Status

✅ Development environment configured (`.env.development`)
✅ Configuration system ready (`src/config/environment.ts`)
✅ Production template created (`.env.production`)
⏳ Production database needs to be created and configured

## 📝 Step-by-Step Production Setup

### 1. Create Production Supabase Project

1. Visit https://supabase.com/dashboard
2. Click "New Project"
3. Name it: `wesabi-pharmacy-production`
4. Set strong database password
5. Choose region closest to your users
6. Wait for project creation (1-2 minutes)

### 2. Get Production Credentials

From your new production project dashboard:

**Settings → API:**
- Copy **Project URL**: `https://xxxxx.supabase.co`
- Copy **anon public** key: `eyJhbGc...`

### 3. Apply Database Migrations to Production

Your production database needs the same schema as development.

#### Option A: SQL Editor (Quick Method)

1. Go to **SQL Editor** in production project
2. Copy and run these migrations **in order**:

```sql
-- Run each file from supabase/migrations/ in order
-- Start with: 20250912110508_damp_voice.sql
-- Then: 20250912111717_heavy_surf.sql
-- Continue in chronological order...
```

#### Option B: Supabase CLI (Recommended)

```bash
# Install CLI if not already installed
npm install -g supabase

# Login to Supabase
supabase login

# Link to your production project
supabase link --project-ref your-prod-project-ref

# Push all migrations to production
supabase db push
```

**Find your project ref:**
- In Supabase dashboard → Settings → General
- Or from your project URL: `https://[this-is-your-ref].supabase.co`

### 4. Update Production Environment File

Update `.env.production` with your production credentials:

```bash
# Production Environment Configuration
VITE_ENV=production

# Production Supabase Configuration (REPLACE WITH YOUR VALUES)
VITE_SUPABASE_URL=https://your-production-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-production-anon-key-here

# Production settings
VITE_API_TIMEOUT=15000
VITE_ENABLE_DEBUG_LOGS=false
VITE_ENABLE_ANALYTICS=true
VITE_ENABLE_TEST_DATA=false
VITE_STRICT_VALIDATION=true
VITE_REQUIRE_CONFIRMATION_FOR_DELETES=true
VITE_ENABLE_AUDIT_LOGGING=true
```

### 5. Test Production Configuration Locally

Before deploying, test your production config locally:

```bash
# This will connect to PRODUCTION database
npm run dev:prod
```

**Check the console:**
```
╔════════════════════════════════════════════════════════════╗
║  🏥 WESABI PHARMACY POS - PRODUCTION                       ║
╠════════════════════════════════════════════════════════════╣
║  Environment: production                                   ║
║  Database: your-production-project                         ║
╚════════════════════════════════════════════════════════════╝
⚠️  PRODUCTION MODE - All changes will affect live data!
🔒 Production database connection initialized
```

**⚠️ WARNING:** When running `npm run dev:prod`, you're connected to the PRODUCTION database. Any changes you make are REAL!

### 6. Create Initial Production Admin User

Your production database is empty. Create an admin user:

**Using SQL Editor in Production Supabase:**

```sql
-- Insert your first admin user
INSERT INTO users (email, name, role, password_hash, is_active)
VALUES (
  'admin@yourpharmacy.com',
  'Admin User',
  'super_admin',
  -- Use a proper password hash in production
  -- For now, you'll need to set password through the app or create via auth
  crypt('your-secure-password', gen_salt('bf')),
  true
);
```

**Or create through the app:**
1. Run `npm run dev:prod` (connects to production)
2. Go to login screen
3. If your app has a registration flow, register the first admin
4. Then promote to super_admin in SQL Editor

### 7. Build for Production

```bash
# Build production bundle
npm run build
```

This creates an optimized build in `dist/` folder configured for production.

### 8. Deploy on Bolt

Bolt automatically handles deployment. Your built application will use the production database when deployed.

**Verify deployment:**
1. Open your deployed Bolt app
2. Check browser console (F12)
3. Look for the environment banner
4. Should show: "PRODUCTION" in red

## 🔐 Security Checklist

Before going live:

- [ ] Production Supabase project created
- [ ] All migrations applied to production database
- [ ] `.env.production` updated with production credentials
- [ ] Row Level Security (RLS) policies verified in production
- [ ] Initial admin user created
- [ ] Tested locally with `npm run dev:prod`
- [ ] Production build successful (`npm run build`)
- [ ] Environment logs show "PRODUCTION" when deployed
- [ ] Production credentials stored securely (not committed to Git)

## 🔄 Database Management

### Keeping Databases in Sync

When you add new features or migrations:

1. **Test in Development First**
   ```bash
   npm run dev
   # Test thoroughly
   ```

2. **Apply Migration to Production**
   ```bash
   # Using SQL Editor or CLI
   supabase db push --db-url your-production-connection-string
   ```

3. **Verify Production**
   ```bash
   npm run dev:prod
   # Verify migration worked
   ```

### Backup Strategy

**Automatic Backups:**
- Supabase automatically backs up your database
- Free tier: Daily backups (7-day retention)
- Pro tier: Point-in-time recovery

**Manual Backups:**
```bash
# Using Supabase CLI
supabase db dump -f backup.sql --db-url your-production-connection-string
```

## 🚨 Important Notes

### ⚠️ Data Safety

- **NEVER** test destructive operations on production
- **ALWAYS** test new features in development first
- **BACKUP** before major changes
- **VERIFY** environment indicator before making changes

### 🔍 Monitoring Production

**Check Application Logs:**
- Supabase Dashboard → Logs
- Monitor for errors or unusual activity

**Database Usage:**
- Supabase Dashboard → Database → Usage
- Monitor size, connections, performance

**API Usage:**
- Supabase Dashboard → API → Logs
- Monitor request patterns

## 🆘 Troubleshooting

### "Supabase configuration is required" Error

**Cause:** `.env.production` not properly configured

**Fix:**
1. Verify `.env.production` exists
2. Check `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are set
3. Remove any placeholder values (no "your-" in values)
4. Restart build: `npm run build`

### "CRITICAL: Production environment cannot use localhost database!"

**Cause:** Production URL points to localhost

**Fix:**
1. Update `VITE_SUPABASE_URL` in `.env.production`
2. Use actual Supabase cloud URL: `https://xxxxx.supabase.co`

### Wrong Database Connected

**Verify which database you're connected to:**

1. Check console on app startup
2. Look for environment banner (green = dev, red = prod)
3. Check "Database:" line shows correct project identifier

### Migrations Missing in Production

**Symptoms:** Features work in dev but not in production

**Fix:**
```bash
# List applied migrations in production
supabase migrations list --db-url your-prod-connection-string

# Apply missing migrations
supabase db push --db-url your-prod-connection-string
```

## 📊 Production vs Development

| Aspect | Development | Production |
|--------|-------------|------------|
| **Database** | Test Supabase project | Production Supabase project |
| **Data** | Test data, safe to delete | Real data, CRITICAL |
| **Command** | `npm run dev` | `npm run build` → Deploy |
| **Debug Logs** | Enabled | Disabled |
| **Test Features** | Enabled | Disabled |
| **Validation** | Relaxed | Strict |
| **Console Color** | 🟢 Green | 🔴 Red |

## ✅ Final Verification

After setup, verify everything works:

1. **Local Production Test**
   ```bash
   npm run dev:prod
   ```
   - Check console shows "PRODUCTION"
   - Test login with admin user
   - Verify database connection

2. **Production Build**
   ```bash
   npm run build
   ```
   - Build should complete without errors
   - Check `dist/` folder is created

3. **Deployed App**
   - Open deployed Bolt app
   - Check console (F12)
   - Verify "PRODUCTION" banner
   - Test core functionality

## 🎉 You're Ready!

Your pharmacy POS system now has:
- ✅ Separate development and production databases
- ✅ Safe testing environment (development)
- ✅ Production-ready deployment
- ✅ Clear environment indicators
- ✅ Data protection safeguards

**Remember:**
- 🟢 Green console = Safe to test
- 🔴 Red console = Be careful, production data!

---

For more details, see:
- [ENVIRONMENT_SETUP.md](./ENVIRONMENT_SETUP.md) - Complete configuration guide
- [ENVIRONMENT_QUICK_START.md](./ENVIRONMENT_QUICK_START.md) - Quick commands
- [README_ENVIRONMENTS.md](./README_ENVIRONMENTS.md) - Overview
