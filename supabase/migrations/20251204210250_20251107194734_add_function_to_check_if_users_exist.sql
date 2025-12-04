/*
  # Add function to check if any users exist in the system

  1. New Functions
    - `has_any_users()` - Returns true if any users exist in auth.users table
    - This allows the login page to determine if sign-up should be shown
  
  2. Security
    - Function is accessible to anonymous users (needed for login page)
    - Function only returns a boolean, no sensitive data exposed
*/

-- Create function to check if any users exist
CREATE OR REPLACE FUNCTION public.has_any_users()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT EXISTS (SELECT 1 FROM auth.users LIMIT 1);
$$;

-- Grant execute permission to anon and authenticated users
GRANT EXECUTE ON FUNCTION public.has_any_users() TO anon;
GRANT EXECUTE ON FUNCTION public.has_any_users() TO authenticated;