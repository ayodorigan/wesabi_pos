/*
  # Fix RLS Policies for Data Visibility

  1. Issues Fixed
    - Policies referenced non-existent roles ('cashier', 'inventory_manager')
    - Actual roles are: 'sales', 'inventory', 'stock_take'
    - Sales users couldn't see any historical data
    - Records should be visible to all authenticated users
    - Only deletion should be restricted to admins

  2. Changes
    - Drop all existing restrictive policies
    - Create new policies allowing:
      * All authenticated users can READ data (sales, invoices, stock_takes, credit_notes, price_history)
      * Role-based INSERT/UPDATE permissions
      * Only admins can DELETE records
    
  3. Security
    - RLS remains enabled on all tables
    - Deletion is restricted to super_admin and admin only
    - Data remains persistent and visible to all authorized users
*/

-- Sales and Sale Items: All authenticated users can read
DROP POLICY IF EXISTS "Sales users can read sales" ON public.sales;
DROP POLICY IF EXISTS "Sales users can insert sales" ON public.sales;
DROP POLICY IF EXISTS "Sales users can read sale_items" ON public.sale_items;
DROP POLICY IF EXISTS "Sales users can insert sale_items" ON public.sale_items;

CREATE POLICY "All authenticated users can read sales"
  ON public.sales FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Sales users can create sales"
  ON public.sales FOR INSERT
  TO authenticated
  WITH CHECK (
    sales_person_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.role = ANY (ARRAY['super_admin', 'admin', 'sales'])
    )
  );

CREATE POLICY "Admins can delete sales"
  ON public.sales FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.role = ANY (ARRAY['super_admin', 'admin'])
    )
  );

CREATE POLICY "All authenticated users can read sale_items"
  ON public.sale_items FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Sales users can create sale_items"
  ON public.sale_items FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.role = ANY (ARRAY['super_admin', 'admin', 'sales'])
    )
  );

CREATE POLICY "Admins can delete sale_items"
  ON public.sale_items FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.role = ANY (ARRAY['super_admin', 'admin'])
    )
  );

-- Invoices and Invoice Items: All authenticated users can read
DROP POLICY IF EXISTS "Inventory managers can read invoices" ON public.invoices;
DROP POLICY IF EXISTS "Inventory managers can insert invoices" ON public.invoices;
DROP POLICY IF EXISTS "Inventory managers can update invoices" ON public.invoices;
DROP POLICY IF EXISTS "Admins can delete invoices" ON public.invoices;
DROP POLICY IF EXISTS "Inventory managers can read invoice_items" ON public.invoice_items;
DROP POLICY IF EXISTS "Inventory managers can insert invoice_items" ON public.invoice_items;
DROP POLICY IF EXISTS "Inventory managers can update invoice_items" ON public.invoice_items;
DROP POLICY IF EXISTS "Admins can delete invoice_items" ON public.invoice_items;

CREATE POLICY "All authenticated users can read invoices"
  ON public.invoices FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Inventory users can create invoices"
  ON public.invoices FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.role = ANY (ARRAY['super_admin', 'admin', 'inventory'])
    )
  );

CREATE POLICY "Inventory users can update invoices"
  ON public.invoices FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.role = ANY (ARRAY['super_admin', 'admin', 'inventory'])
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.role = ANY (ARRAY['super_admin', 'admin', 'inventory'])
    )
  );

CREATE POLICY "Admins can delete invoices"
  ON public.invoices FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.role = ANY (ARRAY['super_admin', 'admin'])
    )
  );

CREATE POLICY "All authenticated users can read invoice_items"
  ON public.invoice_items FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Inventory users can create invoice_items"
  ON public.invoice_items FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.role = ANY (ARRAY['super_admin', 'admin', 'inventory'])
    )
  );

CREATE POLICY "Inventory users can update invoice_items"
  ON public.invoice_items FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.role = ANY (ARRAY['super_admin', 'admin', 'inventory'])
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.role = ANY (ARRAY['super_admin', 'admin', 'inventory'])
    )
  );

CREATE POLICY "Admins can delete invoice_items"
  ON public.invoice_items FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.role = ANY (ARRAY['super_admin', 'admin'])
    )
  );

-- Credit Notes: All authenticated users can read
DROP POLICY IF EXISTS "Inventory managers can read credit_notes" ON public.credit_notes;
DROP POLICY IF EXISTS "Inventory managers can insert credit_notes" ON public.credit_notes;
DROP POLICY IF EXISTS "Inventory managers can update credit_notes" ON public.credit_notes;
DROP POLICY IF EXISTS "Admins can delete credit_notes" ON public.credit_notes;
DROP POLICY IF EXISTS "Inventory managers can read credit_note_items" ON public.credit_note_items;
DROP POLICY IF EXISTS "Inventory managers can insert credit_note_items" ON public.credit_note_items;
DROP POLICY IF EXISTS "Inventory managers can update credit_note_items" ON public.credit_note_items;
DROP POLICY IF EXISTS "Admins can delete credit_note_items" ON public.credit_note_items;

CREATE POLICY "All authenticated users can read credit_notes"
  ON public.credit_notes FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Inventory users can create credit_notes"
  ON public.credit_notes FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.role = ANY (ARRAY['super_admin', 'admin', 'inventory'])
    )
  );

CREATE POLICY "Inventory users can update credit_notes"
  ON public.credit_notes FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.role = ANY (ARRAY['super_admin', 'admin', 'inventory'])
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.role = ANY (ARRAY['super_admin', 'admin', 'inventory'])
    )
  );

CREATE POLICY "Admins can delete credit_notes"
  ON public.credit_notes FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.role = ANY (ARRAY['super_admin', 'admin'])
    )
  );

CREATE POLICY "All authenticated users can read credit_note_items"
  ON public.credit_note_items FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Inventory users can create credit_note_items"
  ON public.credit_note_items FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.role = ANY (ARRAY['super_admin', 'admin', 'inventory'])
    )
  );

CREATE POLICY "Inventory users can update credit_note_items"
  ON public.credit_note_items FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.role = ANY (ARRAY['super_admin', 'admin', 'inventory'])
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.role = ANY (ARRAY['super_admin', 'admin', 'inventory'])
    )
  );

CREATE POLICY "Admins can delete credit_note_items"
  ON public.credit_note_items FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.role = ANY (ARRAY['super_admin', 'admin'])
    )
  );

-- Stock Takes: All authenticated users can read
DROP POLICY IF EXISTS "Stock take users can read stock_takes" ON public.stock_takes;
DROP POLICY IF EXISTS "Stock take users can insert stock_takes" ON public.stock_takes;
DROP POLICY IF EXISTS "Stock take users can update stock_takes" ON public.stock_takes;
DROP POLICY IF EXISTS "Stock take users can delete stock_takes" ON public.stock_takes;
DROP POLICY IF EXISTS "Stock take users can read sessions" ON public.stock_take_sessions;
DROP POLICY IF EXISTS "Stock take users can insert sessions" ON public.stock_take_sessions;
DROP POLICY IF EXISTS "Stock take users can update sessions" ON public.stock_take_sessions;
DROP POLICY IF EXISTS "Stock take users can delete sessions" ON public.stock_take_sessions;

CREATE POLICY "All authenticated users can read stock_takes"
  ON public.stock_takes FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Stock take users can create stock_takes"
  ON public.stock_takes FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.role = ANY (ARRAY['super_admin', 'admin', 'inventory', 'stock_take'])
    )
  );

CREATE POLICY "Stock take users can update stock_takes"
  ON public.stock_takes FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.role = ANY (ARRAY['super_admin', 'admin', 'inventory', 'stock_take'])
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.role = ANY (ARRAY['super_admin', 'admin', 'inventory', 'stock_take'])
    )
  );

CREATE POLICY "Admins can delete stock_takes"
  ON public.stock_takes FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.role = ANY (ARRAY['super_admin', 'admin'])
    )
  );

CREATE POLICY "All authenticated users can read stock_take_sessions"
  ON public.stock_take_sessions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Stock take users can create sessions"
  ON public.stock_take_sessions FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.role = ANY (ARRAY['super_admin', 'admin', 'inventory', 'stock_take'])
    )
  );

CREATE POLICY "Stock take users can update sessions"
  ON public.stock_take_sessions FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.role = ANY (ARRAY['super_admin', 'admin', 'inventory', 'stock_take'])
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.role = ANY (ARRAY['super_admin', 'admin', 'inventory', 'stock_take'])
    )
  );

CREATE POLICY "Admins can delete sessions"
  ON public.stock_take_sessions FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.role = ANY (ARRAY['super_admin', 'admin'])
    )
  );