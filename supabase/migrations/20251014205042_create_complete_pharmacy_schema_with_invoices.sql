/*
  # Complete Pharmacy Management System with Invoice-Based Inventory

  1. Core Tables
    - `user_profiles` - User profiles with roles
    - `products` - Product inventory
    - `sales` - Sales transactions
    - `sale_items` - Individual sale line items
    - `price_history` - Product price changes
    - `stock_takes` - Stock taking records
    - `stock_take_sessions` - Stock take session management
    - `activity_logs` - System activity logging

  2. Invoice System Tables
    - `invoices` - Supplier invoices
    - `invoice_items` - Products in each invoice
    - `credit_notes` - Returns and credit notes
    - `credit_note_items` - Items in each credit note

  3. Security
    - RLS enabled on all tables
    - Role-based access control policies
*/

-- Create user_profiles table
CREATE TABLE IF NOT EXISTS user_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  name text NOT NULL,
  phone text,
  role text NOT NULL DEFAULT 'sales' CHECK (role IN ('super_admin', 'admin', 'sales', 'inventory', 'stock_take')),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create products table
CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text NOT NULL,
  supplier text NOT NULL,
  batch_number text NOT NULL,
  expiry_date date NOT NULL,
  cost_price numeric(10,2) DEFAULT 0 CHECK (cost_price >= 0),
  selling_price numeric(10,2) DEFAULT 0 CHECK (selling_price >= 0),
  current_stock integer DEFAULT 0 CHECK (current_stock >= 0),
  min_stock_level integer DEFAULT 10 CHECK (min_stock_level >= 0),
  barcode text UNIQUE NOT NULL,
  invoice_number text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create invoices table
CREATE TABLE IF NOT EXISTS invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number text UNIQUE NOT NULL,
  supplier text NOT NULL,
  invoice_date date NOT NULL DEFAULT CURRENT_DATE,
  total_amount numeric(12,2) NOT NULL DEFAULT 0 CHECK (total_amount >= 0),
  notes text,
  user_id uuid REFERENCES auth.users(id),
  user_name text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create invoice_items table
CREATE TABLE IF NOT EXISTS invoice_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid REFERENCES invoices(id) ON DELETE CASCADE NOT NULL,
  product_id uuid REFERENCES products(id) ON DELETE SET NULL,
  product_name text NOT NULL,
  category text NOT NULL,
  batch_number text NOT NULL,
  expiry_date date NOT NULL,
  quantity integer NOT NULL CHECK (quantity > 0),
  cost_price numeric(10,2) NOT NULL CHECK (cost_price >= 0),
  selling_price numeric(10,2) NOT NULL CHECK (selling_price >= 0),
  total_cost numeric(12,2) NOT NULL CHECK (total_cost >= 0),
  barcode text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create credit_notes table
CREATE TABLE IF NOT EXISTS credit_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  credit_note_number text UNIQUE NOT NULL,
  invoice_id uuid REFERENCES invoices(id) ON DELETE SET NULL,
  invoice_number text NOT NULL,
  supplier text NOT NULL,
  return_date date NOT NULL DEFAULT CURRENT_DATE,
  total_amount numeric(12,2) NOT NULL DEFAULT 0 CHECK (total_amount >= 0),
  reason text NOT NULL,
  user_id uuid REFERENCES auth.users(id),
  user_name text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create credit_note_items table
CREATE TABLE IF NOT EXISTS credit_note_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  credit_note_id uuid REFERENCES credit_notes(id) ON DELETE CASCADE NOT NULL,
  product_id uuid REFERENCES products(id) ON DELETE SET NULL,
  product_name text NOT NULL,
  batch_number text NOT NULL,
  quantity integer NOT NULL CHECK (quantity > 0),
  cost_price numeric(10,2) NOT NULL CHECK (cost_price >= 0),
  total_credit numeric(12,2) NOT NULL CHECK (total_credit >= 0),
  reason text,
  created_at timestamptz DEFAULT now()
);

-- Create sales table
CREATE TABLE IF NOT EXISTS sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_number text UNIQUE NOT NULL,
  customer_name text,
  total_amount numeric(10,2) NOT NULL CHECK (total_amount >= 0),
  payment_method text NOT NULL CHECK (payment_method IN ('cash', 'mpesa', 'card', 'insurance')),
  sales_person_id uuid REFERENCES auth.users(id),
  sales_person_name text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create sale_items table
CREATE TABLE IF NOT EXISTS sale_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id uuid REFERENCES sales(id) ON DELETE CASCADE,
  product_id uuid REFERENCES products(id),
  product_name text NOT NULL,
  quantity integer NOT NULL CHECK (quantity > 0),
  unit_price numeric(10,2) NOT NULL CHECK (unit_price >= 0),
  total_price numeric(10,2) NOT NULL CHECK (total_price >= 0),
  batch_number text
);

-- Create price_history table
CREATE TABLE IF NOT EXISTS price_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES products(id) ON DELETE CASCADE,
  cost_price numeric(10,2) NOT NULL CHECK (cost_price >= 0),
  selling_price numeric(10,2) NOT NULL CHECK (selling_price >= 0),
  user_id uuid REFERENCES auth.users(id),
  user_name text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create stock_takes table
CREATE TABLE IF NOT EXISTS stock_takes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES products(id),
  product_name text NOT NULL,
  expected_stock integer NOT NULL CHECK (expected_stock >= 0),
  actual_stock integer NOT NULL CHECK (actual_stock >= 0),
  difference integer NOT NULL,
  reason text,
  user_id uuid REFERENCES auth.users(id),
  user_name text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create stock_take_sessions table
CREATE TABLE IF NOT EXISTS stock_take_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_name text NOT NULL,
  status text NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed')),
  user_id uuid REFERENCES auth.users(id),
  user_name text NOT NULL,
  started_at timestamptz DEFAULT now(),
  completed_at timestamptz
);

-- Create activity_logs table
CREATE TABLE IF NOT EXISTS activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  user_name text NOT NULL,
  action text NOT NULL,
  details text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_supplier ON products(supplier);
CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode);
CREATE INDEX IF NOT EXISTS idx_products_invoice_number ON products(invoice_number);
CREATE INDEX IF NOT EXISTS idx_invoices_invoice_number ON invoices(invoice_number);
CREATE INDEX IF NOT EXISTS idx_invoices_supplier ON invoices(supplier);
CREATE INDEX IF NOT EXISTS idx_invoices_invoice_date ON invoices(invoice_date);
CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice_id ON invoice_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_items_product_id ON invoice_items(product_id);
CREATE INDEX IF NOT EXISTS idx_credit_notes_credit_note_number ON credit_notes(credit_note_number);
CREATE INDEX IF NOT EXISTS idx_credit_notes_invoice_id ON credit_notes(invoice_id);
CREATE INDEX IF NOT EXISTS idx_credit_notes_supplier ON credit_notes(supplier);
CREATE INDEX IF NOT EXISTS idx_credit_note_items_credit_note_id ON credit_note_items(credit_note_id);
CREATE INDEX IF NOT EXISTS idx_credit_note_items_product_id ON credit_note_items(product_id);
CREATE INDEX IF NOT EXISTS idx_sales_created_at ON sales(created_at);
CREATE INDEX IF NOT EXISTS idx_sales_receipt_number ON sales(receipt_number);
CREATE INDEX IF NOT EXISTS idx_sale_items_sale_id ON sale_items(sale_id);
CREATE INDEX IF NOT EXISTS idx_price_history_product_id ON price_history(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_takes_product_id ON stock_takes(product_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs(created_at);

-- Enable RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_note_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_takes ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_take_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- Create helper function
CREATE OR REPLACE FUNCTION get_user_role(user_uuid uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_role text;
BEGIN
  SELECT role INTO user_role
  FROM user_profiles
  WHERE user_id = user_uuid;
  
  RETURN COALESCE(user_role, 'sales');
END;
$$;

-- Create trigger function for new users
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_count integer;
  user_role text := 'sales';
  user_name text := 'New User';
BEGIN
  SELECT COUNT(*) INTO user_count FROM user_profiles;
  
  IF user_count = 0 THEN
    user_role := 'super_admin';
    user_name := 'Super Administrator';
  END IF;
  
  IF NEW.raw_user_meta_data ? 'name' THEN
    user_name := NEW.raw_user_meta_data->>'name';
  ELSIF NEW.raw_user_meta_data ? 'full_name' THEN
    user_name := NEW.raw_user_meta_data->>'full_name';
  ELSIF NEW.email IS NOT NULL THEN
    user_name := split_part(NEW.email, '@', 1);
  END IF;
  
  INSERT INTO user_profiles (user_id, name, phone, role, is_active)
  VALUES (
    NEW.id,
    user_name,
    NEW.raw_user_meta_data->>'phone',
    COALESCE(NEW.raw_user_meta_data->>'role', user_role),
    true
  );
  
  RETURN NEW;
END;
$$;

-- Create trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- USER_PROFILES policies
CREATE POLICY "Users can read own profile" ON user_profiles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON user_profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Super admins can read all profiles" ON user_profiles FOR SELECT TO authenticated USING (get_user_role(auth.uid()) = 'super_admin');
CREATE POLICY "Super admins can insert profiles" ON user_profiles FOR INSERT TO authenticated WITH CHECK (get_user_role(auth.uid()) = 'super_admin');
CREATE POLICY "Super admins can update all profiles" ON user_profiles FOR UPDATE TO authenticated USING (get_user_role(auth.uid()) = 'super_admin');
CREATE POLICY "Super admins can delete profiles" ON user_profiles FOR DELETE TO authenticated USING (get_user_role(auth.uid()) = 'super_admin');
CREATE POLICY "Allow initial profile creation" ON user_profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id AND (SELECT COUNT(*) FROM user_profiles) = 0);

-- PRODUCTS policies
CREATE POLICY "All authenticated users can read products" ON products FOR SELECT TO authenticated USING (true);
CREATE POLICY "Inventory managers can insert products" ON products FOR INSERT TO authenticated WITH CHECK (get_user_role(auth.uid()) = ANY (ARRAY['super_admin', 'admin', 'sales', 'inventory']));
CREATE POLICY "Inventory managers can update products" ON products FOR UPDATE TO authenticated USING (get_user_role(auth.uid()) = ANY (ARRAY['super_admin', 'admin', 'sales', 'inventory'])) WITH CHECK (get_user_role(auth.uid()) = ANY (ARRAY['super_admin', 'admin', 'sales', 'inventory']));
CREATE POLICY "Only admins can delete products" ON products FOR DELETE TO authenticated USING (get_user_role(auth.uid()) = ANY (ARRAY['super_admin', 'admin']));

-- INVOICES policies
CREATE POLICY "Inventory managers can read invoices" ON invoices FOR SELECT TO authenticated USING (get_user_role(auth.uid()) = ANY (ARRAY['super_admin', 'admin', 'sales', 'inventory']));
CREATE POLICY "Inventory managers can insert invoices" ON invoices FOR INSERT TO authenticated WITH CHECK (get_user_role(auth.uid()) = ANY (ARRAY['super_admin', 'admin', 'sales', 'inventory']));
CREATE POLICY "Inventory managers can update invoices" ON invoices FOR UPDATE TO authenticated USING (get_user_role(auth.uid()) = ANY (ARRAY['super_admin', 'admin', 'sales', 'inventory'])) WITH CHECK (get_user_role(auth.uid()) = ANY (ARRAY['super_admin', 'admin', 'sales', 'inventory']));
CREATE POLICY "Admins can delete invoices" ON invoices FOR DELETE TO authenticated USING (get_user_role(auth.uid()) = ANY (ARRAY['super_admin', 'admin']));

-- INVOICE_ITEMS policies
CREATE POLICY "Inventory managers can read invoice_items" ON invoice_items FOR SELECT TO authenticated USING (get_user_role(auth.uid()) = ANY (ARRAY['super_admin', 'admin', 'sales', 'inventory']));
CREATE POLICY "Inventory managers can insert invoice_items" ON invoice_items FOR INSERT TO authenticated WITH CHECK (get_user_role(auth.uid()) = ANY (ARRAY['super_admin', 'admin', 'sales', 'inventory']));
CREATE POLICY "Inventory managers can update invoice_items" ON invoice_items FOR UPDATE TO authenticated USING (get_user_role(auth.uid()) = ANY (ARRAY['super_admin', 'admin', 'sales', 'inventory'])) WITH CHECK (get_user_role(auth.uid()) = ANY (ARRAY['super_admin', 'admin', 'sales', 'inventory']));
CREATE POLICY "Admins can delete invoice_items" ON invoice_items FOR DELETE TO authenticated USING (get_user_role(auth.uid()) = ANY (ARRAY['super_admin', 'admin']));

-- CREDIT_NOTES policies
CREATE POLICY "Inventory managers can read credit_notes" ON credit_notes FOR SELECT TO authenticated USING (get_user_role(auth.uid()) = ANY (ARRAY['super_admin', 'admin', 'sales', 'inventory']));
CREATE POLICY "Inventory managers can insert credit_notes" ON credit_notes FOR INSERT TO authenticated WITH CHECK (get_user_role(auth.uid()) = ANY (ARRAY['super_admin', 'admin', 'sales', 'inventory']));
CREATE POLICY "Inventory managers can update credit_notes" ON credit_notes FOR UPDATE TO authenticated USING (get_user_role(auth.uid()) = ANY (ARRAY['super_admin', 'admin', 'sales', 'inventory'])) WITH CHECK (get_user_role(auth.uid()) = ANY (ARRAY['super_admin', 'admin', 'sales', 'inventory']));
CREATE POLICY "Admins can delete credit_notes" ON credit_notes FOR DELETE TO authenticated USING (get_user_role(auth.uid()) = ANY (ARRAY['super_admin', 'admin']));

-- CREDIT_NOTE_ITEMS policies
CREATE POLICY "Inventory managers can read credit_note_items" ON credit_note_items FOR SELECT TO authenticated USING (get_user_role(auth.uid()) = ANY (ARRAY['super_admin', 'admin', 'sales', 'inventory']));
CREATE POLICY "Inventory managers can insert credit_note_items" ON credit_note_items FOR INSERT TO authenticated WITH CHECK (get_user_role(auth.uid()) = ANY (ARRAY['super_admin', 'admin', 'sales', 'inventory']));
CREATE POLICY "Inventory managers can update credit_note_items" ON credit_note_items FOR UPDATE TO authenticated USING (get_user_role(auth.uid()) = ANY (ARRAY['super_admin', 'admin', 'sales', 'inventory'])) WITH CHECK (get_user_role(auth.uid()) = ANY (ARRAY['super_admin', 'admin', 'sales', 'inventory']));
CREATE POLICY "Admins can delete credit_note_items" ON credit_note_items FOR DELETE TO authenticated USING (get_user_role(auth.uid()) = ANY (ARRAY['super_admin', 'admin']));

-- SALES policies
CREATE POLICY "Sales users can read sales" ON sales FOR SELECT TO authenticated USING (get_user_role(auth.uid()) = ANY (ARRAY['super_admin', 'admin', 'sales']));
CREATE POLICY "Sales users can insert sales" ON sales FOR INSERT TO authenticated WITH CHECK (get_user_role(auth.uid()) = ANY (ARRAY['super_admin', 'admin', 'sales']));

-- SALE_ITEMS policies
CREATE POLICY "Sales users can read sale_items" ON sale_items FOR SELECT TO authenticated USING (get_user_role(auth.uid()) = ANY (ARRAY['super_admin', 'admin', 'sales']));
CREATE POLICY "Sales users can insert sale_items" ON sale_items FOR INSERT TO authenticated WITH CHECK (get_user_role(auth.uid()) = ANY (ARRAY['super_admin', 'admin', 'sales']));

-- PRICE_HISTORY policies
CREATE POLICY "All authenticated users can read price_history" ON price_history FOR SELECT TO authenticated USING (true);
CREATE POLICY "All authenticated users can insert price_history" ON price_history FOR INSERT TO authenticated WITH CHECK (true);

-- STOCK_TAKES policies
CREATE POLICY "Stock take users can read stock_takes" ON stock_takes FOR SELECT TO authenticated USING (get_user_role(auth.uid()) = ANY (ARRAY['super_admin', 'admin', 'stock_take']));
CREATE POLICY "Stock take users can insert stock_takes" ON stock_takes FOR INSERT TO authenticated WITH CHECK (get_user_role(auth.uid()) = ANY (ARRAY['super_admin', 'admin', 'stock_take']));
CREATE POLICY "Stock take users can update stock_takes" ON stock_takes FOR UPDATE TO authenticated USING (get_user_role(auth.uid()) = ANY (ARRAY['super_admin', 'admin', 'stock_take'])) WITH CHECK (get_user_role(auth.uid()) = ANY (ARRAY['super_admin', 'admin', 'stock_take']));
CREATE POLICY "Stock take users can delete stock_takes" ON stock_takes FOR DELETE TO authenticated USING (get_user_role(auth.uid()) = ANY (ARRAY['super_admin', 'admin', 'stock_take']));

-- STOCK_TAKE_SESSIONS policies
CREATE POLICY "Stock take users can read sessions" ON stock_take_sessions FOR SELECT TO authenticated USING (get_user_role(auth.uid()) = ANY (ARRAY['super_admin', 'admin', 'stock_take']));
CREATE POLICY "Stock take users can insert sessions" ON stock_take_sessions FOR INSERT TO authenticated WITH CHECK (get_user_role(auth.uid()) = ANY (ARRAY['super_admin', 'admin', 'stock_take']));
CREATE POLICY "Stock take users can update sessions" ON stock_take_sessions FOR UPDATE TO authenticated USING (get_user_role(auth.uid()) = ANY (ARRAY['super_admin', 'admin', 'stock_take'])) WITH CHECK (get_user_role(auth.uid()) = ANY (ARRAY['super_admin', 'admin', 'stock_take']));
CREATE POLICY "Stock take users can delete sessions" ON stock_take_sessions FOR DELETE TO authenticated USING (get_user_role(auth.uid()) = ANY (ARRAY['super_admin', 'admin', 'stock_take']));

-- ACTIVITY_LOGS policies
CREATE POLICY "All authenticated users can insert activity_logs" ON activity_logs FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Admins can read activity_logs" ON activity_logs FOR SELECT TO authenticated USING (get_user_role(auth.uid()) = ANY (ARRAY['super_admin', 'admin']));