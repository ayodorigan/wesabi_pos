/*
  # Fix Performance and Security Issues

  1. Performance Optimizations
    - Add missing index on invoice_reversal_items.original_invoice_item_id
    - Optimize RLS policies to use (select auth.uid()) instead of auth.uid()
    - This prevents re-evaluation of auth functions for each row

  2. Security Improvements
    - Fix function search_path issues by setting search_path explicitly
    - Ensures functions execute with proper security context

  3. Affected Tables and Policies
    - user_profiles (insert, update, delete)
    - products (delete)
    - invoices (delete)
    - invoice_items (delete)
    - credit_notes (delete)
    - credit_note_items (delete)
    - sales (delete)
    - sale_items (delete)
    - price_history (delete)
    - stock_takes (delete)
    - stock_take_sessions (delete)
    - activity_logs (delete)
    - mpesa_transactions (delete)
    - mpesa_config (insert, update, delete)
    - supplier_orders (delete)
    - invoice_reversals (insert)
    - invoice_reversal_items (insert)

  4. Affected Functions
    - is_invoice_reversed
    - generate_order_number
    - update_supplier_orders_updated_at

  Notes:
    - Password leak protection must be enabled manually in Supabase Dashboard
    - Navigate to: Authentication > Settings > Enable "Leaked Password Protection"
*/

-- =====================================================
-- ADD MISSING INDEX
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_invoice_reversal_items_original_item
  ON invoice_reversal_items(original_invoice_item_id);

-- =====================================================
-- DROP AND RECREATE RLS POLICIES WITH OPTIMIZED AUTH CALLS
-- =====================================================

-- USER_PROFILES
DROP POLICY IF EXISTS "user_profiles_insert" ON public.user_profiles;
CREATE POLICY "user_profiles_insert"
  ON public.user_profiles FOR INSERT
  TO authenticated
  WITH CHECK (
    (select auth.uid()) = user_id OR
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_id = (select auth.uid())
      AND role IN ('super_admin', 'admin')
    )
  );

DROP POLICY IF EXISTS "user_profiles_update" ON public.user_profiles;
CREATE POLICY "user_profiles_update"
  ON public.user_profiles FOR UPDATE
  TO authenticated
  USING (
    (select auth.uid()) = user_id OR
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_id = (select auth.uid())
      AND role IN ('super_admin', 'admin')
    )
  )
  WITH CHECK (
    (select auth.uid()) = user_id OR
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_id = (select auth.uid())
      AND role IN ('super_admin', 'admin')
    )
  );

DROP POLICY IF EXISTS "user_profiles_delete" ON public.user_profiles;
CREATE POLICY "user_profiles_delete"
  ON public.user_profiles FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_id = (select auth.uid())
      AND role IN ('super_admin', 'admin')
    )
  );

-- PRODUCTS
DROP POLICY IF EXISTS "products_delete" ON public.products;
CREATE POLICY "products_delete"
  ON public.products FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_id = (select auth.uid())
      AND role IN ('super_admin', 'admin')
    )
  );

-- INVOICES
DROP POLICY IF EXISTS "invoices_delete" ON public.invoices;
CREATE POLICY "invoices_delete"
  ON public.invoices FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_id = (select auth.uid())
      AND role IN ('super_admin', 'admin')
    )
  );

-- INVOICE_ITEMS
DROP POLICY IF EXISTS "invoice_items_delete" ON public.invoice_items;
CREATE POLICY "invoice_items_delete"
  ON public.invoice_items FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_id = (select auth.uid())
      AND role IN ('super_admin', 'admin')
    )
  );

-- CREDIT_NOTES
DROP POLICY IF EXISTS "credit_notes_delete" ON public.credit_notes;
CREATE POLICY "credit_notes_delete"
  ON public.credit_notes FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_id = (select auth.uid())
      AND role IN ('super_admin', 'admin')
    )
  );

-- CREDIT_NOTE_ITEMS
DROP POLICY IF EXISTS "credit_note_items_delete" ON public.credit_note_items;
CREATE POLICY "credit_note_items_delete"
  ON public.credit_note_items FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_id = (select auth.uid())
      AND role IN ('super_admin', 'admin')
    )
  );

-- SALES
DROP POLICY IF EXISTS "sales_delete" ON public.sales;
CREATE POLICY "sales_delete"
  ON public.sales FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_id = (select auth.uid())
      AND role IN ('super_admin', 'admin')
    )
  );

-- SALE_ITEMS
DROP POLICY IF EXISTS "sale_items_delete" ON public.sale_items;
CREATE POLICY "sale_items_delete"
  ON public.sale_items FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_id = (select auth.uid())
      AND role IN ('super_admin', 'admin')
    )
  );

-- PRICE_HISTORY
DROP POLICY IF EXISTS "price_history_delete" ON public.price_history;
CREATE POLICY "price_history_delete"
  ON public.price_history FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_id = (select auth.uid())
      AND role IN ('super_admin', 'admin')
    )
  );

-- STOCK_TAKES
DROP POLICY IF EXISTS "stock_takes_delete" ON public.stock_takes;
CREATE POLICY "stock_takes_delete"
  ON public.stock_takes FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_id = (select auth.uid())
      AND role IN ('super_admin', 'admin')
    )
  );

-- STOCK_TAKE_SESSIONS
DROP POLICY IF EXISTS "stock_take_sessions_delete" ON public.stock_take_sessions;
CREATE POLICY "stock_take_sessions_delete"
  ON public.stock_take_sessions FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_id = (select auth.uid())
      AND role IN ('super_admin', 'admin')
    )
  );

-- ACTIVITY_LOGS
DROP POLICY IF EXISTS "activity_logs_delete" ON public.activity_logs;
CREATE POLICY "activity_logs_delete"
  ON public.activity_logs FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_id = (select auth.uid())
      AND role IN ('super_admin', 'admin')
    )
  );

-- MPESA_TRANSACTIONS
DROP POLICY IF EXISTS "mpesa_transactions_delete" ON public.mpesa_transactions;
CREATE POLICY "mpesa_transactions_delete"
  ON public.mpesa_transactions FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_id = (select auth.uid())
      AND role IN ('super_admin', 'admin')
    )
  );

-- MPESA_CONFIG
DROP POLICY IF EXISTS "mpesa_config_insert" ON public.mpesa_config;
CREATE POLICY "mpesa_config_insert"
  ON public.mpesa_config FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_id = (select auth.uid())
      AND role IN ('super_admin', 'admin')
    )
  );

DROP POLICY IF EXISTS "mpesa_config_update" ON public.mpesa_config;
CREATE POLICY "mpesa_config_update"
  ON public.mpesa_config FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_id = (select auth.uid())
      AND role IN ('super_admin', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_id = (select auth.uid())
      AND role IN ('super_admin', 'admin')
    )
  );

DROP POLICY IF EXISTS "mpesa_config_delete" ON public.mpesa_config;
CREATE POLICY "mpesa_config_delete"
  ON public.mpesa_config FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_id = (select auth.uid())
      AND role IN ('super_admin', 'admin')
    )
  );

-- SUPPLIER_ORDERS
DROP POLICY IF EXISTS "supplier_orders_delete" ON public.supplier_orders;
CREATE POLICY "supplier_orders_delete"
  ON public.supplier_orders FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_id = (select auth.uid())
      AND role IN ('super_admin', 'admin')
    )
  );

-- INVOICE_REVERSALS
DROP POLICY IF EXISTS "Users can create invoice reversals" ON public.invoice_reversals;
CREATE POLICY "Users can create invoice reversals"
  ON public.invoice_reversals
  FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

-- INVOICE_REVERSAL_ITEMS
DROP POLICY IF EXISTS "Users can create invoice reversal items" ON public.invoice_reversal_items;
CREATE POLICY "Users can create invoice reversal items"
  ON public.invoice_reversal_items
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM invoice_reversals
      WHERE id = reversal_id
      AND user_id = (select auth.uid())
    )
  );

-- =====================================================
-- FIX FUNCTION SECURITY
-- =====================================================

-- Fix is_invoice_reversed function
CREATE OR REPLACE FUNCTION is_invoice_reversed(invoice_id_param uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM invoice_reversals
    WHERE original_invoice_id = invoice_id_param
  );
END;
$$;

-- Fix generate_order_number function
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  next_num integer;
  order_num text;
BEGIN
  SELECT COUNT(*) + 1 INTO next_num FROM supplier_orders;
  order_num := 'ORD-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(next_num::text, 4, '0');
  RETURN order_num;
END;
$$;

-- Fix update_supplier_orders_updated_at function
CREATE OR REPLACE FUNCTION update_supplier_orders_updated_at()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;
