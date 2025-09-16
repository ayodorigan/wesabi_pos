/*
  # Reset Authentication System

  1. Purpose
    - Clean up any existing authentication setup
    - Remove old tables, functions, and policies safely
    - Prepare for fresh authentication system setup

  2. Changes
    - Drop user_profiles table if it exists
    - Drop authentication functions if they exist
    - Clean up any existing RLS policies safely
*/

-- Drop existing functions first (they may depend on tables)
DROP FUNCTION IF EXISTS handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS get_user_role(uuid) CASCADE;

-- Drop existing tables and their policies
DO $$ 
BEGIN
    -- Drop policies only if table exists
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'user_profiles') THEN
        DROP POLICY IF EXISTS "Users can read own data" ON user_profiles;
        DROP POLICY IF EXISTS "Super admins can do anything" ON user_profiles;
        DROP POLICY IF EXISTS "Super admins can update any profile" ON user_profiles;
        DROP POLICY IF EXISTS "Users can update their own profile" ON user_profiles;
        
        -- Drop the table
        DROP TABLE user_profiles CASCADE;
    END IF;
END $$;

-- Clean up any other auth-related objects that might exist
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;