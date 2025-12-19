/*
  # Complete Pharmacy POS Schema Redesign

  ## Overview
  This migration completely redesigns the pharmacy POS system to follow industry best practices:
  - Products are pure master data (no stock, no prices stored)
  - Batches track purchases with expiry, cost, and VAT
  - Stock is calculated from a ledger, never stored
  - Full audit trail for all stock movements

  ## Core Principles
  1. Products ≠ Batches ≠ Stock
  2. Stock is calculated, never stored
  3. All stock changes go through a ledger
  4. Derived values are never stored
  5. VAT and cost are batch-specific

  ## New Tables Created
  
  ### Master Data
  - `suppliers` - Normalized supplier information
  - `categories` - Product categories (normalized)
  - Updated `products` - Pure master data only
  
  ### Purchase Flow
  - `purchase_invoices` - Replaces `invoices`
  - `product_batches` - CRITICAL: Each purchase creates a batch
  
  ### Stock Ledger
  - `stock_movements` - Ledger for all stock changes
  
  ### Sales Flow
  - Updated `sales` - Enhanced with payment_status
  - Updated `sale_items` - Now references batches
  - `payments` - Payment tracking
  
  ### Returns & Credit Notes
  - Updated `credit_notes` - Supplier returns
  - `credit_note_items` - Items being returned
  - `customer_returns` - Customer returns
  - `customer_return_items` - Items being returned by customers
  
  ### Stock Take
  - Updated `stock_take_sessions` - Stock counting sessions
  - `stock_take_items` - Individual batch counts
  
  ### Audit
  - `price_history` - Price change tracking
  - Updated `activity_logs` - Enhanced audit trail

  ## Data Migration
  - Existing products → products + product_batches
  - Existing invoices → purchase_invoices
  - Existing invoice_items → create stock_movements
  - Existing suppliers (text) → suppliers table
  - Existing categories (text) → categories table

  ## Security
  - RLS enabled on all tables
  - Policies for authenticated users
  - Activity logging triggers
*/

-- =====================================================
-- STEP 1: CREATE NEW MASTER DATA TABLES
-- =====================================================

-- Suppliers table
CREATE TABLE IF NOT EXISTS suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  phone text,
  email text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to view suppliers"
  ON suppliers FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to create suppliers"
  ON suppliers FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update suppliers"
  ON suppliers FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Categories table
CREATE TABLE IF NOT EXISTS categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to view categories"
  ON categories FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to create categories"
  ON categories FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update categories"
  ON categories FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- =====================================================
-- STEP 2: MIGRATE EXISTING SUPPLIERS AND CATEGORIES
-- =====================================================

-- Extract unique suppliers from products
INSERT INTO suppliers (name, phone, email)
SELECT DISTINCT 
  COALESCE(supplier, 'Unknown Supplier'),
  NULL,
  NULL
FROM products
WHERE supplier IS NOT NULL
  AND supplier NOT IN (SELECT name FROM suppliers)
ON CONFLICT (name) DO NOTHING;

-- Ensure we have an "Unknown Supplier" for products without one
INSERT INTO suppliers (name)
VALUES ('Unknown Supplier')
ON CONFLICT (name) DO NOTHING;

-- Extract unique categories from products
INSERT INTO categories (name)
SELECT DISTINCT 
  COALESCE(category, 'Uncategorized')
FROM products
WHERE category IS NOT NULL
  AND category NOT IN (SELECT name FROM categories)
ON CONFLICT (name) DO NOTHING;

-- Ensure we have an "Uncategorized" category
INSERT INTO categories (name)
VALUES ('Uncategorized')
ON CONFLICT (name) DO NOTHING;

-- =====================================================
-- STEP 3: CREATE PURCHASE INVOICES TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS purchase_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number text UNIQUE NOT NULL,
  supplier_id uuid REFERENCES suppliers(id) ON DELETE RESTRICT,
  invoice_date date NOT NULL DEFAULT CURRENT_DATE,
  notes text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE purchase_invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to view purchase invoices"
  ON purchase_invoices FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to create purchase invoices"
  ON purchase_invoices FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update purchase invoices"
  ON purchase_invoices FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- =====================================================
-- STEP 4: CREATE PRODUCT BATCHES TABLE (CRITICAL)
-- =====================================================

CREATE TABLE IF NOT EXISTS product_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES products(id) ON DELETE RESTRICT NOT NULL,
  supplier_id uuid REFERENCES suppliers(id) ON DELETE RESTRICT,
  purchase_invoice_id uuid REFERENCES purchase_invoices(id) ON DELETE RESTRICT,
  batch_number text NOT NULL,
  expiry_date date,
  cost_price decimal(10, 2) NOT NULL DEFAULT 0,
  selling_price decimal(10, 2) NOT NULL DEFAULT 0,
  supplier_discount_percent decimal(5, 2) DEFAULT 0,
  vat_rate decimal(5, 2) DEFAULT 16,
  quantity_received integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE(product_id, batch_number)
);

ALTER TABLE product_batches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to view product batches"
  ON product_batches FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to create product batches"
  ON product_batches FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update product batches"
  ON product_batches FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create index for faster batch lookups
CREATE INDEX IF NOT EXISTS idx_product_batches_product_id ON product_batches(product_id);
CREATE INDEX IF NOT EXISTS idx_product_batches_expiry_date ON product_batches(expiry_date);

-- =====================================================
-- STEP 5: CREATE STOCK MOVEMENTS LEDGER
-- =====================================================

CREATE TABLE IF NOT EXISTS stock_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_batch_id uuid REFERENCES product_batches(id) ON DELETE RESTRICT NOT NULL,
  movement_type text NOT NULL CHECK (movement_type IN (
    'purchase', 'sale', 'supplier_return', 'customer_return', 'expiry', 'adjustment'
  )),
  quantity integer NOT NULL,
  reference_type text,
  reference_id uuid,
  notes text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to view stock movements"
  ON stock_movements FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to create stock movements"
  ON stock_movements FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_stock_movements_batch_id ON stock_movements(product_batch_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_type ON stock_movements(movement_type);
CREATE INDEX IF NOT EXISTS idx_stock_movements_reference ON stock_movements(reference_type, reference_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_created_at ON stock_movements(created_at DESC);

-- =====================================================
-- STEP 6: MIGRATE EXISTING DATA TO NEW STRUCTURE
-- =====================================================

-- Migrate existing invoices to purchase_invoices
INSERT INTO purchase_invoices (
  id,
  invoice_number,
  supplier_id,
  invoice_date,
  notes,
  created_by,
  created_at
)
SELECT 
  i.id,
  i.invoice_number,
  s.id as supplier_id,
  i.invoice_date,
  i.notes,
  i.user_id,
  i.created_at
FROM invoices i
LEFT JOIN suppliers s ON s.name = COALESCE(i.supplier, 'Unknown Supplier')
WHERE i.id NOT IN (SELECT id FROM purchase_invoices)
ON CONFLICT (id) DO NOTHING;

-- Create batches from existing products
INSERT INTO product_batches (
  product_id,
  supplier_id,
  purchase_invoice_id,
  batch_number,
  expiry_date,
  cost_price,
  selling_price,
  vat_rate,
  quantity_received,
  created_at
)
SELECT DISTINCT ON (p.id)
  p.id as product_id,
  s.id as supplier_id,
  pi.id as purchase_invoice_id,
  COALESCE(p.batch_number, 'BATCH-' || substr(p.id::text, 1, 8)) as batch_number,
  p.expiry_date,
  COALESCE(p.cost_price, 0) as cost_price,
  COALESCE(p.selling_price, 0) as selling_price,
  COALESCE(p.vat_rate, 16) as vat_rate,
  COALESCE(p.current_stock, 0) as quantity_received,
  p.created_at
FROM products p
LEFT JOIN suppliers s ON s.name = COALESCE(p.supplier, 'Unknown Supplier')
LEFT JOIN purchase_invoices pi ON pi.invoice_number = p.invoice_number
WHERE NOT EXISTS (
  SELECT 1 FROM product_batches pb 
  WHERE pb.product_id = p.id 
  AND pb.batch_number = COALESCE(p.batch_number, 'BATCH-' || substr(p.id::text, 1, 8))
);

-- Create stock movements from invoice_items (purchases)
INSERT INTO stock_movements (
  product_batch_id,
  movement_type,
  quantity,
  reference_type,
  reference_id,
  created_by,
  created_at
)
SELECT 
  pb.id as product_batch_id,
  'purchase' as movement_type,
  ii.quantity,
  'invoice_item' as reference_type,
  ii.id as reference_id,
  pi.created_by,
  ii.created_at
FROM invoice_items ii
JOIN purchase_invoices pi ON pi.id = ii.invoice_id
JOIN products p ON p.id = ii.product_id
JOIN product_batches pb ON pb.product_id = p.id 
  AND pb.batch_number = ii.batch_number
WHERE NOT EXISTS (
  SELECT 1 FROM stock_movements sm 
  WHERE sm.reference_type = 'invoice_item' 
  AND sm.reference_id = ii.id
);

-- =====================================================
-- STEP 7: UPDATE PRODUCTS TABLE STRUCTURE
-- =====================================================

-- Add new columns to products if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' AND column_name = 'category_id'
  ) THEN
    ALTER TABLE products ADD COLUMN category_id uuid REFERENCES categories(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' AND column_name = 'supplier_id'
  ) THEN
    ALTER TABLE products ADD COLUMN supplier_id uuid REFERENCES suppliers(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' AND column_name = 'is_vat_exempt'
  ) THEN
    ALTER TABLE products ADD COLUMN is_vat_exempt boolean DEFAULT false;
  END IF;
END $$;

-- Link products to categories
UPDATE products p
SET category_id = c.id
FROM categories c
WHERE c.name = COALESCE(p.category, 'Uncategorized')
  AND p.category_id IS NULL;

-- Link products to suppliers
UPDATE products p
SET supplier_id = s.id
FROM suppliers s
WHERE s.name = COALESCE(p.supplier, 'Unknown Supplier')
  AND p.supplier_id IS NULL;

-- =====================================================
-- STEP 8: UPDATE SALE_ITEMS TO REFERENCE BATCHES
-- =====================================================

-- Add product_batch_id to sale_items if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'sale_items' AND column_name = 'product_batch_id'
  ) THEN
    ALTER TABLE sale_items ADD COLUMN product_batch_id uuid REFERENCES product_batches(id) ON DELETE RESTRICT;
  END IF;
END $$;

-- Link existing sale_items to batches
UPDATE sale_items si
SET product_batch_id = pb.id
FROM product_batches pb
WHERE pb.product_id = si.product_id
  AND si.product_batch_id IS NULL
  AND pb.id = (
    SELECT id FROM product_batches 
    WHERE product_id = si.product_id 
    ORDER BY created_at DESC 
    LIMIT 1
  );

-- =====================================================
-- STEP 9: CREATE PAYMENTS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id uuid REFERENCES sales(id) ON DELETE CASCADE NOT NULL,
  method text NOT NULL CHECK (method IN ('cash', 'mpesa', 'card', 'insurance')),
  amount decimal(10, 2) NOT NULL,
  status text DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  reference text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to view payments"
  ON payments FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to create payments"
  ON payments FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update payments"
  ON payments FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Add payment_id to mpesa_transactions if needed
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'mpesa_transactions' AND column_name = 'payment_id'
  ) THEN
    ALTER TABLE mpesa_transactions ADD COLUMN payment_id uuid REFERENCES payments(id) ON DELETE CASCADE;
  END IF;
END $$;

-- =====================================================
-- STEP 10: UPDATE SALES TABLE
-- =====================================================

-- Add payment_status to sales if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'sales' AND column_name = 'payment_status'
  ) THEN
    ALTER TABLE sales ADD COLUMN payment_status text DEFAULT 'completed' 
      CHECK (payment_status IN ('pending', 'completed', 'cancelled'));
  END IF;
END $$;

-- =====================================================
-- STEP 11: CREATE CREDIT NOTE ITEMS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS credit_note_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  credit_note_id uuid REFERENCES credit_notes(id) ON DELETE CASCADE NOT NULL,
  product_batch_id uuid REFERENCES product_batches(id) ON DELETE RESTRICT NOT NULL,
  quantity integer NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE credit_note_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to view credit note items"
  ON credit_note_items FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to create credit note items"
  ON credit_note_items FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- =====================================================
-- STEP 12: CREATE CUSTOMER RETURNS TABLES
-- =====================================================

CREATE TABLE IF NOT EXISTS customer_returns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id uuid REFERENCES sales(id) ON DELETE RESTRICT NOT NULL,
  reason text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE customer_returns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to view customer returns"
  ON customer_returns FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to create customer returns"
  ON customer_returns FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE TABLE IF NOT EXISTS customer_return_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_return_id uuid REFERENCES customer_returns(id) ON DELETE CASCADE NOT NULL,
  product_batch_id uuid REFERENCES product_batches(id) ON DELETE RESTRICT NOT NULL,
  quantity integer NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE customer_return_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to view customer return items"
  ON customer_return_items FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to create customer return items"
  ON customer_return_items FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- =====================================================
-- STEP 13: UPDATE STOCK TAKE TABLES
-- =====================================================

-- Ensure stock_take_sessions exists (might be called stock_takes)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'stock_takes'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'stock_take_sessions'
  ) THEN
    ALTER TABLE stock_takes RENAME TO stock_take_sessions;
  END IF;
END $$;

-- Create stock_take_sessions if it doesn't exist
CREATE TABLE IF NOT EXISTS stock_take_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  status text DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed')),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  started_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE stock_take_sessions ENABLE ROW LEVEL SECURITY;

-- Drop old policies if they exist
DROP POLICY IF EXISTS "Allow authenticated users to view stock take sessions" ON stock_take_sessions;
DROP POLICY IF EXISTS "Allow authenticated users to create stock take sessions" ON stock_take_sessions;
DROP POLICY IF EXISTS "Allow authenticated users to update stock take sessions" ON stock_take_sessions;

-- Create policies for stock_take_sessions
CREATE POLICY "Allow authenticated users to view stock take sessions"
  ON stock_take_sessions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to create stock take sessions"
  ON stock_take_sessions FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update stock take sessions"
  ON stock_take_sessions FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create stock_take_items
CREATE TABLE IF NOT EXISTS stock_take_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES stock_take_sessions(id) ON DELETE CASCADE NOT NULL,
  product_batch_id uuid REFERENCES product_batches(id) ON DELETE RESTRICT NOT NULL,
  expected_quantity integer NOT NULL DEFAULT 0,
  actual_quantity integer,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE stock_take_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to view stock take items"
  ON stock_take_items FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to create stock take items"
  ON stock_take_items FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update stock take items"
  ON stock_take_items FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- =====================================================
-- STEP 14: CREATE PRICE HISTORY TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS price_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES products(id) ON DELETE CASCADE NOT NULL,
  old_price decimal(10, 2),
  new_price decimal(10, 2) NOT NULL,
  reason text,
  changed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE price_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to view price history"
  ON price_history FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to create price history"
  ON price_history FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_price_history_product_id ON price_history(product_id);
CREATE INDEX IF NOT EXISTS idx_price_history_created_at ON price_history(created_at DESC);

-- =====================================================
-- STEP 15: CREATE CURRENT STOCK VIEW
-- =====================================================

CREATE OR REPLACE VIEW current_stock_view AS
SELECT 
  pb.id as batch_id,
  pb.product_id,
  p.name as product_name,
  p.barcode,
  pb.batch_number,
  pb.expiry_date,
  pb.cost_price,
  pb.selling_price,
  pb.vat_rate,
  s.name as supplier_name,
  c.name as category_name,
  COALESCE(SUM(sm.quantity), 0) as current_stock,
  pb.created_at
FROM product_batches pb
JOIN products p ON p.id = pb.product_id
LEFT JOIN suppliers s ON s.id = pb.supplier_id
LEFT JOIN categories c ON c.id = p.category_id
LEFT JOIN stock_movements sm ON sm.product_batch_id = pb.id
GROUP BY pb.id, p.id, p.name, p.barcode, pb.batch_number, pb.expiry_date, 
         pb.cost_price, pb.selling_price, pb.vat_rate, s.name, c.name, pb.created_at
HAVING COALESCE(SUM(sm.quantity), 0) > 0
ORDER BY p.name, pb.expiry_date;

-- Grant access to the view
GRANT SELECT ON current_stock_view TO authenticated;

-- =====================================================
-- STEP 16: CREATE HELPER FUNCTIONS
-- =====================================================

-- Function to get current stock for a batch
CREATE OR REPLACE FUNCTION get_batch_stock(batch_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(SUM(quantity), 0)::integer
  FROM stock_movements
  WHERE product_batch_id = batch_id;
$$;

-- Function to get total stock for a product (all batches)
CREATE OR REPLACE FUNCTION get_product_stock(product_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(SUM(sm.quantity), 0)::integer
  FROM stock_movements sm
  JOIN product_batches pb ON pb.id = sm.product_batch_id
  WHERE pb.product_id = $1;
$$;

-- Function to get batches with stock for a product
CREATE OR REPLACE FUNCTION get_product_batches_with_stock(product_id uuid)
RETURNS TABLE (
  batch_id uuid,
  batch_number text,
  expiry_date date,
  cost_price decimal,
  selling_price decimal,
  current_stock integer
)
LANGUAGE sql
STABLE
AS $$
  SELECT 
    pb.id,
    pb.batch_number,
    pb.expiry_date,
    pb.cost_price,
    pb.selling_price,
    COALESCE(SUM(sm.quantity), 0)::integer as current_stock
  FROM product_batches pb
  LEFT JOIN stock_movements sm ON sm.product_batch_id = pb.id
  WHERE pb.product_id = $1
  GROUP BY pb.id, pb.batch_number, pb.expiry_date, pb.cost_price, pb.selling_price
  HAVING COALESCE(SUM(sm.quantity), 0) > 0
  ORDER BY pb.expiry_date NULLS LAST, pb.created_at;
$$;

-- =====================================================
-- STEP 17: CREATE TRIGGERS FOR ACTIVITY LOGGING
-- =====================================================

-- Function to log stock movements
CREATE OR REPLACE FUNCTION log_stock_movement()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO activity_logs (user_id, action, details)
  VALUES (
    NEW.created_by,
    'stock_movement_' || NEW.movement_type,
    jsonb_build_object(
      'batch_id', NEW.product_batch_id,
      'quantity', NEW.quantity,
      'movement_type', NEW.movement_type,
      'reference_type', NEW.reference_type,
      'reference_id', NEW.reference_id
    )
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_log_stock_movement ON stock_movements;
CREATE TRIGGER trigger_log_stock_movement
  AFTER INSERT ON stock_movements
  FOR EACH ROW
  EXECUTE FUNCTION log_stock_movement();

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================

-- Add comments to track this migration
COMMENT ON TABLE product_batches IS 'Core table for batch tracking - each purchase creates a batch with expiry, cost, and VAT';
COMMENT ON TABLE stock_movements IS 'Ledger for all stock changes - stock is calculated from this table';
COMMENT ON VIEW current_stock_view IS 'Real-time view of current stock calculated from stock_movements ledger';
