/*
  # Fix Infinite Recursion in user_profiles Policies

  1. Issue
    - Previous policies caused infinite recursion by querying user_profiles 
      from within user_profiles policies
  
  2. Solution
    - Simplify policies to avoid circular dependencies
    - Use restrictive policies instead of multiple permissive ones
    - Super admins can manage all profiles through application logic
    - Regular users can only manage their own profiles
  
  3. Security
    - Users can only SELECT, INSERT, and UPDATE their own profile
    - Deletion is restricted (handled by edge functions/admin)
*/

-- Drop all existing policies on user_profiles
DROP POLICY IF EXISTS "Users can read own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Super admins can read all profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can create own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Super admins can insert profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Super admins can update all profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Super admins can delete profiles" ON public.user_profiles;

-- Create simple, non-recursive policies

-- Allow users to read their own profile
CREATE POLICY "Users can read own profile"
  ON public.user_profiles
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Allow users to create their own profile
CREATE POLICY "Users can create own profile"
  ON public.user_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Allow users to update their own profile
CREATE POLICY "Users can update own profile"
  ON public.user_profiles
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Note: DELETE operations should be handled by edge functions with service role
-- Super admin operations should use service role client in edge functions