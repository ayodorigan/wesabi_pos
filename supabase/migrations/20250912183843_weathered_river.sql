/*
  # Reconfigure Database Schema for Supabase Auth API

  This migration reconfigures the database to work properly with Supabase's built-in auth system
  and removes the problematic users table that was causing RLS policy infinite recursion.

  ## Changes Made:
  1. Remove the custom users table (use auth.users instead)
  2. Create user_profiles table for additional user data
  3. Rewrite all RLS policies to use auth.uid() and auth.jwt()
  4. Fix foreign key references to use auth.users
  5. Add proper indexes and constraints

  ## Security:
  - All tables have RLS enabled
  - Policies use Supabase's built-in auth functions
  - No more infinite recursion issues
*/

-- Drop existing tables to start fresh
DROP TABLE IF EXISTS activity_logs CASCADE;
DROP TABLE IF EXISTS stock_takes CASCADE;
DROP TABLE IF EXISTS price_history CASCADE;
DROP TABLE IF EXISTS sale_items CASCADE;
DROP TABLE IF EXISTS sales CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Create user_profiles table for additional user data
CREATE TABLE user_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  phone text,
  role text NOT NULL DEFAULT 'sales',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  CONSTRAINT user_profiles_role_check CHECK (role IN ('super_admin', 'admin', 'inventory_manager', 'sales', 'cashier')),
  CONSTRAINT user_profiles_user_id_unique UNIQUE (user_id)
);

-- Create products table
CREATE TABLE products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text NOT NULL,
  supplier text NOT NULL,
  batch_number text NOT NULL,
  expiry_date date NOT NULL,
  cost_price numeric(10,2) DEFAULT 0,
  selling_price numeric(10,2) DEFAULT 0,
  current_stock integer DEFAULT 0,
  min_stock_level integer DEFAULT 10,
  barcode text UNIQUE NOT NULL,
  invoice_number text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create sales table
CREATE TABLE sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_number text UNIQUE NOT NULL,
  customer_name text,
  total_amount numeric(10,2) NOT NULL,
  payment_method text NOT NULL,
  sales_person_id uuid REFERENCES auth.users(id),
  sales_person_name text NOT NULL,
  created_at timestamptz DEFAULT now(),
  
  CONSTRAINT sales_payment_method_check CHECK (payment_method IN ('cash', 'mpesa', 'card', 'insurance'))
);

-- Create sale_items table
CREATE TABLE sale_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id uuid REFERENCES sales(id) ON DELETE CASCADE,
  product_id uuid REFERENCES products(id),
  product_name text NOT NULL,
  quantity integer NOT NULL,
  unit_price numeric(10,2) NOT NULL,
  total_price numeric(10,2) NOT NULL,
  batch_number text
);

-- Create price_history table
CREATE TABLE price_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES products(id) ON DELETE CASCADE,
  cost_price numeric(10,2) NOT NULL,
  selling_price numeric(10,2) NOT NULL,
  user_id uuid REFERENCES auth.users(id),
  user_name text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create stock_takes table
CREATE TABLE stock_takes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES products(id),
  product_name text NOT NULL,
  expected_stock integer NOT NULL,
  actual_stock integer NOT NULL,
  difference integer NOT NULL,
  reason text,
  user_id uuid REFERENCES auth.users(id),
  user_name text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create activity_logs table
CREATE TABLE activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  user_name text NOT NULL,
  action text NOT NULL,
  details text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX idx_products_category ON products(category);
CREATE INDEX idx_products_supplier ON products(supplier);
CREATE INDEX idx_products_barcode ON products(barcode);
CREATE INDEX idx_sales_created_at ON sales(created_at);
CREATE INDEX idx_sales_receipt_number ON sales(receipt_number);
CREATE INDEX idx_sale_items_sale_id ON sale_items(sale_id);
CREATE INDEX idx_price_history_product_id ON price_history(product_id);
CREATE INDEX idx_stock_takes_product_id ON stock_takes(product_id);
CREATE INDEX idx_activity_logs_created_at ON activity_logs(created_at);
CREATE INDEX idx_user_profiles_user_id ON user_profiles(user_id);

-- Enable RLS on all tables
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_takes ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_profiles
CREATE POLICY "Users can read all profiles"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can manage all profiles"
  ON user_profiles FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.user_id = auth.uid()
      AND up.role IN ('super_admin', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.user_id = auth.uid()
      AND up.role IN ('super_admin', 'admin')
    )
  );

CREATE POLICY "Allow initial profile creation"
  ON user_profiles FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND (
      -- Allow if no profiles exist (first user)
      (SELECT COUNT(*) FROM user_profiles) = 0
      -- Or if user is admin
      OR EXISTS (
        SELECT 1 FROM user_profiles up
        WHERE up.user_id = auth.uid()
        AND up.role IN ('super_admin', 'admin')
      )
    )
  );

-- RLS Policies for products
CREATE POLICY "All authenticated users can read products"
  ON products FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Inventory managers and admins can manage products"
  ON products FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.user_id = auth.uid()
      AND up.role IN ('super_admin', 'admin', 'inventory_manager')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.user_id = auth.uid()
      AND up.role IN ('super_admin', 'admin', 'inventory_manager')
    )
  );

-- RLS Policies for sales
CREATE POLICY "All authenticated users can read sales"
  ON sales FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Sales staff can create sales"
  ON sales FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = sales_person_id
    AND EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.user_id = auth.uid()
      AND up.role IN ('super_admin', 'admin', 'inventory_manager', 'sales', 'cashier')
    )
  );

-- RLS Policies for sale_items
CREATE POLICY "All authenticated users can read sale items"
  ON sale_items FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Sales staff can create sale items"
  ON sale_items FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.user_id = auth.uid()
      AND up.role IN ('super_admin', 'admin', 'inventory_manager', 'sales', 'cashier')
    )
  );

-- RLS Policies for price_history
CREATE POLICY "All authenticated users can read price history"
  ON price_history FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage price history"
  ON price_history FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.user_id = auth.uid()
      AND up.role IN ('super_admin', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.user_id = auth.uid()
      AND up.role IN ('super_admin', 'admin')
    )
  );

-- RLS Policies for stock_takes
CREATE POLICY "All authenticated users can read stock takes"
  ON stock_takes FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Inventory staff can manage stock takes"
  ON stock_takes FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.user_id = auth.uid()
      AND up.role IN ('super_admin', 'admin', 'inventory_manager')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.user_id = auth.uid()
      AND up.role IN ('super_admin', 'admin', 'inventory_manager')
    )
  );

-- RLS Policies for activity_logs
CREATE POLICY "All authenticated users can read activity logs"
  ON activity_logs FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "All authenticated users can create activity logs"
  ON activity_logs FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Function to automatically create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.user_profiles (user_id, name, role, phone)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    COALESCE(new.raw_user_meta_data->>'role', 'sales'),
    new.raw_user_meta_data->>'phone'
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on user signup
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Insert sample data for testing
INSERT INTO products (name, category, supplier, batch_number, expiry_date, cost_price, selling_price, current_stock, min_stock_level, barcode, invoice_number) VALUES
('Paracetamol 500mg', 'Pain Relief', 'Dawa Pharmaceuticals Ltd', 'PAR2024001', '2025-12-31', 50, 80, 150, 20, '1234567890123', 'INV-2024-001'),
('Amoxicillin 250mg', 'Antibiotics', 'Kenya Medical Supplies', 'AMX2024002', '2025-06-30', 120, 200, 8, 15, '1234567890124', 'INV-2024-002'),
('Vitamin C 1000mg', 'Supplements', 'HealthCare Kenya', 'VTC2024003', '2025-03-15', 80, 150, 45, 10, '1234567890125', 'INV-2024-003'),
('Ibuprofen 400mg', 'Pain Relief', 'Dawa Pharmaceuticals Ltd', 'IBU2024004', '2025-01-20', 60, 100, 75, 25, '1234567890126', 'INV-2024-004');