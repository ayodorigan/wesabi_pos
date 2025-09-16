/*
  # Add user profile insert policy

  1. Security
    - Add RLS policy to allow users to insert their own profile
    - Users can only insert a profile with their own user_id
    - This fixes the "new row violates row-level security policy" error

  2. Changes
    - Add INSERT policy for authenticated users on user_profiles table
    - Policy ensures user_id matches auth.uid()
*/

-- Add policy to allow users to insert their own profile
CREATE POLICY "Users can insert own profile"
  ON user_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);