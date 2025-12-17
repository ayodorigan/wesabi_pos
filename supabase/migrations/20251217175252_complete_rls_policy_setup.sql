/*
  # Complete RLS Policy Setup for Production

  1. Purpose
    - Drop all existing policies
    - Create clean, comprehensive policies for all tables
    - Ensure all authenticated users can perform necessary operations
    - Restrict only destructive operations to admins

  2. Tables Covered
    - user_profiles
    - products
    - invoices, invoice_items
    - credit_notes, credit_note_items
    - sales, sale_items
    - stock_takes, stock_take_sessions
    - price_history
    - activity_logs
    - supplier_orders, supplier_order_items
    - mpesa_transactions, mpesa_config

  3. Security Model
    - All authenticated users can READ all data
    - All authenticated users can INSERT/UPDATE most data
    - Only admins can DELETE most data
    - Special cases handled per table
*/

-- =====================================================
-- DROP ALL EXISTING POLICIES
-- =====================================================
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT tablename, policyname FROM pg_policies WHERE schemaname = 'public') LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.policyname, r.tablename);
    END LOOP;
END $$;

-- =====================================================
-- USER_PROFILES
-- =====================================================
CREATE POLICY "user_profiles_select"
  ON public.user_profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "user_profiles_insert"
  ON public.user_profiles FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_id = auth.uid()
      AND role IN ('super_admin', 'admin')
    )
  );

CREATE POLICY "user_profiles_update"
  ON public.user_profiles FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_id = auth.uid()
      AND role IN ('super_admin', 'admin')
    )
  )
  WITH CHECK (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_id = auth.uid()
      AND role IN ('super_admin', 'admin')
    )
  );

CREATE POLICY "user_profiles_delete"
  ON public.user_profiles FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_id = auth.uid()
      AND role IN ('super_admin', 'admin')
    )
  );

-- =====================================================
-- PRODUCTS
-- =====================================================
CREATE POLICY "products_select"
  ON public.products FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "products_insert"
  ON public.products FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "products_update"
  ON public.products FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "products_delete"
  ON public.products FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_id = auth.uid()
      AND role IN ('super_admin', 'admin')
    )
  );

-- =====================================================
-- INVOICES
-- =====================================================
CREATE POLICY "invoices_select"
  ON public.invoices FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "invoices_insert"
  ON public.invoices FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "invoices_update"
  ON public.invoices FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "invoices_delete"
  ON public.invoices FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_id = auth.uid()
      AND role IN ('super_admin', 'admin')
    )
  );

-- =====================================================
-- INVOICE_ITEMS
-- =====================================================
CREATE POLICY "invoice_items_select"
  ON public.invoice_items FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "invoice_items_insert"
  ON public.invoice_items FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "invoice_items_update"
  ON public.invoice_items FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "invoice_items_delete"
  ON public.invoice_items FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_id = auth.uid()
      AND role IN ('super_admin', 'admin')
    )
  );

-- =====================================================
-- CREDIT_NOTES
-- =====================================================
CREATE POLICY "credit_notes_select"
  ON public.credit_notes FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "credit_notes_insert"
  ON public.credit_notes FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "credit_notes_update"
  ON public.credit_notes FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "credit_notes_delete"
  ON public.credit_notes FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_id = auth.uid()
      AND role IN ('super_admin', 'admin')
    )
  );

-- =====================================================
-- CREDIT_NOTE_ITEMS
-- =====================================================
CREATE POLICY "credit_note_items_select"
  ON public.credit_note_items FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "credit_note_items_insert"
  ON public.credit_note_items FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "credit_note_items_update"
  ON public.credit_note_items FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "credit_note_items_delete"
  ON public.credit_note_items FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_id = auth.uid()
      AND role IN ('super_admin', 'admin')
    )
  );

-- =====================================================
-- SALES
-- =====================================================
CREATE POLICY "sales_select"
  ON public.sales FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "sales_insert"
  ON public.sales FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "sales_update"
  ON public.sales FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "sales_delete"
  ON public.sales FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_id = auth.uid()
      AND role IN ('super_admin', 'admin')
    )
  );

-- =====================================================
-- SALE_ITEMS
-- =====================================================
CREATE POLICY "sale_items_select"
  ON public.sale_items FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "sale_items_insert"
  ON public.sale_items FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "sale_items_update"
  ON public.sale_items FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "sale_items_delete"
  ON public.sale_items FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_id = auth.uid()
      AND role IN ('super_admin', 'admin')
    )
  );

-- =====================================================
-- PRICE_HISTORY
-- =====================================================
CREATE POLICY "price_history_select"
  ON public.price_history FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "price_history_insert"
  ON public.price_history FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "price_history_update"
  ON public.price_history FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "price_history_delete"
  ON public.price_history FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_id = auth.uid()
      AND role IN ('super_admin', 'admin')
    )
  );

-- =====================================================
-- STOCK_TAKES
-- =====================================================
CREATE POLICY "stock_takes_select"
  ON public.stock_takes FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "stock_takes_insert"
  ON public.stock_takes FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "stock_takes_update"
  ON public.stock_takes FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "stock_takes_delete"
  ON public.stock_takes FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_id = auth.uid()
      AND role IN ('super_admin', 'admin')
    )
  );

-- =====================================================
-- STOCK_TAKE_SESSIONS
-- =====================================================
CREATE POLICY "stock_take_sessions_select"
  ON public.stock_take_sessions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "stock_take_sessions_insert"
  ON public.stock_take_sessions FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "stock_take_sessions_update"
  ON public.stock_take_sessions FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "stock_take_sessions_delete"
  ON public.stock_take_sessions FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_id = auth.uid()
      AND role IN ('super_admin', 'admin')
    )
  );

-- =====================================================
-- ACTIVITY_LOGS
-- =====================================================
CREATE POLICY "activity_logs_select"
  ON public.activity_logs FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "activity_logs_insert"
  ON public.activity_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "activity_logs_update"
  ON public.activity_logs FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "activity_logs_delete"
  ON public.activity_logs FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_id = auth.uid()
      AND role IN ('super_admin', 'admin')
    )
  );

-- =====================================================
-- SUPPLIER_ORDERS
-- =====================================================
CREATE POLICY "supplier_orders_select"
  ON public.supplier_orders FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "supplier_orders_insert"
  ON public.supplier_orders FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "supplier_orders_update"
  ON public.supplier_orders FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "supplier_orders_delete"
  ON public.supplier_orders FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_id = auth.uid()
      AND role IN ('super_admin', 'admin')
    )
  );

-- =====================================================
-- SUPPLIER_ORDER_ITEMS
-- =====================================================
CREATE POLICY "supplier_order_items_select"
  ON public.supplier_order_items FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "supplier_order_items_insert"
  ON public.supplier_order_items FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "supplier_order_items_update"
  ON public.supplier_order_items FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "supplier_order_items_delete"
  ON public.supplier_order_items FOR DELETE
  TO authenticated
  USING (true);

-- =====================================================
-- MPESA_TRANSACTIONS
-- =====================================================
CREATE POLICY "mpesa_transactions_select"
  ON public.mpesa_transactions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "mpesa_transactions_insert"
  ON public.mpesa_transactions FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "mpesa_transactions_update"
  ON public.mpesa_transactions FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "mpesa_transactions_delete"
  ON public.mpesa_transactions FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_id = auth.uid()
      AND role IN ('super_admin', 'admin')
    )
  );

-- =====================================================
-- MPESA_CONFIG
-- =====================================================
CREATE POLICY "mpesa_config_select"
  ON public.mpesa_config FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "mpesa_config_insert"
  ON public.mpesa_config FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_id = auth.uid()
      AND role IN ('super_admin', 'admin')
    )
  );

CREATE POLICY "mpesa_config_update"
  ON public.mpesa_config FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_id = auth.uid()
      AND role IN ('super_admin', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_id = auth.uid()
      AND role IN ('super_admin', 'admin')
    )
  );

CREATE POLICY "mpesa_config_delete"
  ON public.mpesa_config FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_id = auth.uid()
      AND role IN ('super_admin', 'admin')
    )
  );