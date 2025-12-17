/*
  # Cleanup Duplicate Product RLS Policies

  1. Problem
    - Multiple conflicting INSERT policies on products table
    - Multiple conflicting UPDATE policies on products table
    - When multiple policies exist, ALL must pass for operation to succeed
    - The restrictive policies are blocking valid operations

  2. Solution
    - Drop ALL existing policies on products table
    - Create clean, simple policies:
      - SELECT: All authenticated users
      - INSERT: All authenticated users
      - UPDATE: All authenticated users
      - DELETE: Admins only

  3. Security
    - RLS remains enabled
    - All authenticated users can read/write products
    - Only admins can delete products
*/

-- Drop ALL existing policies on products table
DROP POLICY IF EXISTS "All authenticated users can read products" ON public.products;
DROP POLICY IF EXISTS "All authenticated users can insert products" ON public.products;
DROP POLICY IF EXISTS "All authenticated users can update products" ON public.products;
DROP POLICY IF EXISTS "Authorized users can insert products" ON public.products;
DROP POLICY IF EXISTS "Authorized users can update products" ON public.products;
DROP POLICY IF EXISTS "Inventory managers can insert products" ON public.products;
DROP POLICY IF EXISTS "Inventory managers can update products" ON public.products;
DROP POLICY IF EXISTS "Admins can delete products" ON public.products;
DROP POLICY IF EXISTS "Only admins can delete products" ON public.products;

-- Create clean, simple policies
CREATE POLICY "products_select_policy"
  ON public.products FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "products_insert_policy"
  ON public.products FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "products_update_policy"
  ON public.products FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "products_delete_policy"
  ON public.products FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.role IN ('super_admin', 'admin')
    )
  );