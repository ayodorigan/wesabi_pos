# Production Database Setup Guide for Bolt

## 🎯 What You'll Accomplish

By the end of this guide, you will have:
- A separate production Supabase database
- Your Bolt app configured to use production database when deployed
- The ability to test safely in development without affecting production

---

## 📋 COMPLETE STEP-BY-STEP GUIDE

### STEP 1: Create Production Supabase Project (5 minutes)

**1.1** Open your web browser and go to:
```
https://supabase.com/dashboard
```

**1.2** Sign in with your Supabase account

**1.3** Click the **green "New Project"** button (top right)

**1.4** Fill in the project details:
- **Name**: `wesabi-pharmacy-production`
- **Database Password**: Click **"Generate a password"** button
  - **CRITICAL**: Copy this password and save it somewhere safe (you'll need it later)
  - Or create your own strong password (16+ characters, mix of letters, numbers, symbols)
- **Region**: Choose the region closest to where your users are located
  - Example: US East if users are in USA, Europe West if users are in Europe
- **Pricing Plan**: Select your plan (Free tier is fine to start)

**1.5** Click **"Create new project"** button at the bottom

**1.6** Wait for project creation (takes 1-2 minutes)
- You'll see a loading screen with a progress bar
- Don't close the browser tab
- When done, you'll see your project dashboard

---

### STEP 2: Copy Production Database Credentials (3 minutes)

Now you need to get two pieces of information from your new production project.

**2.1** In your new production project dashboard, look at the left sidebar

**2.2** Click on **"Settings"** (gear icon at the bottom of the sidebar)

**2.3** In the Settings menu, click on **"API"**

**2.4** You'll see a page with API credentials. Find these two items:

**Item 1: Project URL**
- Look for the section labeled **"Project URL"**
- It will look like: `https://abcdefghijk.supabase.co`
- Click the **copy icon** next to it (looks like two overlapping squares)
- **Paste it somewhere temporarily** (like a text editor or notes app)

**Item 2: anon public key**
- Scroll down to the section labeled **"Project API keys"**
- Find the row labeled **"anon" "public"**
- It's a long string starting with `eyJhbGc...`
- Click **"Copy"** button or the copy icon
- **Paste it somewhere temporarily** (next to your Project URL)

**EXAMPLE of what you should have copied:**
```
Project URL: https://xyzproject123.supabase.co
anon key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5enByb2plY3QxMjMiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTYyMDg0NjQwMCwiZXhwIjoxOTM2NDIyNDAwfQ.abcdef123456...
```

**Keep this information handy** - you'll use it in Step 4.

---

### STEP 3: Apply Database Schema to Production (10-15 minutes)

Your new production database is empty. You need to copy the same table structure from your development database.

You have **TWO OPTIONS**. Choose the one that's easier for you:

---

#### **OPTION A: Using Supabase Dashboard (Easier, No Installation Required)**

**3.1** Stay in your production Supabase project (the one you just created)

**3.2** In the left sidebar, click on **"SQL Editor"** (icon looks like `</>`)

**3.3** Now you need to run each migration file from your project. Here's how:

**3.3.1** In your Bolt editor (where you're viewing this file), look at the left file tree

**3.3.2** Find and expand the folder: **`supabase/migrations/`**

**3.3.3** You'll see files named like:
- `20250912110508_damp_voice.sql`
- `20250912111717_heavy_surf.sql`
- `20250912183843_weathered_river.sql`
- etc.

**3.3.4** Click on the **FIRST** file (the one with the earliest date/time):
- The first one should be: `20250912110508_damp_voice.sql`

**3.3.5** **Copy the entire contents** of this file (Ctrl+A, then Ctrl+C)

**3.3.6** Go back to your Supabase **SQL Editor** tab in your browser

**3.3.7** In the SQL Editor:
- Click on the big text area (where it says "Start typing your query...")
- **Paste** the copied SQL (Ctrl+V)

**3.3.8** Click the **"RUN"** button (bottom right, or press Ctrl+Enter)

**3.3.9** Wait for it to complete:
- You should see "Success. No rows returned" or "Success" message
- If you see an error, **don't panic** - some migrations might already exist or be dependent on others

**3.3.10** **REPEAT steps 3.3.4 through 3.3.9** for EACH migration file, in order:
- Next: `20250912111717_heavy_surf.sql`
- Then: `20250912183843_weathered_river.sql`
- Then: `20250913084000_green_summit.sql`
- Continue with ALL files in the `supabase/migrations/` folder

**IMPORTANT**: Run them **in chronological order** (oldest to newest based on the timestamp at the start of the filename)

**This will take about 10-15 minutes** depending on how many migration files you have.

---

#### **OPTION B: Using Supabase CLI (Faster, Requires Terminal)**

If you're comfortable with terminal/command line, this is much faster.

**3.1** Open your **Terminal** or **Command Prompt**

**3.2** Navigate to your project folder:
```bash
cd /tmp/cc-agent/56907222/project
```

**3.3** Install Supabase CLI (if not already installed):
```bash
npm install -g supabase
```
- This might take 1-2 minutes
- You might need to enter your computer password

**3.4** Login to Supabase:
```bash
supabase login
```
- This will open a browser window
- Click "Authorize" to grant access
- Go back to your terminal

**3.5** Link to your production project:

First, you need your **Project Reference ID**:
- Go back to your production Supabase dashboard
- Look at your **Project URL**: `https://xyzproject123.supabase.co`
- The project ref is the first part: `xyzproject123`

Now run:
```bash
supabase link --project-ref xyzproject123
```
Replace `xyzproject123` with YOUR actual project reference.

**3.6** When prompted, enter your **database password** (the one you saved in Step 1.4)

**3.7** Push all migrations to production:
```bash
supabase db push
```

This will automatically apply all migrations in the correct order. Takes about 2-3 minutes.

**3.8** You should see output like:
```
Applying migration 20250912110508_damp_voice.sql...
Applying migration 20250912111717_heavy_surf.sql...
...
Finished supabase db push.
```

---

### STEP 4: Update Production Environment File (2 minutes)

Now you'll tell your Bolt app how to connect to the production database.

**4.1** In your Bolt editor, look at the left file tree

**4.2** Find and click on the file: **`.env.production`**
- It's in the root folder (top level, not inside any subfolder)
- If you can't see it, look for files starting with a dot `.`

**4.3** You'll see this file content:
```bash
# Production Environment Configuration
VITE_ENV=production

# Production Supabase Configuration
VITE_SUPABASE_URL=https://your-production-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-production-anon-key-here

# Other settings...
```

**4.4** Find these TWO lines:
```bash
VITE_SUPABASE_URL=https://your-production-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-production-anon-key-here
```

**4.5** Replace the placeholder values with your ACTUAL production credentials (from Step 2):

**BEFORE:**
```bash
VITE_SUPABASE_URL=https://your-production-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-production-anon-key-here
```

**AFTER (example with your actual values):**
```bash
VITE_SUPABASE_URL=https://xyzproject123.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5enByb2plY3QxMjMiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTYyMDg0NjQwMCwiZXhwIjoxOTM2NDIyNDAwfQ.abcdef123456...
```

**4.6** Save the file (Ctrl+S or Cmd+S)

**4.7** **VERIFY** - Double-check:
- ✅ No placeholder text remains (no "your-production-" text)
- ✅ URL starts with `https://` and ends with `.supabase.co`
- ✅ Key is a very long string starting with `eyJ`
- ✅ No extra spaces or quotes around the values

---

### STEP 5: Test Production Connection Locally (OPTIONAL but Recommended - 3 minutes)

Before deploying, you can test that your production configuration works.

**⚠️ WARNING**: This will connect to your REAL production database. Any changes you make will be REAL!

**5.1** Open your **Terminal** in Bolt or your computer's terminal

**5.2** Make sure you're in the project directory:
```bash
cd /tmp/cc-agent/56907222/project
```

**5.3** Run the development server in production mode:
```bash
npm run dev:prod
```

**5.4** Look at the terminal output. You should see:
```
╔════════════════════════════════════════════════════════════╗
║  🏥 WESABI PHARMACY POS - PRODUCTION                       ║
╠════════════════════════════════════════════════════════════╣
║  Environment: production                                   ║
║  Database: xyzproject123                                   ║
╚════════════════════════════════════════════════════════════╝
⚠️  PRODUCTION MODE - All changes will affect live data!
```

**5.5** Open the app in your browser (click the URL shown, usually `http://localhost:5173`)

**5.6** Press **F12** to open browser console

**5.7** Look for the red production banner in the console

**5.8** **If you see any errors**:
- Check that your `.env.production` file has the correct credentials
- Make sure you completed Step 3 (migrations)
- Double-check there are no typos in the URL or key

**5.9** **Stop the server** when done testing:
- Press **Ctrl+C** in the terminal
- This disconnects from production

---

### STEP 6: Create Your First Production Admin User (5 minutes)

Your production database is now set up, but it's empty - no users exist yet. You need to create your first admin user.

**6.1** Go to your production Supabase project dashboard (in your browser)

**6.2** In the left sidebar, click **"SQL Editor"**

**6.3** Click **"New query"** button

**6.4** Copy and paste this SQL code:
```sql
-- Create your first admin user
-- Replace the email and password with your actual admin credentials

-- First, insert into auth.users (Supabase authentication)
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  confirmation_token,
  recovery_token
)
VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'admin@yourpharmacy.com',  -- ⚠️ CHANGE THIS to your actual email
  crypt('YourSecurePassword123!', gen_salt('bf')),  -- ⚠️ CHANGE THIS to your actual password
  now(),
  now(),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{}',
  false,
  '',
  ''
)
RETURNING id;

-- Note the ID that's returned, you'll need it for the next step
```

**6.5** **IMPORTANT**: Before running, replace:
- `admin@yourpharmacy.com` with your actual email address
- `YourSecurePassword123!` with your actual secure password

**6.6** Click **"RUN"** (or press Ctrl+Enter)

**6.7** You should see a result with a UUID (like `a1b2c3d4-e5f6-7890-abcd-ef1234567890`)
- **Copy this UUID** - you'll need it in the next step

**6.8** Now create the user in your pharmacy system. Click **"New query"** again

**6.9** Copy and paste this SQL (replace the values):
```sql
-- Add user to your pharmacy users table
INSERT INTO users (id, email, name, role, is_active)
VALUES (
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',  -- ⚠️ PASTE the UUID from previous step
  'admin@yourpharmacy.com',  -- ⚠️ Same email as before
  'Admin User',  -- You can change this to your actual name
  'super_admin',  -- This gives full admin privileges
  true
);
```

**6.10** Click **"RUN"**

**6.11** You should see "Success. 1 row inserted"

**You now have an admin user!** You can log in with:
- Email: `admin@yourpharmacy.com` (or whatever you set)
- Password: `YourSecurePassword123!` (or whatever you set)

---

### STEP 7: Build for Production (2 minutes)

Now build your app to create the production-ready version.

**7.1** Open your **Terminal** in Bolt

**7.2** Make sure you're in the project directory:
```bash
cd /tmp/cc-agent/56907222/project
```

**7.3** Run the build command:
```bash
npm run build
```

**7.4** Wait for the build to complete (takes 10-30 seconds)

**7.5** You should see output like:
```
✓ 1957 modules transformed.
✓ built in 13.05s
```

**7.6** A new folder called **`dist/`** is created - this contains your production app

---

### STEP 8: Deploy on Bolt (Automatic)

**Good news**: Bolt automatically deploys your app when you push changes!

**8.1** Your app is automatically built and deployed by Bolt

**8.2** Bolt uses the `.env.production` file for deployed builds

**8.3** Your production app will automatically connect to your production database

**No additional steps needed!**

---

### STEP 9: Verify Production Deployment (5 minutes)

After Bolt deploys your app, verify everything works:

**9.1** Open your deployed Bolt app URL (Bolt provides this)

**9.2** The app should load

**9.3** Press **F12** to open browser Developer Console

**9.4** Look for the environment banner in the console. You should see:
```
╔════════════════════════════════════════════════════════════╗
║  🏥 WESABI PHARMACY POS - PRODUCTION                       ║
╠════════════════════════════════════════════════════════════╣
║  Environment: production                                   ║
║  Database: xyzproject123  (your production project)        ║
╚════════════════════════════════════════════════════════════╝
```

**9.5** The banner should be **RED** (indicating production mode)

**9.6** Try logging in with your admin credentials (from Step 6)

**9.7** If login works, **congratulations!** Your production setup is complete!

---

## 🎉 YOU'RE DONE!

Your pharmacy POS system now has:
- ✅ Separate production database (safe from development testing)
- ✅ Separate development database (safe to experiment)
- ✅ Automatic environment detection
- ✅ Production admin user created
- ✅ Successfully deployed and connected

---

## 📊 Understanding Your Setup

### What You Now Have:

**Two Supabase Projects:**
1. **Development** (`wyvgddqlyyrdgrsnmvow.supabase.co`)
   - Used when running `npm run dev`
   - Safe to test, break things, experiment
   - Console shows GREEN banner

2. **Production** (`xyzproject123.supabase.co` - your project)
   - Used when deployed on Bolt
   - Real customer data lives here
   - Console shows RED banner

### Which Database Am I Using?

**Development (Safe Testing):**
```bash
npm run dev          # Uses .env.development → Development database 🟢
```

**Production (Real Data):**
```bash
npm run dev:prod     # Uses .env.production → Production database 🔴
npm run build        # Builds for production → Production database 🔴
```

**Deployed App on Bolt:**
- Always uses production database 🔴

---

## 🔐 IMPORTANT Security Notes

### DO NOT Commit Production Credentials

**Never commit `.env.production` to Git if it contains real credentials!**

Your `.gitignore` should include:
```
.env.production
.env.local
```

### Environment Files Summary

| File | Purpose | Commit to Git? |
|------|---------|----------------|
| `.env` | Default/fallback | ⚠️ Only with dummy values |
| `.env.development` | Development database | ✅ Yes (dev credentials OK) |
| `.env.production` | Production database | ❌ NO! Keep secret |
| `.env.local` | Local overrides | ❌ NO! Keep secret |

---

## 🆘 Troubleshooting

### Problem: "Cannot read properties of undefined"

**Cause:** `.env.production` file is missing or not configured

**Solution:**
1. Check that `.env.production` exists in your project root
2. Make sure it has `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` set
3. Run `npm run build` again

### Problem: "Failed to fetch" or connection errors

**Cause:** Wrong credentials or production database not set up

**Solution:**
1. Go to Supabase dashboard → Settings → API
2. Copy Project URL and anon key again
3. Paste into `.env.production`
4. Make sure you completed Step 3 (migrations)

### Problem: Can't log in with admin user

**Cause:** User not created correctly or wrong password

**Solution:**
1. Go to Supabase dashboard → SQL Editor
2. Check if user exists:
```sql
SELECT * FROM auth.users WHERE email = 'admin@yourpharmacy.com';
```
3. If no results, repeat Step 6
4. If exists, try resetting password in Supabase dashboard

### Problem: Console shows development instead of production

**Cause:** Build is using wrong environment

**Solution:**
1. Check that `.env.production` exists
2. Run: `npm run build` (not `npm run build:dev`)
3. Make sure Bolt is deploying the production build

### Problem: Changes not appearing in deployed app

**Cause:** Build cache or deployment not triggered

**Solution:**
1. Run `npm run build` manually
2. Clear browser cache (Ctrl+Shift+Delete)
3. Hard refresh (Ctrl+Shift+R or Cmd+Shift+R)

---

## 🔄 Daily Workflow

### During Development (Normal Work):
```bash
npm run dev   # Uses development database - safe to test 🟢
```
- Make changes
- Test features
- Break things (it's OK!)
- Console shows green banner

### Before Deploying (Production):
```bash
npm run build   # Creates production build 🔴
```
- Verify build succeeds
- Test critical features one more time
- Bolt deploys automatically

### Testing Production Locally (Rare):
```bash
npm run dev:prod   # Uses production database - BE CAREFUL 🔴
```
- Only when you need to test with production data
- Double-check you're OK with making real changes
- Stop server (Ctrl+C) when done

---

## 📚 Additional Resources

**Created guides in your project:**
- `BOLT_PRODUCTION_SETUP.md` ← You are here
- `ENVIRONMENT_SETUP.md` - Technical details
- `ENVIRONMENT_QUICK_START.md` - Quick commands
- `README_ENVIRONMENTS.md` - Overview

**Supabase Resources:**
- Dashboard: https://supabase.com/dashboard
- Documentation: https://supabase.com/docs
- CLI Guide: https://supabase.com/docs/guides/cli

---

## ✅ Verification Checklist

Before going live, make sure:

- [ ] Production Supabase project created
- [ ] Project URL and anon key copied
- [ ] All migrations applied to production (Step 3)
- [ ] `.env.production` file updated with real credentials
- [ ] No placeholder text in `.env.production`
- [ ] Admin user created in production (Step 6)
- [ ] `npm run build` completes successfully
- [ ] Deployed app shows "PRODUCTION" in red in console
- [ ] Can log in with admin user on deployed app
- [ ] `.env.production` is in `.gitignore`
- [ ] Production credentials are stored securely

---

## 🎊 Success!

You've successfully set up your production database on Bolt!

Your pharmacy POS system is now:
- **Secure** - Production data is separate and protected
- **Professional** - Proper environment separation
- **Safe** - Can't accidentally break production during development
- **Ready** - Deployed and connected to production database

**Happy managing your pharmacy! 🏥**

---

*Need help? Check the troubleshooting section above or reach out for support.*
