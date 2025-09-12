/*
  # Create Pharmacy Management System Schema

  1. New Tables
    - `users`
      - `id` (uuid, primary key)
      - `email` (text, unique)
      - `phone` (text)
      - `name` (text)
      - `role` (text)
      - `is_active` (boolean)
      - `password_hash` (text)
      - `created_at` (timestamp)
    - `products`
      - `id` (uuid, primary key)
      - `name` (text)
      - `category` (text)
      - `supplier` (text)
      - `batch_number` (text)
      - `expiry_date` (date)
      - `cost_price` (decimal)
      - `selling_price` (decimal)
      - `current_stock` (integer)
      - `min_stock_level` (integer)
      - `barcode` (text)
      - `invoice_number` (text)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    - `sales`
      - `id` (uuid, primary key)
      - `receipt_number` (text, unique)
      - `customer_name` (text)
      - `total_amount` (decimal)
      - `payment_method` (text)
      - `sales_person_id` (uuid, foreign key)
      - `sales_person_name` (text)
      - `created_at` (timestamp)
    - `sale_items`
      - `id` (uuid, primary key)
      - `sale_id` (uuid, foreign key)
      - `product_id` (uuid, foreign key)
      - `product_name` (text)
      - `quantity` (integer)
      - `unit_price` (decimal)
      - `total_price` (decimal)
      - `batch_number` (text)
    - `price_history`
      - `id` (uuid, primary key)
      - `product_id` (uuid, foreign key)
      - `cost_price` (decimal)
      - `selling_price` (decimal)
      - `user_id` (uuid, foreign key)
      - `user_name` (text)
      - `created_at` (timestamp)
    - `stock_takes`
      - `id` (uuid, primary key)
      - `product_id` (uuid, foreign key)
      - `product_name` (text)
      - `expected_stock` (integer)
      - `actual_stock` (integer)
      - `difference` (integer)
      - `reason` (text)
      - `user_id` (uuid, foreign key)
      - `user_name` (text)
      - `created_at` (timestamp)
    - `activity_logs`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key)
      - `user_name` (text)
      - `action` (text)
      - `details` (text)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users based on roles
*/

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  phone text,
  name text NOT NULL,
  role text NOT NULL CHECK (role IN ('super_admin', 'admin', 'inventory_manager', 'sales', 'cashier')),
  is_active boolean DEFAULT true,
  password_hash text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create products table
CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text NOT NULL,
  supplier text NOT NULL,
  batch_number text NOT NULL,
  expiry_date date NOT NULL,
  cost_price decimal(10,2) NOT NULL DEFAULT 0,
  selling_price decimal(10,2) NOT NULL DEFAULT 0,
  current_stock integer NOT NULL DEFAULT 0,
  min_stock_level integer NOT NULL DEFAULT 10,
  barcode text UNIQUE NOT NULL,
  invoice_number text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create sales table
CREATE TABLE IF NOT EXISTS sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_number text UNIQUE NOT NULL,
  customer_name text,
  total_amount decimal(10,2) NOT NULL,
  payment_method text NOT NULL CHECK (payment_method IN ('cash', 'mpesa', 'card', 'insurance')),
  sales_person_id uuid REFERENCES users(id),
  sales_person_name text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create sale_items table
CREATE TABLE IF NOT EXISTS sale_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id uuid REFERENCES sales(id) ON DELETE CASCADE,
  product_id uuid REFERENCES products(id),
  product_name text NOT NULL,
  quantity integer NOT NULL,
  unit_price decimal(10,2) NOT NULL,
  total_price decimal(10,2) NOT NULL,
  batch_number text
);

-- Create price_history table
CREATE TABLE IF NOT EXISTS price_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES products(id) ON DELETE CASCADE,
  cost_price decimal(10,2) NOT NULL,
  selling_price decimal(10,2) NOT NULL,
  user_id uuid REFERENCES users(id),
  user_name text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create stock_takes table
CREATE TABLE IF NOT EXISTS stock_takes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES products(id),
  product_name text NOT NULL,
  expected_stock integer NOT NULL,
  actual_stock integer NOT NULL,
  difference integer NOT NULL,
  reason text,
  user_id uuid REFERENCES users(id),
  user_name text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create activity_logs table
CREATE TABLE IF NOT EXISTS activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id),
  user_name text NOT NULL,
  action text NOT NULL,
  details text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_takes ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- Create policies for users table
CREATE POLICY "Users can read all users" ON users FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage users" ON users FOR ALL TO authenticated USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND role IN ('super_admin', 'admin')
  )
);
CREATE POLICY "Users can update their own profile" ON users FOR UPDATE TO authenticated USING (id = auth.uid());

-- Create policies for products table
CREATE POLICY "All authenticated users can read products" ON products FOR SELECT TO authenticated USING (true);
CREATE POLICY "Inventory managers and admins can manage products" ON products FOR ALL TO authenticated USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND role IN ('super_admin', 'admin', 'inventory_manager', 'sales', 'cashier')
  )
);

-- Create policies for sales table
CREATE POLICY "All authenticated users can read sales" ON sales FOR SELECT TO authenticated USING (true);
CREATE POLICY "Sales staff can create sales" ON sales FOR INSERT TO authenticated WITH CHECK (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND role IN ('super_admin', 'admin', 'inventory_manager', 'sales', 'cashier')
  )
);

-- Create policies for sale_items table
CREATE POLICY "All authenticated users can read sale items" ON sale_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Sales staff can create sale items" ON sale_items FOR INSERT TO authenticated WITH CHECK (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND role IN ('super_admin', 'admin', 'inventory_manager', 'sales', 'cashier')
  )
);

-- Create policies for price_history table
CREATE POLICY "All authenticated users can read price history" ON price_history FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage price history" ON price_history FOR ALL TO authenticated USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND role IN ('super_admin', 'admin')
  )
);

-- Create policies for stock_takes table
CREATE POLICY "All authenticated users can read stock takes" ON stock_takes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Inventory staff can manage stock takes" ON stock_takes FOR ALL TO authenticated USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND role IN ('super_admin', 'admin', 'inventory_manager')
  )
);

-- Create policies for activity_logs table
CREATE POLICY "All authenticated users can read activity logs" ON activity_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "All authenticated users can create activity logs" ON activity_logs FOR INSERT TO authenticated WITH CHECK (true);

-- Insert default super admin user
INSERT INTO users (email, phone, name, role, password_hash) VALUES 
('admin@wesabi.co.ke', '+254700000001', 'Super Administrator', 'super_admin', 'admin123')
ON CONFLICT (email) DO NOTHING;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_supplier ON products(supplier);
CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode);
CREATE INDEX IF NOT EXISTS idx_sales_created_at ON sales(created_at);
CREATE INDEX IF NOT EXISTS idx_sales_receipt_number ON sales(receipt_number);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_price_history_product_id ON price_history(product_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_sale_id ON sale_items(sale_id);
CREATE INDEX IF NOT EXISTS idx_stock_takes_product_id ON stock_takes(product_id);