/*
  # Fix Price History RLS Policy

  1. Security Changes
    - Disable RLS on `price_history` table temporarily for development
    - This allows the mock user to insert price history records
    - Alternative: Create specific policy for mock user ID

  Note: In production, you should enable RLS with proper policies
*/

-- Disable RLS on price_history table for development
ALTER TABLE price_history DISABLE ROW LEVEL SECURITY;

-- Alternative approach (commented out): Create specific policy for mock user
-- CREATE POLICY "Allow mock user to insert price history"
--   ON price_history
--   FOR INSERT
--   TO anon
--   WITH CHECK (user_id = '00000000-0000-0000-0000-000000000001');

-- Alternative approach (commented out): Allow all inserts for development
-- CREATE POLICY "Allow all inserts for development"
--   ON price_history
--   FOR INSERT
--   TO anon
--   WITH CHECK (true);