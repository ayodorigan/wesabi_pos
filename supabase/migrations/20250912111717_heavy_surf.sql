/*
  # Fix User Creation Policy

  1. Security Changes
    - Add policy to allow initial admin user creation
    - Allow user creation when no users exist in the system
    - Ensure first user can be created to bootstrap the system

  2. Notes
    - This policy allows user creation only when the users table is empty
    - After the first admin user is created, normal RLS policies apply
    - This is a secure way to bootstrap the system
*/

-- Drop existing policies that might be too restrictive
DROP POLICY IF EXISTS "Admins can manage users" ON users;
DROP POLICY IF EXISTS "Users can read all users" ON users;
DROP POLICY IF EXISTS "Users can update their own profile" ON users;

-- Create new policies that allow initial setup
CREATE POLICY "Allow initial admin creation"
  ON users
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    -- Allow insert if no users exist (bootstrap scenario)
    (SELECT count(*) FROM users) = 0
    OR
    -- Allow admins to create users
    (EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role IN ('super_admin', 'admin')
    ))
  );

CREATE POLICY "Users can read all users"
  ON users
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update their own profile"
  ON users
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE POLICY "Admins can manage all users"
  ON users
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role IN ('super_admin', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role IN ('super_admin', 'admin')
    )
  );