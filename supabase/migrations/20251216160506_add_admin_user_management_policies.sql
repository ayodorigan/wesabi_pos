/*
  # Add Admin User Management Policies

  1. Changes
    - Add policies allowing admins to manage all user profiles
    - Admins (super_admin and admin) can SELECT, UPDATE, and DELETE all user profiles
    - This enables admins to activate/deactivate users and edit their details
  
  2. Security
    - Only authenticated users with admin or super_admin role can manage other users
    - Regular users can still only manage their own profiles
*/

-- Allow admins to view all user profiles
CREATE POLICY "Admins can view all profiles"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.user_id = auth.uid()
      AND up.role IN ('super_admin', 'admin')
    )
  );

-- Allow admins to update all user profiles
CREATE POLICY "Admins can update all profiles"
  ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.user_id = auth.uid()
      AND up.role IN ('super_admin', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.user_id = auth.uid()
      AND up.role IN ('super_admin', 'admin')
    )
  );

-- Allow admins to delete user profiles
CREATE POLICY "Admins can delete profiles"
  ON user_profiles
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.user_id = auth.uid()
      AND up.role IN ('super_admin', 'admin')
    )
  );