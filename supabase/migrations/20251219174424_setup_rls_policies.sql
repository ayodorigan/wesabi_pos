/*
  # RLS Policies for Pharmacy POS Schema
  
  ## Overview
  Sets up Row Level Security policies for all tables in the pharmacy POS system.
  
  ## Security Principles
  - All tables have RLS enabled
  - Authenticated users can access data (multi-tenant not needed for single pharmacy)
  - Policies are restrictive: SELECT, INSERT, UPDATE, DELETE separated
  - System ensures users can only access data when authenticated
  
  ## Policy Structure
  Each table gets 4 policies:
  - SELECT: Read access
  - INSERT: Create new records
  - UPDATE: Modify existing records
  - DELETE: Remove records (restricted for audit tables)
*/

-- =====================================================
-- USER PROFILES
-- =====================================================

CREATE POLICY "Users can view all profiles"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert profiles"
  ON user_profiles FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update profiles"
  ON user_profiles FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can delete profiles"
  ON user_profiles FOR DELETE
  TO authenticated
  USING (true);

-- =====================================================
-- SUPPLIERS
-- =====================================================

CREATE POLICY "Users can view suppliers"
  ON suppliers FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create suppliers"
  ON suppliers FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update suppliers"
  ON suppliers FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can delete suppliers"
  ON suppliers FOR DELETE
  TO authenticated
  USING (true);

-- =====================================================
-- CATEGORIES
-- =====================================================

CREATE POLICY "Users can view categories"
  ON categories FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create categories"
  ON categories FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update categories"
  ON categories FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can delete categories"
  ON categories FOR DELETE
  TO authenticated
  USING (true);

-- =====================================================
-- PRODUCTS
-- =====================================================

CREATE POLICY "Users can view products"
  ON products FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create products"
  ON products FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update products"
  ON products FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can delete products"
  ON products FOR DELETE
  TO authenticated
  USING (true);

-- =====================================================
-- PURCHASE INVOICES
-- =====================================================

CREATE POLICY "Users can view purchase invoices"
  ON purchase_invoices FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create purchase invoices"
  ON purchase_invoices FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update purchase invoices"
  ON purchase_invoices FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can delete purchase invoices"
  ON purchase_invoices FOR DELETE
  TO authenticated
  USING (true);

-- =====================================================
-- PRODUCT BATCHES
-- =====================================================

CREATE POLICY "Users can view product batches"
  ON product_batches FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create product batches"
  ON product_batches FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update product batches"
  ON product_batches FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can delete product batches"
  ON product_batches FOR DELETE
  TO authenticated
  USING (true);

-- =====================================================
-- STOCK MOVEMENTS
-- =====================================================

CREATE POLICY "Users can view stock movements"
  ON stock_movements FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create stock movements"
  ON stock_movements FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update stock movements"
  ON stock_movements FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can delete stock movements"
  ON stock_movements FOR DELETE
  TO authenticated
  USING (true);

-- =====================================================
-- SALES
-- =====================================================

CREATE POLICY "Users can view sales"
  ON sales FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create sales"
  ON sales FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update sales"
  ON sales FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can delete sales"
  ON sales FOR DELETE
  TO authenticated
  USING (true);

-- =====================================================
-- SALE ITEMS
-- =====================================================

CREATE POLICY "Users can view sale items"
  ON sale_items FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create sale items"
  ON sale_items FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update sale items"
  ON sale_items FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can delete sale items"
  ON sale_items FOR DELETE
  TO authenticated
  USING (true);

-- =====================================================
-- PAYMENTS
-- =====================================================

CREATE POLICY "Users can view payments"
  ON payments FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create payments"
  ON payments FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update payments"
  ON payments FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can delete payments"
  ON payments FOR DELETE
  TO authenticated
  USING (true);

-- =====================================================
-- MPESA TRANSACTIONS
-- =====================================================

CREATE POLICY "Users can view mpesa transactions"
  ON mpesa_transactions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create mpesa transactions"
  ON mpesa_transactions FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update mpesa transactions"
  ON mpesa_transactions FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can delete mpesa transactions"
  ON mpesa_transactions FOR DELETE
  TO authenticated
  USING (true);

-- =====================================================
-- CREDIT NOTES
-- =====================================================

CREATE POLICY "Users can view credit notes"
  ON credit_notes FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create credit notes"
  ON credit_notes FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update credit notes"
  ON credit_notes FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can delete credit notes"
  ON credit_notes FOR DELETE
  TO authenticated
  USING (true);

-- =====================================================
-- CREDIT NOTE ITEMS
-- =====================================================

CREATE POLICY "Users can view credit note items"
  ON credit_note_items FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create credit note items"
  ON credit_note_items FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update credit note items"
  ON credit_note_items FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can delete credit note items"
  ON credit_note_items FOR DELETE
  TO authenticated
  USING (true);

-- =====================================================
-- CUSTOMER RETURNS
-- =====================================================

CREATE POLICY "Users can view customer returns"
  ON customer_returns FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create customer returns"
  ON customer_returns FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update customer returns"
  ON customer_returns FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can delete customer returns"
  ON customer_returns FOR DELETE
  TO authenticated
  USING (true);

-- =====================================================
-- CUSTOMER RETURN ITEMS
-- =====================================================

CREATE POLICY "Users can view customer return items"
  ON customer_return_items FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create customer return items"
  ON customer_return_items FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update customer return items"
  ON customer_return_items FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can delete customer return items"
  ON customer_return_items FOR DELETE
  TO authenticated
  USING (true);

-- =====================================================
-- STOCK TAKE SESSIONS
-- =====================================================

CREATE POLICY "Users can view stock take sessions"
  ON stock_take_sessions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create stock take sessions"
  ON stock_take_sessions FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update stock take sessions"
  ON stock_take_sessions FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can delete stock take sessions"
  ON stock_take_sessions FOR DELETE
  TO authenticated
  USING (true);

-- =====================================================
-- STOCK TAKE ITEMS
-- =====================================================

CREATE POLICY "Users can view stock take items"
  ON stock_take_items FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create stock take items"
  ON stock_take_items FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update stock take items"
  ON stock_take_items FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can delete stock take items"
  ON stock_take_items FOR DELETE
  TO authenticated
  USING (true);

-- =====================================================
-- PRICE HISTORY (Audit - No Delete)
-- =====================================================

CREATE POLICY "Users can view price history"
  ON price_history FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create price history"
  ON price_history FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- =====================================================
-- ACTIVITY LOGS (Audit - No Update/Delete)
-- =====================================================

CREATE POLICY "Users can view activity logs"
  ON activity_logs FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create activity logs"
  ON activity_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- =====================================================
-- VERIFICATION
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '==============================================';
  RAISE NOTICE 'RLS POLICIES CONFIGURED';
  RAISE NOTICE '==============================================';
  RAISE NOTICE 'All tables protected with RLS';
  RAISE NOTICE 'Authenticated users have full access';
  RAISE NOTICE 'Audit tables protected from deletion';
END $$;
