/*
  # Reset Authentication System

  1. Clean Slate
    - Drop existing user-related tables and functions
    - Remove old triggers and policies
    
  2. Fresh Start
    - Prepare for new authentication setup
*/

-- Drop existing tables and functions if they exist
DROP TABLE IF EXISTS user_profiles CASCADE;
DROP FUNCTION IF EXISTS handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS get_user_role(uuid) CASCADE;

-- Clean up any existing policies
DROP POLICY IF EXISTS "Users can read own data" ON user_profiles;
DROP POLICY IF EXISTS "Super admins can do anything" ON user_profiles;
DROP POLICY IF EXISTS "Super admins can update any profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON user_profiles;