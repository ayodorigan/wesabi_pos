/*
  # Cleanup All Duplicate RLS Policies

  1. Problem
    - Multiple tables have duplicate/conflicting RLS policies
    - Tables affected: activity_logs, supplier_orders, supplier_order_items
    - Duplicate policies cause operations to fail

  2. Solution
    - Drop all duplicate policies
    - Keep simple, permissive policies for authenticated users
    - Restrict only DELETE operations to admins where appropriate

  3. Tables Fixed
    - activity_logs
    - supplier_orders
    - supplier_order_items
*/

-- =====================================================
-- ACTIVITY LOGS
-- =====================================================
DROP POLICY IF EXISTS "All authenticated users can read activity_logs" ON public.activity_logs;
DROP POLICY IF EXISTS "All users can read activity_logs" ON public.activity_logs;
DROP POLICY IF EXISTS "Admins can read activity_logs" ON public.activity_logs;

CREATE POLICY "activity_logs_select_policy"
  ON public.activity_logs FOR SELECT
  TO authenticated
  USING (true);

-- =====================================================
-- SUPPLIER_ORDERS
-- =====================================================
DROP POLICY IF EXISTS "All authenticated users can read supplier_orders" ON public.supplier_orders;
DROP POLICY IF EXISTS "Authenticated users can read orders" ON public.supplier_orders;
DROP POLICY IF EXISTS "Authenticated users can create orders" ON public.supplier_orders;
DROP POLICY IF EXISTS "Inventory users can create supplier_orders" ON public.supplier_orders;
DROP POLICY IF EXISTS "Users can update own orders" ON public.supplier_orders;
DROP POLICY IF EXISTS "Inventory users can update supplier_orders" ON public.supplier_orders;
DROP POLICY IF EXISTS "Admins can delete orders" ON public.supplier_orders;
DROP POLICY IF EXISTS "Admins can delete supplier_orders" ON public.supplier_orders;

CREATE POLICY "supplier_orders_select_policy"
  ON public.supplier_orders FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "supplier_orders_insert_policy"
  ON public.supplier_orders FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "supplier_orders_update_policy"
  ON public.supplier_orders FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "supplier_orders_delete_policy"
  ON public.supplier_orders FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.role IN ('super_admin', 'admin')
    )
  );

-- =====================================================
-- SUPPLIER_ORDER_ITEMS
-- =====================================================
DROP POLICY IF EXISTS "All authenticated users can read supplier_order_items" ON public.supplier_order_items;
DROP POLICY IF EXISTS "Authenticated users can read order items" ON public.supplier_order_items;
DROP POLICY IF EXISTS "Users can add items to orders" ON public.supplier_order_items;
DROP POLICY IF EXISTS "Inventory users can create supplier_order_items" ON public.supplier_order_items;
DROP POLICY IF EXISTS "Users can update own order items" ON public.supplier_order_items;
DROP POLICY IF EXISTS "Inventory users can update supplier_order_items" ON public.supplier_order_items;
DROP POLICY IF EXISTS "Admins can delete supplier_order_items" ON public.supplier_order_items;
DROP POLICY IF EXISTS "Users can delete own order items" ON public.supplier_order_items;

CREATE POLICY "supplier_order_items_select_policy"
  ON public.supplier_order_items FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "supplier_order_items_insert_policy"
  ON public.supplier_order_items FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "supplier_order_items_update_policy"
  ON public.supplier_order_items FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "supplier_order_items_delete_policy"
  ON public.supplier_order_items FOR DELETE
  TO authenticated
  USING (true);