/*
  # Fix Security and Performance Issues

  1. Performance Improvements
    - Add indexes on all unindexed foreign keys
      - activity_logs.user_id
      - credit_notes.user_id
      - invoices.user_id
      - price_history.user_id
      - sale_items.product_id
      - sales.sales_person_id
      - stock_take_sessions.user_id
      - stock_takes.user_id
  
  2. RLS Policy Optimization
    - Update all RLS policies to use `(select auth.uid())` instead of `auth.uid()`
    - This prevents re-evaluation for each row, improving query performance at scale
  
  3. Multiple Permissive Policies
    - Consolidate duplicate policies on mpesa_config and user_profiles tables
  
  4. Function Security
    - Fix search_path for functions to prevent security vulnerabilities
*/

-- ============================================================================
-- PART 1: Add Indexes on Unindexed Foreign Keys
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON public.activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_notes_user_id ON public.credit_notes(user_id);
CREATE INDEX IF NOT EXISTS idx_invoices_user_id ON public.invoices(user_id);
CREATE INDEX IF NOT EXISTS idx_price_history_user_id ON public.price_history(user_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_product_id ON public.sale_items(product_id);
CREATE INDEX IF NOT EXISTS idx_sales_sales_person_id ON public.sales(sales_person_id);
CREATE INDEX IF NOT EXISTS idx_stock_take_sessions_user_id ON public.stock_take_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_stock_takes_user_id ON public.stock_takes(user_id);

-- ============================================================================
-- PART 2: Fix RLS Policies - Drop Old Policies
-- ============================================================================

-- Drop old sales policies
DROP POLICY IF EXISTS "Sales users can insert sales" ON public.sales;
DROP POLICY IF EXISTS "Sales users can read sales" ON public.sales;

-- Drop old user_profiles policies
DROP POLICY IF EXISTS "Allow initial profile creation" ON public.user_profiles;
DROP POLICY IF EXISTS "Super admins can delete profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Super admins can insert profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Super admins can read all profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Super admins can update all profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can read own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profiles;

-- Drop old products policies
DROP POLICY IF EXISTS "Inventory managers can insert products" ON public.products;
DROP POLICY IF EXISTS "Inventory managers can update products" ON public.products;
DROP POLICY IF EXISTS "Only admins can delete products" ON public.products;

-- Drop old invoices policies
DROP POLICY IF EXISTS "Admins can delete invoices" ON public.invoices;
DROP POLICY IF EXISTS "Inventory managers can insert invoices" ON public.invoices;
DROP POLICY IF EXISTS "Inventory managers can read invoices" ON public.invoices;
DROP POLICY IF EXISTS "Inventory managers can update invoices" ON public.invoices;

-- Drop old invoice_items policies
DROP POLICY IF EXISTS "Admins can delete invoice_items" ON public.invoice_items;
DROP POLICY IF EXISTS "Inventory managers can insert invoice_items" ON public.invoice_items;
DROP POLICY IF EXISTS "Inventory managers can read invoice_items" ON public.invoice_items;
DROP POLICY IF EXISTS "Inventory managers can update invoice_items" ON public.invoice_items;

-- Drop old credit_notes policies
DROP POLICY IF EXISTS "Admins can delete credit_notes" ON public.credit_notes;
DROP POLICY IF EXISTS "Inventory managers can insert credit_notes" ON public.credit_notes;
DROP POLICY IF EXISTS "Inventory managers can read credit_notes" ON public.credit_notes;
DROP POLICY IF EXISTS "Inventory managers can update credit_notes" ON public.credit_notes;

-- Drop old credit_note_items policies
DROP POLICY IF EXISTS "Admins can delete credit_note_items" ON public.credit_note_items;
DROP POLICY IF EXISTS "Inventory managers can insert credit_note_items" ON public.credit_note_items;
DROP POLICY IF EXISTS "Inventory managers can read credit_note_items" ON public.credit_note_items;
DROP POLICY IF EXISTS "Inventory managers can update credit_note_items" ON public.credit_note_items;

-- Drop old sale_items policies
DROP POLICY IF EXISTS "Sales users can insert sale_items" ON public.sale_items;
DROP POLICY IF EXISTS "Sales users can read sale_items" ON public.sale_items;

-- Drop old stock_takes policies
DROP POLICY IF EXISTS "Stock take users can delete stock_takes" ON public.stock_takes;
DROP POLICY IF EXISTS "Stock take users can insert stock_takes" ON public.stock_takes;
DROP POLICY IF EXISTS "Stock take users can read stock_takes" ON public.stock_takes;
DROP POLICY IF EXISTS "Stock take users can update stock_takes" ON public.stock_takes;

-- Drop old activity_logs policies
DROP POLICY IF EXISTS "Admins can read activity_logs" ON public.activity_logs;

-- Drop old stock_take_sessions policies
DROP POLICY IF EXISTS "Stock take users can delete sessions" ON public.stock_take_sessions;
DROP POLICY IF EXISTS "Stock take users can insert sessions" ON public.stock_take_sessions;
DROP POLICY IF EXISTS "Stock take users can read sessions" ON public.stock_take_sessions;
DROP POLICY IF EXISTS "Stock take users can update sessions" ON public.stock_take_sessions;

-- Drop old mpesa_config policies (to consolidate duplicates)
DROP POLICY IF EXISTS "Authenticated users can manage mpesa config" ON public.mpesa_config;
DROP POLICY IF EXISTS "Authenticated users can view mpesa config" ON public.mpesa_config;

-- ============================================================================
-- PART 3: Create Optimized RLS Policies
-- ============================================================================

-- Sales policies (optimized)
CREATE POLICY "Sales users can insert sales"
  ON public.sales
  FOR INSERT
  TO authenticated
  WITH CHECK (
    sales_person_id = (select auth.uid()) AND
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_id = (select auth.uid())
      AND role IN ('admin', 'super_admin', 'cashier')
    )
  );

CREATE POLICY "Sales users can read sales"
  ON public.sales
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_id = (select auth.uid())
      AND role IN ('admin', 'super_admin', 'cashier')
    )
  );

-- User profiles policies (optimized and consolidated)
CREATE POLICY "Users can read and manage own profile"
  ON public.user_profiles
  FOR ALL
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Super admins have full access"
  ON public.user_profiles
  FOR ALL
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

-- Products policies (optimized)
CREATE POLICY "Inventory managers can insert products"
  ON public.products
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_id = (select auth.uid())
      AND role IN ('admin', 'super_admin', 'inventory_manager')
    )
  );

CREATE POLICY "Inventory managers can update products"
  ON public.products
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_id = (select auth.uid())
      AND role IN ('admin', 'super_admin', 'inventory_manager')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_id = (select auth.uid())
      AND role IN ('admin', 'super_admin', 'inventory_manager')
    )
  );

CREATE POLICY "Only admins can delete products"
  ON public.products
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_id = (select auth.uid())
      AND role IN ('admin', 'super_admin')
    )
  );

-- Invoices policies (optimized)
CREATE POLICY "Inventory managers can read invoices"
  ON public.invoices
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_id = (select auth.uid())
      AND role IN ('admin', 'super_admin', 'inventory_manager')
    )
  );

CREATE POLICY "Inventory managers can insert invoices"
  ON public.invoices
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = (select auth.uid()) AND
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_id = (select auth.uid())
      AND role IN ('admin', 'super_admin', 'inventory_manager')
    )
  );

CREATE POLICY "Inventory managers can update invoices"
  ON public.invoices
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_id = (select auth.uid())
      AND role IN ('admin', 'super_admin', 'inventory_manager')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_id = (select auth.uid())
      AND role IN ('admin', 'super_admin', 'inventory_manager')
    )
  );

CREATE POLICY "Admins can delete invoices"
  ON public.invoices
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_id = (select auth.uid())
      AND role IN ('admin', 'super_admin')
    )
  );

-- Invoice items policies (optimized)
CREATE POLICY "Inventory managers can read invoice_items"
  ON public.invoice_items
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_id = (select auth.uid())
      AND role IN ('admin', 'super_admin', 'inventory_manager')
    )
  );

CREATE POLICY "Inventory managers can insert invoice_items"
  ON public.invoice_items
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_id = (select auth.uid())
      AND role IN ('admin', 'super_admin', 'inventory_manager')
    )
  );

CREATE POLICY "Inventory managers can update invoice_items"
  ON public.invoice_items
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_id = (select auth.uid())
      AND role IN ('admin', 'super_admin', 'inventory_manager')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_id = (select auth.uid())
      AND role IN ('admin', 'super_admin', 'inventory_manager')
    )
  );

CREATE POLICY "Admins can delete invoice_items"
  ON public.invoice_items
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_id = (select auth.uid())
      AND role IN ('admin', 'super_admin')
    )
  );

-- Credit notes policies (optimized)
CREATE POLICY "Inventory managers can read credit_notes"
  ON public.credit_notes
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_id = (select auth.uid())
      AND role IN ('admin', 'super_admin', 'inventory_manager')
    )
  );

CREATE POLICY "Inventory managers can insert credit_notes"
  ON public.credit_notes
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = (select auth.uid()) AND
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_id = (select auth.uid())
      AND role IN ('admin', 'super_admin', 'inventory_manager')
    )
  );

CREATE POLICY "Inventory managers can update credit_notes"
  ON public.credit_notes
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_id = (select auth.uid())
      AND role IN ('admin', 'super_admin', 'inventory_manager')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_id = (select auth.uid())
      AND role IN ('admin', 'super_admin', 'inventory_manager')
    )
  );

CREATE POLICY "Admins can delete credit_notes"
  ON public.credit_notes
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_id = (select auth.uid())
      AND role IN ('admin', 'super_admin')
    )
  );

-- Credit note items policies (optimized)
CREATE POLICY "Inventory managers can read credit_note_items"
  ON public.credit_note_items
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_id = (select auth.uid())
      AND role IN ('admin', 'super_admin', 'inventory_manager')
    )
  );

CREATE POLICY "Inventory managers can insert credit_note_items"
  ON public.credit_note_items
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_id = (select auth.uid())
      AND role IN ('admin', 'super_admin', 'inventory_manager')
    )
  );

CREATE POLICY "Inventory managers can update credit_note_items"
  ON public.credit_note_items
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_id = (select auth.uid())
      AND role IN ('admin', 'super_admin', 'inventory_manager')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_id = (select auth.uid())
      AND role IN ('admin', 'super_admin', 'inventory_manager')
    )
  );

CREATE POLICY "Admins can delete credit_note_items"
  ON public.credit_note_items
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_id = (select auth.uid())
      AND role IN ('admin', 'super_admin')
    )
  );

-- Sale items policies (optimized)
CREATE POLICY "Sales users can read sale_items"
  ON public.sale_items
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_id = (select auth.uid())
      AND role IN ('admin', 'super_admin', 'cashier')
    )
  );

CREATE POLICY "Sales users can insert sale_items"
  ON public.sale_items
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_id = (select auth.uid())
      AND role IN ('admin', 'super_admin', 'cashier')
    )
  );

-- Stock takes policies (optimized)
CREATE POLICY "Stock take users can read stock_takes"
  ON public.stock_takes
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_id = (select auth.uid())
      AND role IN ('admin', 'super_admin', 'inventory_manager')
    )
  );

CREATE POLICY "Stock take users can insert stock_takes"
  ON public.stock_takes
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = (select auth.uid()) AND
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_id = (select auth.uid())
      AND role IN ('admin', 'super_admin', 'inventory_manager')
    )
  );

CREATE POLICY "Stock take users can update stock_takes"
  ON public.stock_takes
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_id = (select auth.uid())
      AND role IN ('admin', 'super_admin', 'inventory_manager')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_id = (select auth.uid())
      AND role IN ('admin', 'super_admin', 'inventory_manager')
    )
  );

CREATE POLICY "Stock take users can delete stock_takes"
  ON public.stock_takes
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_id = (select auth.uid())
      AND role IN ('admin', 'super_admin', 'inventory_manager')
    )
  );

-- Activity logs policies (optimized)
CREATE POLICY "Admins can read activity_logs"
  ON public.activity_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_id = (select auth.uid())
      AND role IN ('admin', 'super_admin')
    )
  );

-- Stock take sessions policies (optimized)
CREATE POLICY "Stock take users can read sessions"
  ON public.stock_take_sessions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_id = (select auth.uid())
      AND role IN ('admin', 'super_admin', 'inventory_manager')
    )
  );

CREATE POLICY "Stock take users can insert sessions"
  ON public.stock_take_sessions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = (select auth.uid()) AND
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_id = (select auth.uid())
      AND role IN ('admin', 'super_admin', 'inventory_manager')
    )
  );

CREATE POLICY "Stock take users can update sessions"
  ON public.stock_take_sessions
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_id = (select auth.uid())
      AND role IN ('admin', 'super_admin', 'inventory_manager')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_id = (select auth.uid())
      AND role IN ('admin', 'super_admin', 'inventory_manager')
    )
  );

CREATE POLICY "Stock take users can delete sessions"
  ON public.stock_take_sessions
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_id = (select auth.uid())
      AND role IN ('admin', 'super_admin', 'inventory_manager')
    )
  );

-- M-Pesa config policies (consolidated)
CREATE POLICY "Authenticated users can manage mpesa config"
  ON public.mpesa_config
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- PART 4: Fix Function Search Paths
-- ============================================================================

DROP FUNCTION IF EXISTS public.has_any_users();
DROP FUNCTION IF EXISTS public.get_all_users_with_emails();

CREATE FUNCTION public.has_any_users()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN EXISTS (SELECT 1 FROM public.user_profiles LIMIT 1);
END;
$$;

CREATE FUNCTION public.get_all_users_with_emails()
RETURNS TABLE (
  user_id uuid,
  email text,
  name text,
  role text,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    up.user_id,
    au.email,
    up.name,
    up.role,
    up.created_at
  FROM public.user_profiles up
  INNER JOIN auth.users au ON up.user_id = au.id
  ORDER BY up.created_at DESC;
END;
$$;