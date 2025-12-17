# Environment Configuration Guide

## Overview

This application uses separate database configurations for Development and Production environments to ensure data safety and prevent accidental modifications to production data.

## 🔒 Critical Safety Features

1. **Environment Isolation**: DEV and PROD use completely separate Supabase databases
2. **Automatic Detection**: Environment is detected from `VITE_ENV` variable
3. **Production Safeguards**: Localhost databases cannot be used in production
4. **Clear Logging**: Environment and database info displayed on app startup
5. **Validation**: Configuration is validated before app initialization

## 📁 Environment Files

### File Structure

```
project-root/
├── .env.development        # Development configuration (can be committed as template)
├── .env.production         # Production configuration (NEVER commit with real secrets)
├── .env.local             # Local overrides (gitignored, optional)
└── .env.local.template    # Template for local setup
```

### Priority Order

Vite loads environment files in this order (later files override earlier ones):

1. `.env` (base, gitignored)
2. `.env.local` (local overrides, gitignored)
3. `.env.[mode]` (e.g., `.env.development`)
4. `.env.[mode].local` (e.g., `.env.development.local`, gitignored)

## 🚀 Quick Start

### For Development

1. **Copy the development template** (already configured):
   ```bash
   # The .env.development file is already set up with DEV credentials
   ```

2. **Run in development mode** (default):
   ```bash
   npm run dev
   ```
   - Uses `.env.development`
   - Points to DEV database
   - Enables debug logging
   - Safe to test features

### For Production

1. **Create production Supabase project**:
   - Go to https://supabase.com
   - Create a NEW project for production
   - Copy the URL and anon key

2. **Update `.env.production`**:
   ```bash
   VITE_ENV=production
   VITE_SUPABASE_URL=https://your-production-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-production-anon-key
   ```

3. **Build for production**:
   ```bash
   npm run build
   ```

4. **Deploy** (the built files will use production config when `VITE_ENV=production`)

## 🔧 Environment Variables

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_ENV` | Environment identifier | `development` or `production` |
| `VITE_SUPABASE_URL` | Supabase project URL | `https://xxxxx.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Supabase anonymous key | `eyJhbGc...` |

### Optional Variables

| Variable | Description | Default (DEV) | Default (PROD) |
|----------|-------------|---------------|----------------|
| `VITE_API_TIMEOUT` | API request timeout (ms) | `30000` | `15000` |
| `VITE_ENABLE_DEBUG_LOGS` | Enable console debug logs | `true` | `false` |
| `VITE_ENABLE_ANALYTICS` | Enable analytics tracking | `false` | `true` |
| `VITE_ENABLE_TEST_DATA` | Allow test data features | `true` | `false` |
| `VITE_STRICT_VALIDATION` | Strict input validation | `false` | `true` |
| `VITE_REQUIRE_CONFIRMATION_FOR_DELETES` | Require delete confirmation | `false` | `true` |
| `VITE_ENABLE_AUDIT_LOGGING` | Enable audit logging | `false` | `true` |

## 🛡️ Security Best Practices

### ✅ DO

- ✅ Use separate Supabase projects for DEV and PROD
- ✅ Keep `.env.production` out of version control (it's gitignored)
- ✅ Store production secrets in secure deployment platform (Vercel, Netlify, etc.)
- ✅ Verify environment on app startup (check console)
- ✅ Test thoroughly in DEV before deploying to PROD
- ✅ Use `.env.local` for personal local overrides

### ❌ DON'T

- ❌ Never commit production credentials to Git
- ❌ Never use production database in development
- ❌ Never use localhost database in production
- ❌ Don't share `.env.production` file in team chat
- ❌ Don't hardcode secrets in source code

## 🔍 Verifying Your Setup

### On Application Startup

Check the browser console for environment information:

**Development Mode:**
```
╔════════════════════════════════════════════════════════════╗
║  🏥 WESABI PHARMACY POS - DEVELOPMENT                      ║
╠════════════════════════════════════════════════════════════╣
║  Environment: development                                  ║
║  Database: wyvgddqlyyrdgrsnmvow                           ║
║  Debug Logs: Enabled                                       ║
║  Analytics: Disabled                                       ║
║  Strict Validation: Disabled                               ║
╚════════════════════════════════════════════════════════════╝
✓ Development Mode - Safe to test
```

**Production Mode:**
```
╔════════════════════════════════════════════════════════════╗
║  🏥 WESABI PHARMACY POS - PRODUCTION                       ║
╠════════════════════════════════════════════════════════════╣
║  Environment: production                                   ║
║  Database: your-prod-database                              ║
║  Debug Logs: Disabled                                      ║
║  Analytics: Enabled                                        ║
║  Strict Validation: Enabled                                ║
╚════════════════════════════════════════════════════════════╝
⚠️  PRODUCTION MODE - All changes will affect live data!
```

### Manual Verification

Open browser console and run:
```javascript
// Check current environment
console.log(import.meta.env.VITE_ENV);

// Check database URL (first part only, for safety)
console.log(import.meta.env.VITE_SUPABASE_URL.split('.')[0]);
```

## 🏗️ Architecture

### Configuration Flow

```
App Startup
    ↓
main.tsx loads environment.ts
    ↓
environment.ts reads VITE_ENV
    ↓
Loads appropriate .env.[mode] file
    ↓
Validates configuration
    ↓
Creates config object
    ↓
supabase.ts uses config
    ↓
Supabase client initialized
    ↓
App ready with correct database
```

### Configuration File (`src/config/environment.ts`)

Central configuration management:
- Reads environment variables
- Validates configuration
- Provides type-safe config access
- Logs environment info
- Prevents production misconfigurations

## 📝 Example Configurations

### Development (.env.development)

```bash
VITE_ENV=development
VITE_SUPABASE_URL=https://dev-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-dev-anon-key
VITE_ENABLE_DEBUG_LOGS=true
VITE_ENABLE_TEST_DATA=true
VITE_STRICT_VALIDATION=false
```

### Production (.env.production)

```bash
VITE_ENV=production
VITE_SUPABASE_URL=https://prod-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-prod-anon-key
VITE_ENABLE_DEBUG_LOGS=false
VITE_ENABLE_ANALYTICS=true
VITE_STRICT_VALIDATION=true
VITE_REQUIRE_CONFIRMATION_FOR_DELETES=true
VITE_ENABLE_AUDIT_LOGGING=true
```

### Local Override (.env.local)

```bash
# Override for local development
VITE_ENV=development
# Point to your personal dev database
VITE_SUPABASE_URL=https://my-local-test.supabase.co
VITE_SUPABASE_ANON_KEY=my-local-test-key
```

## 🚢 Deployment

### Vercel / Netlify

1. Set environment variables in deployment platform dashboard
2. Set `VITE_ENV=production`
3. Add production Supabase credentials
4. Deploy

### Manual Deployment

1. Update `.env.production` locally (don't commit)
2. Build: `npm run build`
3. Upload `dist/` folder to hosting
4. Ensure server uses production environment variables

## 🐛 Troubleshooting

### "Environment Configuration Error"

**Problem**: Missing or invalid environment variables

**Solution**:
1. Check `.env.[mode]` file exists
2. Verify all required variables are set
3. Ensure Supabase URL starts with `https://`
4. Restart development server

### "CRITICAL: Production environment cannot use localhost database"

**Problem**: Attempting to use local database in production

**Solution**:
1. Update `VITE_SUPABASE_URL` in `.env.production`
2. Use actual Supabase cloud URL
3. Never use localhost/127.0.0.1 in production

### Wrong Database Connected

**Problem**: App connects to wrong environment

**Solution**:
1. Check `VITE_ENV` value
2. Verify correct `.env.[mode]` file exists
3. Clear browser cache
4. Restart development server
5. Check console logs for environment info

## 📞 Support

For issues with environment configuration:

1. Check console logs on app startup
2. Verify `.env.[mode]` file format
3. Ensure Supabase project is active
4. Test Supabase credentials in Supabase dashboard

## 🔄 Migration from Old Setup

If you have an existing `.env` file:

1. **Backup** your current `.env`:
   ```bash
   cp .env .env.backup
   ```

2. **Copy to development**:
   ```bash
   cp .env .env.development
   ```

3. **Update** `.env.development`:
   ```bash
   echo "VITE_ENV=development" >> .env.development
   ```

4. **Test**: Run `npm run dev` and check console logs

5. **Create production**: Use `.env.production` template

## ✅ Final Checklist

- [ ] `.env.development` configured with DEV database
- [ ] `.env.production` configured with PROD database
- [ ] `.env.production` is in `.gitignore`
- [ ] Both databases are separate Supabase projects
- [ ] Environment logs correctly on app startup
- [ ] Tested in development mode
- [ ] Production credentials secured
- [ ] Team members briefed on setup
