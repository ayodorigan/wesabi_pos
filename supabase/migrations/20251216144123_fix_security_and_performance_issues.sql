/*
  # Fix Security and Performance Issues

  1. Add Missing Indexes on Foreign Keys
    - Adds indexes to all foreign key columns for optimal query performance
    - Improves JOIN performance and foreign key constraint checking
    - Uses IF NOT EXISTS to avoid errors on re-run

  2. Optimize RLS Policies
    - Wraps auth.uid() calls with (SELECT auth.uid()) to avoid re-evaluation per row
    - Significantly improves query performance at scale

  3. Tables affected:
    - activity_logs
    - credit_note_items
    - credit_notes
    - invoice_items
    - invoices
    - price_history
    - sale_items
    - sales
    - stock_take_sessions
    - stock_takes
    - user_profiles (policies)
*/

-- Add indexes for foreign keys
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON public.activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_note_items_product_id ON public.credit_note_items(product_id);
CREATE INDEX IF NOT EXISTS idx_credit_notes_invoice_id ON public.credit_notes(invoice_id);
CREATE INDEX IF NOT EXISTS idx_credit_notes_user_id ON public.credit_notes(user_id);
CREATE INDEX IF NOT EXISTS idx_invoice_items_product_id ON public.invoice_items(product_id);
CREATE INDEX IF NOT EXISTS idx_invoices_user_id ON public.invoices(user_id);
CREATE INDEX IF NOT EXISTS idx_price_history_user_id ON public.price_history(user_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_product_id ON public.sale_items(product_id);
CREATE INDEX IF NOT EXISTS idx_sales_sales_person_id ON public.sales(sales_person_id);
CREATE INDEX IF NOT EXISTS idx_stock_take_sessions_user_id ON public.stock_take_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_stock_takes_product_id ON public.stock_takes(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_takes_user_id ON public.stock_takes(user_id);

-- Optimize user_profiles RLS policies
-- Replace auth.uid() with (SELECT auth.uid()) to avoid re-evaluation per row

DROP POLICY IF EXISTS "Users can read own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can create own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profiles;

CREATE POLICY "Users can read own profile"
  ON public.user_profiles
  FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can create own profile"
  ON public.user_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can update own profile"
  ON public.user_profiles
  FOR UPDATE
  TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));