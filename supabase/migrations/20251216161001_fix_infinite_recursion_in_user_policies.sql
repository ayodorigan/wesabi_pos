/*
  # Fix Infinite Recursion in User Profile Policies

  1. Changes
    - Drop policies that cause infinite recursion
    - Create a security definer function to check user role without triggering RLS
    - Recreate policies using the function to avoid recursion
  
  2. Security
    - Function uses SECURITY DEFINER to bypass RLS when checking roles
    - Policies still enforce proper access control
    - Users can read/update their own profiles
    - Admins can manage all profiles
*/

-- Drop the problematic policies
DROP POLICY IF EXISTS "Admins can view all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Admins can delete profiles" ON user_profiles;

-- Create a function to check if current user is admin (bypasses RLS)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_id = auth.uid()
    AND role IN ('super_admin', 'admin')
  );
END;
$$;

-- Update the SELECT policy to allow users to see their own profile OR admins to see all
DROP POLICY IF EXISTS "Users can read own profile" ON user_profiles;
CREATE POLICY "Users can read profiles"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() OR is_admin()
  );

-- Update the UPDATE policy to allow users to update their own profile OR admins to update all
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
CREATE POLICY "Users can update profiles"
  ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (
    user_id = auth.uid() OR is_admin()
  )
  WITH CHECK (
    user_id = auth.uid() OR is_admin()
  );

-- Allow admins to delete user profiles (regular users cannot delete)
CREATE POLICY "Admins can delete profiles"
  ON user_profiles
  FOR DELETE
  TO authenticated
  USING (
    is_admin()
  );