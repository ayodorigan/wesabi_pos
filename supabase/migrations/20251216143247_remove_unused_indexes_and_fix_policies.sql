/*
  # Remove Unused Indexes and Fix Policy Conflicts

  1. Performance Improvements
    - Remove 33 unused indexes that consume storage and slow down writes
    - Indexes include those on stock_take_sessions, mpesa_transactions, sales, 
      products, invoices, credit_notes, and various user_id foreign keys
  
  2. Policy Consolidation
    - Fix multiple permissive policies on user_profiles table
    - Separate policies by action (SELECT, INSERT, UPDATE, DELETE) to avoid conflicts
    - Ensure proper access control while eliminating duplicate policies
*/

-- ============================================================================
-- PART 1: Remove Unused Indexes
-- ============================================================================

-- Stock take sessions indexes
DROP INDEX IF EXISTS public.idx_stock_take_sessions_created_at;

-- M-Pesa transaction indexes
DROP INDEX IF EXISTS public.idx_mpesa_checkout_request;
DROP INDEX IF EXISTS public.idx_mpesa_receipt_number;
DROP INDEX IF EXISTS public.idx_mpesa_bill_ref;
DROP INDEX IF EXISTS public.idx_mpesa_phone;
DROP INDEX IF EXISTS public.idx_mpesa_status;

-- Sales indexes
DROP INDEX IF EXISTS public.idx_sales_checkout_request;
DROP INDEX IF EXISTS public.idx_sales_payment_status;
DROP INDEX IF EXISTS public.idx_sales_mpesa_receipt;
DROP INDEX IF EXISTS public.idx_sales_created_at;
DROP INDEX IF EXISTS public.idx_sales_receipt_number;
DROP INDEX IF EXISTS public.idx_sales_sales_person_id;

-- Products indexes
DROP INDEX IF EXISTS public.idx_products_category;
DROP INDEX IF EXISTS public.idx_products_supplier;
DROP INDEX IF EXISTS public.idx_products_barcode;
DROP INDEX IF EXISTS public.idx_products_invoice_number;

-- Invoices indexes
DROP INDEX IF EXISTS public.idx_invoices_invoice_number;
DROP INDEX IF EXISTS public.idx_invoices_supplier;
DROP INDEX IF EXISTS public.idx_invoices_invoice_date;
DROP INDEX IF EXISTS public.idx_invoices_user_id;

-- Invoice items indexes
DROP INDEX IF EXISTS public.idx_invoice_items_product_id;

-- Credit notes indexes
DROP INDEX IF EXISTS public.idx_credit_notes_credit_note_number;
DROP INDEX IF EXISTS public.idx_credit_notes_invoice_id;
DROP INDEX IF EXISTS public.idx_credit_notes_supplier;
DROP INDEX IF EXISTS public.idx_credit_notes_user_id;

-- Credit note items indexes
DROP INDEX IF EXISTS public.idx_credit_note_items_product_id;

-- Stock takes indexes
DROP INDEX IF EXISTS public.idx_stock_takes_product_id;
DROP INDEX IF EXISTS public.idx_stock_takes_user_id;

-- Other unused indexes
DROP INDEX IF EXISTS public.idx_activity_logs_user_id;
DROP INDEX IF EXISTS public.idx_price_history_user_id;
DROP INDEX IF EXISTS public.idx_sale_items_product_id;
DROP INDEX IF EXISTS public.idx_stock_take_sessions_user_id;

-- ============================================================================
-- PART 2: Fix Multiple Permissive Policies on user_profiles
-- ============================================================================

-- Drop existing conflicting policies
DROP POLICY IF EXISTS "Users can read and manage own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Super admins have full access" ON public.user_profiles;

-- Create separate policies for each action to avoid conflicts

-- SELECT policies
CREATE POLICY "Users can read own profile"
  ON public.user_profiles
  FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

CREATE POLICY "Super admins can read all profiles"
  ON public.user_profiles
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_id = (select auth.uid())
      AND role = 'super_admin'
    )
  );

-- INSERT policies
CREATE POLICY "Users can create own profile"
  ON public.user_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Super admins can insert profiles"
  ON public.user_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_id = (select auth.uid())
      AND role = 'super_admin'
    )
  );

-- UPDATE policies
CREATE POLICY "Users can update own profile"
  ON public.user_profiles
  FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Super admins can update all profiles"
  ON public.user_profiles
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_id = (select auth.uid())
      AND role = 'super_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_id = (select auth.uid())
      AND role = 'super_admin'
    )
  );

-- DELETE policies
CREATE POLICY "Super admins can delete profiles"
  ON public.user_profiles
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_id = (select auth.uid())
      AND role = 'super_admin'
    )
  );