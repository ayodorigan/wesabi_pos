# Environment Setup - Quick Reference

## 🚀 Quick Commands

### Development (Default)
```bash
# Run development server with DEV database
npm run dev
```
Uses: `.env.development` → DEV Supabase database

### Production Preview (Testing)
```bash
# Run development server with PROD database (for testing)
npm run dev:prod
```
⚠️ WARNING: Uses PROD database - changes are REAL!

### Build for Production
```bash
# Build for production deployment
npm run build
```
Creates optimized build using `.env.production`

### Build for Development
```bash
# Build development version (for testing)
npm run build:dev
```

## 📋 File Structure

```
.env.development      → DEV database config (safe to test)
.env.production       → PROD database config (NEVER commit real secrets)
.env.local           → Your personal overrides (gitignored)
.env.local.template  → Template for local setup
```

## ✅ Safety Checks

### Before Each Session

1. **Check console on startup**
   - Green = Development ✓
   - Red = Production ⚠️

2. **Verify database**
   - Look at "Database:" line in console
   - Confirm it matches your intention

### Before Deployment

1. ✅ Tested in development
2. ✅ `.env.production` has correct PROD credentials
3. ✅ `.env.production` is NOT committed to Git
4. ✅ Run `npm run build` (uses production mode)
5. ✅ Deploy `dist/` folder

## 🔧 Common Tasks

### Switch to Different Database Locally

Create `.env.local`:
```bash
VITE_ENV=development
VITE_SUPABASE_URL=https://my-test-db.supabase.co
VITE_SUPABASE_ANON_KEY=my-test-key
```

### Enable Debug Logs in Production

In `.env.production` or deployment platform:
```bash
VITE_ENABLE_DEBUG_LOGS=true
```

### Test Production Config Locally

```bash
npm run dev:prod
```
⚠️ This connects to PRODUCTION database!

## 🆘 Troubleshooting

### Wrong Environment?

1. Check console output (colored box at startup)
2. Restart dev server: `Ctrl+C` then `npm run dev`
3. Clear browser cache

### Configuration Error?

1. Check file exists: `.env.development` or `.env.production`
2. Verify format (no quotes around values)
3. Ensure VITE_ENV matches file name

### Still Not Working?

1. Delete `node_modules/.vite` cache
2. Restart server
3. Check browser console for errors
4. Verify Supabase credentials in Supabase dashboard

## 📝 Environment Variables Priority

Highest to Lowest:
1. `.env.[mode].local` (e.g., `.env.development.local`)
2. `.env.[mode]` (e.g., `.env.development`)
3. `.env.local`
4. `.env`

## 🎯 Examples

### Development (Safe Testing)
```bash
npm run dev
# Console shows: "DEVELOPMENT" in green
# Safe to create test sales, modify inventory, etc.
```

### Production Build
```bash
npm run build
# Creates dist/ folder with production configuration
# Upload dist/ to hosting platform
```

### Preview Production Build
```bash
npm run build
npm run preview
# Runs built version locally for final testing
```

## 🔐 Security Reminders

- 🔒 Never commit `.env.production` with real credentials
- 🔒 Store production secrets in deployment platform (Vercel, Netlify, etc.)
- 🔒 Use separate Supabase projects for DEV and PROD
- 🔒 Double-check environment before making database changes
- 🔒 Regular backups of production database

## 📞 Need Help?

Check full documentation: [ENVIRONMENT_SETUP.md](./ENVIRONMENT_SETUP.md)
