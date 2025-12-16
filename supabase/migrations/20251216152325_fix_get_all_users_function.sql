/*
  # Fix get_all_users_with_emails function

  1. Issues Fixed
    - Corrected return type for email column (varchar instead of text)
    - Added missing columns: id, phone, is_active, updated_at
    - Function now returns complete UserProfile structure with email

  2. Changes
    - Updated RETURNS TABLE to match all UserProfile columns
    - Added all missing columns to SELECT query
    - Cast email to text to match expected type
*/

DROP FUNCTION IF EXISTS public.get_all_users_with_emails();

CREATE FUNCTION public.get_all_users_with_emails()
RETURNS TABLE (
  id uuid,
  user_id uuid,
  email text,
  name text,
  phone text,
  role text,
  is_active boolean,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    up.id,
    up.user_id,
    au.email::text,
    up.name,
    up.phone,
    up.role,
    up.is_active,
    up.created_at,
    up.updated_at
  FROM public.user_profiles up
  INNER JOIN auth.users au ON up.user_id = au.id
  ORDER BY up.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_all_users_with_emails() TO authenticated;