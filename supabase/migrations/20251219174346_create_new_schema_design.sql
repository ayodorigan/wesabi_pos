/*
  # Pharmacy POS - Complete Schema Redesign
  
  ## Overview
  Creates a clean, normalized schema for a pharmacy POS system following industry standards.
  
  ## Core Principles
  1. Products ≠ Batches ≠ Stock
  2. Stock is calculated, never stored
  3. All stock changes go through a ledger (stock_movements)
  4. Derived values are never stored
  5. VAT and cost are batch-specific
  6. Financial documents do not mutate stock directly
  
  ## Schema Structure
  
  ### Master Data
  - user_profiles (extends auth.users)
  - suppliers
  - categories  
  - products
  
  ### Purchase Flow
  - purchase_invoices
  - product_batches (CRITICAL - stores pricing, VAT, expiry per batch)
  
  ### Stock Ledger
  - stock_movements (single source of truth for stock levels)
  
  ### Sales Flow
  - sales
  - sale_items
  - payments
  - mpesa_transactions
  
  ### Returns & Credit Notes
  - credit_notes (supplier returns)
  - credit_note_items
  - customer_returns
  - customer_return_items
  
  ### Stock Take
  - stock_take_sessions
  - stock_take_items
  
  ### Audit
  - price_history
  - activity_logs
  
  ## Security
  - RLS enabled on all tables
  - Policies configured in separate migration
*/

-- =====================================================
-- MASTER DATA
-- =====================================================

-- User Profiles (extends auth.users)
CREATE TABLE user_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  name text NOT NULL,
  role text NOT NULL CHECK (role IN ('super_admin', 'admin', 'sales', 'inventory')),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Suppliers
CREATE TABLE suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  phone text,
  email text,
  created_at timestamptz DEFAULT now()
);

-- Categories
CREATE TABLE categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL
);

-- Products (master data only)
CREATE TABLE products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category_id uuid REFERENCES categories(id) ON DELETE SET NULL,
  barcode text UNIQUE,
  min_stock_level integer DEFAULT 0,
  is_vat_exempt boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- =====================================================
-- PURCHASE FLOW
-- =====================================================

-- Purchase Invoices
CREATE TABLE purchase_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number text UNIQUE NOT NULL,
  supplier_id uuid REFERENCES suppliers(id) ON DELETE RESTRICT NOT NULL,
  invoice_date date DEFAULT CURRENT_DATE,
  notes text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

-- Product Batches (CRITICAL TABLE)
-- Each purchase creates batches with specific pricing, VAT, and expiry
CREATE TABLE product_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES products(id) ON DELETE CASCADE NOT NULL,
  supplier_id uuid REFERENCES suppliers(id) ON DELETE RESTRICT NOT NULL,
  purchase_invoice_id uuid REFERENCES purchase_invoices(id) ON DELETE RESTRICT NOT NULL,
  batch_number text NOT NULL,
  expiry_date date,
  cost_price decimal(10, 2) NOT NULL CHECK (cost_price >= 0),
  supplier_discount_percent decimal(5, 2) DEFAULT 0 CHECK (supplier_discount_percent >= 0 AND supplier_discount_percent <= 100),
  vat_rate decimal(5, 2) DEFAULT 0 CHECK (vat_rate >= 0),
  quantity_received integer NOT NULL CHECK (quantity_received > 0),
  created_at timestamptz DEFAULT now(),
  UNIQUE(product_id, batch_number)
);

-- =====================================================
-- STOCK LEDGER (Single Source of Truth)
-- =====================================================

-- Stock Movements (all stock changes go here)
-- Current stock = SUM(quantity) for each batch
CREATE TABLE stock_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_batch_id uuid REFERENCES product_batches(id) ON DELETE CASCADE NOT NULL,
  movement_type text NOT NULL CHECK (movement_type IN ('purchase', 'sale', 'supplier_return', 'customer_return', 'expiry', 'adjustment')),
  quantity integer NOT NULL,
  reference_type text,
  reference_id uuid,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_stock_movements_batch ON stock_movements(product_batch_id);
CREATE INDEX idx_stock_movements_type ON stock_movements(movement_type);
CREATE INDEX idx_stock_movements_created ON stock_movements(created_at);

-- =====================================================
-- SALES FLOW
-- =====================================================

-- Sales
CREATE TABLE sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_number text UNIQUE NOT NULL,
  payment_status text DEFAULT 'pending' CHECK (payment_status IN ('pending', 'completed', 'cancelled')),
  total_amount decimal(10, 2) DEFAULT 0,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

-- Sale Items
CREATE TABLE sale_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id uuid REFERENCES sales(id) ON DELETE CASCADE NOT NULL,
  product_batch_id uuid REFERENCES product_batches(id) ON DELETE RESTRICT NOT NULL,
  quantity integer NOT NULL CHECK (quantity > 0),
  selling_price decimal(10, 2) NOT NULL CHECK (selling_price >= 0),
  vat_rate decimal(5, 2) DEFAULT 0 CHECK (vat_rate >= 0)
);

-- Payments
CREATE TABLE payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id uuid REFERENCES sales(id) ON DELETE CASCADE NOT NULL,
  method text NOT NULL CHECK (method IN ('cash', 'mpesa', 'card', 'insurance')),
  amount decimal(10, 2) NOT NULL CHECK (amount > 0),
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
  reference text,
  created_at timestamptz DEFAULT now()
);

-- M-Pesa Transactions
CREATE TABLE mpesa_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id uuid REFERENCES payments(id) ON DELETE CASCADE,
  receipt_number text,
  phone text,
  amount decimal(10, 2) NOT NULL,
  status text DEFAULT 'pending',
  raw_response jsonb,
  created_at timestamptz DEFAULT now()
);

-- =====================================================
-- RETURNS & CREDIT NOTES
-- =====================================================

-- Credit Notes (supplier returns)
CREATE TABLE credit_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  credit_note_number text UNIQUE NOT NULL,
  supplier_id uuid REFERENCES suppliers(id) ON DELETE RESTRICT NOT NULL,
  purchase_invoice_id uuid REFERENCES purchase_invoices(id) ON DELETE RESTRICT,
  reason text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

-- Credit Note Items
CREATE TABLE credit_note_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  credit_note_id uuid REFERENCES credit_notes(id) ON DELETE CASCADE NOT NULL,
  product_batch_id uuid REFERENCES product_batches(id) ON DELETE RESTRICT NOT NULL,
  quantity integer NOT NULL CHECK (quantity > 0)
);

-- Customer Returns
CREATE TABLE customer_returns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id uuid REFERENCES sales(id) ON DELETE CASCADE NOT NULL,
  reason text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

-- Customer Return Items
CREATE TABLE customer_return_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_return_id uuid REFERENCES customer_returns(id) ON DELETE CASCADE NOT NULL,
  product_batch_id uuid REFERENCES product_batches(id) ON DELETE RESTRICT NOT NULL,
  quantity integer NOT NULL CHECK (quantity > 0)
);

-- =====================================================
-- STOCK TAKE
-- =====================================================

-- Stock Take Sessions
CREATE TABLE stock_take_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  status text DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed')),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  started_at timestamptz DEFAULT now(),
  completed_at timestamptz
);

-- Stock Take Items
CREATE TABLE stock_take_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES stock_take_sessions(id) ON DELETE CASCADE NOT NULL,
  product_batch_id uuid REFERENCES product_batches(id) ON DELETE CASCADE NOT NULL,
  expected_quantity integer NOT NULL,
  actual_quantity integer,
  UNIQUE(session_id, product_batch_id)
);

-- =====================================================
-- AUDIT TABLES
-- =====================================================

-- Price History
CREATE TABLE price_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES products(id) ON DELETE CASCADE NOT NULL,
  old_price decimal(10, 2),
  new_price decimal(10, 2) NOT NULL,
  reason text,
  changed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

-- Activity Logs
CREATE TABLE activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL,
  details jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_activity_logs_user ON activity_logs(user_id);
CREATE INDEX idx_activity_logs_created ON activity_logs(created_at);

-- =====================================================
-- ENABLE RLS ON ALL TABLES
-- =====================================================

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE mpesa_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_note_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_return_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_take_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_take_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE product_batches IS 'CRITICAL: Each purchase creates batches. Pricing, VAT, and expiry are batch-specific.';
COMMENT ON TABLE stock_movements IS 'LEDGER: All stock changes go here. Current stock = SUM(quantity) per batch.';
COMMENT ON TABLE products IS 'Master data only. No pricing or stock data stored here.';

-- =====================================================
-- VERIFICATION
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '==============================================';
  RAISE NOTICE 'NEW SCHEMA CREATED SUCCESSFULLY';
  RAISE NOTICE '==============================================';
  RAISE NOTICE 'Core Principles:';
  RAISE NOTICE '  1. Products ≠ Batches ≠ Stock';
  RAISE NOTICE '  2. Stock is calculated from stock_movements';
  RAISE NOTICE '  3. No data duplication';
  RAISE NOTICE '  4. Batch-specific pricing and VAT';
  RAISE NOTICE '';
  RAISE NOTICE 'Next Steps:';
  RAISE NOTICE '  - Configure RLS policies';
  RAISE NOTICE '  - Create helper functions';
  RAISE NOTICE '  - Set up triggers';
END $$;
