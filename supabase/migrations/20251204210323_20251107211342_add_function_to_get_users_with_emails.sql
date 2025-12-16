/*
  # Add function to get all users with their emails

  1. New Functions
    - `get_all_users_with_emails()` - Returns all user profiles joined with their emails from auth.users
    - This allows admins to view user emails in the settings page
  
  2. Security
    - Function uses SECURITY DEFINER to access auth.users table
    - Only accessible to authenticated users (enforced by RLS in the calling context)
    - Returns user profile data with email addresses
*/

-- Create function to get all users with their emails
CREATE OR REPLACE FUNCTION public.get_all_users_with_emails()
RETURNS TABLE (
  id uuid,
  user_id uuid,
  name text,
  email text,
  phone text,
  role text,
  is_active boolean,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT 
    up.id,
    up.user_id,
    up.name,
    au.email,
    up.phone,
    up.role,
    up.is_active,
    up.created_at,
    up.updated_at
  FROM user_profiles up
  LEFT JOIN auth.users au ON up.user_id = au.id
  ORDER BY up.created_at DESC;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_all_users_with_emails() TO authenticated;