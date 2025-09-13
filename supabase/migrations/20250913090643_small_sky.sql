/*
  # Create Mock User for Sales

  1. New Records
    - Create a mock user in auth.users table
    - Create corresponding user_profiles record
  
  2. Purpose
    - Resolves foreign key constraint violation
    - Allows sales to be created without authentication
    - Provides consistent user reference for all operations
*/

-- Insert mock user into auth.users table
INSERT INTO auth.users (
  id,
  instance_id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
) VALUES (
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'admin@wesabi.co.ke',
  '$2a$10$mockhashedpasswordfordemopurposes',
  now(),
  now(),
  now(),
  '',
  '',
  '',
  ''
) ON CONFLICT (id) DO NOTHING;

-- Insert corresponding user profile
INSERT INTO public.user_profiles (
  user_id,
  name,
  phone,
  role,
  is_active
) VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Administrator',
  '+254700000001',
  'super_admin',
  true
) ON CONFLICT (user_id) DO NOTHING;