/*
  # Fix Data Visibility for All Users

  1. Problem
    - Original schema has overly restrictive RLS policies
    - Only super_admin and admin can see activity_logs
    - Inventory users can't see sales data
    - Sales users can't see stock_take data
    - This prevents proper app functionality for non-admin users

  2. Solution
    - Drop all restrictive read policies
    - Allow ALL authenticated users to READ all data
    - Keep write/delete operations role-restricted
    - This ensures all users can see relevant data based on their permissions

  3. Tables Updated
    - products (already allows all users - keeping it)
    - sales, sale_items
    - invoices, invoice_items
    - credit_notes, credit_note_items
    - stock_takes, stock_take_sessions
    - activity_logs
    - price_history (already allows all users - keeping it)

  4. Security
    - RLS remains enabled on all tables
    - All authenticated users can READ data
    - Write operations restricted by role
    - Delete operations restricted to admins only
*/

-- =====================================================
-- PRODUCTS (already correct - all users can read)
-- =====================================================
-- No changes needed - already allows all authenticated users to read

-- =====================================================
-- SALES & SALE_ITEMS
-- =====================================================
DROP POLICY IF EXISTS "Sales users can read sales" ON public.sales;
DROP POLICY IF EXISTS "All authenticated users can read sales" ON public.sales;

CREATE POLICY "All users can read sales"
  ON public.sales FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Sales users can read sale_items" ON public.sale_items;
DROP POLICY IF EXISTS "All authenticated users can read sale_items" ON public.sale_items;

CREATE POLICY "All users can read sale_items"
  ON public.sale_items FOR SELECT
  TO authenticated
  USING (true);

-- =====================================================
-- INVOICES & INVOICE_ITEMS
-- =====================================================
DROP POLICY IF EXISTS "Inventory managers can read invoices" ON public.invoices;
DROP POLICY IF EXISTS "All authenticated users can read invoices" ON public.invoices;

CREATE POLICY "All users can read invoices"
  ON public.invoices FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Inventory managers can read invoice_items" ON public.invoice_items;
DROP POLICY IF EXISTS "All authenticated users can read invoice_items" ON public.invoice_items;

CREATE POLICY "All users can read invoice_items"
  ON public.invoice_items FOR SELECT
  TO authenticated
  USING (true);

-- =====================================================
-- CREDIT NOTES & CREDIT NOTE ITEMS
-- =====================================================
DROP POLICY IF EXISTS "Inventory managers can read credit_notes" ON public.credit_notes;
DROP POLICY IF EXISTS "All authenticated users can read credit_notes" ON public.credit_notes;

CREATE POLICY "All users can read credit_notes"
  ON public.credit_notes FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Inventory managers can read credit_note_items" ON public.credit_note_items;
DROP POLICY IF EXISTS "All authenticated users can read credit_note_items" ON public.credit_note_items;

CREATE POLICY "All users can read credit_note_items"
  ON public.credit_note_items FOR SELECT
  TO authenticated
  USING (true);

-- =====================================================
-- STOCK TAKES & STOCK TAKE SESSIONS
-- =====================================================
DROP POLICY IF EXISTS "Stock take users can read stock_takes" ON public.stock_takes;
DROP POLICY IF EXISTS "All authenticated users can read stock_takes" ON public.stock_takes;

CREATE POLICY "All users can read stock_takes"
  ON public.stock_takes FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Stock take users can read sessions" ON public.stock_take_sessions;
DROP POLICY IF EXISTS "All authenticated users can read stock_take_sessions" ON public.stock_take_sessions;
DROP POLICY IF EXISTS "Stock take users can read stock_take_sessions" ON public.stock_take_sessions;

CREATE POLICY "All users can read stock_take_sessions"
  ON public.stock_take_sessions FOR SELECT
  TO authenticated
  USING (true);

-- =====================================================
-- ACTIVITY LOGS
-- =====================================================
DROP POLICY IF EXISTS "Admins can read activity_logs" ON public.activity_logs;
DROP POLICY IF EXISTS "All authenticated users can read activity_logs" ON public.activity_logs;

CREATE POLICY "All users can read activity_logs"
  ON public.activity_logs FOR SELECT
  TO authenticated
  USING (true);

-- =====================================================
-- PRICE HISTORY (already correct - all users can read)
-- =====================================================
-- No changes needed - already allows all authenticated users to read
