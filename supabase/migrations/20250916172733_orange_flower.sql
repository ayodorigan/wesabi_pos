/*
  # Fix Products Table RLS Policy

  1. Security
    - Update RLS policy for products table to allow authenticated users to insert
    - Ensure proper permissions for inventory management
*/

-- Drop existing restrictive policy if it exists
DROP POLICY IF EXISTS "Authorized users can insert products" ON products;

-- Create new policy that allows all authenticated users to insert products
CREATE POLICY "Authenticated users can insert products"
  ON products
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Ensure the policy for reading products allows all authenticated users
DROP POLICY IF EXISTS "All authenticated users can read products" ON products;
CREATE POLICY "All authenticated users can read products"
  ON products
  FOR SELECT
  TO authenticated
  USING (true);

-- Ensure update policy exists
DROP POLICY IF EXISTS "Authorized users can update products" ON products;
CREATE POLICY "Authorized users can update products"
  ON products
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Ensure delete policy exists (more restrictive)
DROP POLICY IF EXISTS "Only admins can delete products" ON products;
CREATE POLICY "Only admins can delete products"
  ON products
  FOR DELETE
  TO authenticated
  USING (get_user_role(auth.uid()) = ANY (ARRAY['super_admin'::text, 'admin'::text]));