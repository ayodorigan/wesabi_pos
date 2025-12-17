# 🏥 Wesabi Pharmacy POS - Environment Configuration

## 📚 Documentation Index

This application uses separate Development and Production environments for maximum safety and data integrity.

### Quick Links

1. **[ENVIRONMENT_QUICK_START.md](./ENVIRONMENT_QUICK_START.md)** ⭐ START HERE
   - Quick commands reference
   - Common tasks
   - Troubleshooting basics

2. **[ENVIRONMENT_SETUP.md](./ENVIRONMENT_SETUP.md)** 📖 DETAILED GUIDE
   - Complete setup instructions
   - Configuration reference
   - Security best practices
   - Deployment guide

3. **[ENVIRONMENT_IMPLEMENTATION_SUMMARY.md](./ENVIRONMENT_IMPLEMENTATION_SUMMARY.md)** 🔧 TECHNICAL DETAILS
   - Implementation overview
   - Architecture explanation
   - API reference

## 🚀 Quick Start (30 seconds)

### Development (Safe Testing)
```bash
npm run dev
```
✓ Uses DEV database
✓ Safe to test features
✓ Debug logs enabled

### Production Build (Deployment)
```bash
npm run build
```
⚠️ Uses PROD database
⚠️ Optimized for production
⚠️ Check environment first!

## 🔍 Environment Verification

On startup, check the browser console for:

**Development Mode (Green):**
```
╔════════════════════════════════════════════════════════════╗
║  🏥 WESABI PHARMACY POS - DEVELOPMENT                      ║
╚════════════════════════════════════════════════════════════╝
✓ Development Mode - Safe to test
```

**Production Mode (Red):**
```
╔════════════════════════════════════════════════════════════╗
║  🏥 WESABI PHARMACY POS - PRODUCTION                       ║
╚════════════════════════════════════════════════════════════╝
⚠️  PRODUCTION MODE - All changes will affect live data!
```

## 📁 File Structure

```
├── .env.development        # DEV database config
├── .env.production         # PROD database config (never commit secrets!)
├── .env.local             # Your personal overrides (optional)
└── src/config/
    └── environment.ts     # Configuration management
```

## ⚡ Common Commands

| Command | Environment | Purpose |
|---------|-------------|---------|
| `npm run dev` | Development | Start dev server with DEV database |
| `npm run dev:prod` | Production | Start dev server with PROD database ⚠️ |
| `npm run build` | Production | Build for production deployment |
| `npm run build:dev` | Development | Build development version |
| `npm run preview` | Development | Preview built version |

## 🛡️ Safety Features

- ✅ Separate databases for DEV and PROD
- ✅ Automatic environment detection
- ✅ Visual indicators (console colors)
- ✅ Production safeguards (prevents localhost)
- ✅ Configuration validation
- ✅ Clear error messages
- ✅ Git protection (secrets not committed)

## 🔐 Security Checklist

Before deployment:
- [ ] `.env.production` has correct PROD credentials
- [ ] `.env.production` is NOT in Git
- [ ] Tested in development first
- [ ] Verified console shows "PRODUCTION"
- [ ] Production Supabase project exists
- [ ] Database backups configured

## 🆘 Quick Troubleshooting

### Wrong database connected?
1. Check console output (colored box)
2. Verify `VITE_ENV` in your `.env.[mode]` file
3. Restart dev server

### Configuration error?
1. Check `.env.development` or `.env.production` exists
2. Verify Supabase credentials are correct
3. Ensure no placeholder values (like "your-")

### Still stuck?
See [ENVIRONMENT_SETUP.md](./ENVIRONMENT_SETUP.md) → Troubleshooting section

## 📖 Documentation Hierarchy

```
README_ENVIRONMENTS.md (You are here)
    ↓
ENVIRONMENT_QUICK_START.md (Commands & Quick Reference)
    ↓
ENVIRONMENT_SETUP.md (Detailed Setup & Configuration)
    ↓
ENVIRONMENT_IMPLEMENTATION_SUMMARY.md (Technical Architecture)
```

## 🎯 Next Steps

1. **First time setup?** → Read [ENVIRONMENT_QUICK_START.md](./ENVIRONMENT_QUICK_START.md)
2. **Need detailed info?** → Read [ENVIRONMENT_SETUP.md](./ENVIRONMENT_SETUP.md)
3. **Ready to deploy?** → Check deployment section in [ENVIRONMENT_SETUP.md](./ENVIRONMENT_SETUP.md)
4. **Want technical details?** → Read [ENVIRONMENT_IMPLEMENTATION_SUMMARY.md](./ENVIRONMENT_IMPLEMENTATION_SUMMARY.md)

---

**Remember:** Always check the console on startup to verify you're connected to the correct environment! 🎯
