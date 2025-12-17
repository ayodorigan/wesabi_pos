/*
  # Create Supplier Orders Tables

  1. New Tables
    - `supplier_orders`
      - `id` (uuid, primary key)
      - `order_number` (text, unique, auto-generated)
      - `created_by` (uuid, references user_profiles)
      - `status` (text, default 'pending')
      - `notes` (text, optional)
      - `total_items` (integer)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `supplier_order_items`
      - `id` (uuid, primary key)
      - `order_id` (uuid, references supplier_orders)
      - `product_id` (uuid, references products)
      - `product_name` (text)
      - `current_quantity` (integer, quantity at time of order)
      - `order_quantity` (integer, quantity to order)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on both tables
    - All authenticated users can create and read orders
    - Users can update orders they created
    - Only admins can delete orders

  3. Indexes
    - Index on order_number for fast lookups
    - Index on created_by for filtering user's orders
    - Index on order_id in order_items for efficient joins
*/

-- Create supplier_orders table
CREATE TABLE IF NOT EXISTS supplier_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number text UNIQUE NOT NULL,
  created_by uuid NOT NULL REFERENCES user_profiles(user_id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending',
  notes text,
  total_items integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create supplier_order_items table
CREATE TABLE IF NOT EXISTS supplier_order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES supplier_orders(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  product_name text NOT NULL,
  current_quantity integer NOT NULL DEFAULT 0,
  order_quantity integer NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_supplier_orders_order_number ON supplier_orders(order_number);
CREATE INDEX IF NOT EXISTS idx_supplier_orders_created_by ON supplier_orders(created_by);
CREATE INDEX IF NOT EXISTS idx_supplier_order_items_order_id ON supplier_order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_supplier_order_items_product_id ON supplier_order_items(product_id);

-- Enable RLS
ALTER TABLE supplier_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_order_items ENABLE ROW LEVEL SECURITY;

-- Policies for supplier_orders

-- All authenticated users can create orders
CREATE POLICY "Authenticated users can create orders"
  ON supplier_orders
  FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

-- All authenticated users can read orders
CREATE POLICY "Authenticated users can read orders"
  ON supplier_orders
  FOR SELECT
  TO authenticated
  USING (true);

-- Users can update their own orders, admins can update all
CREATE POLICY "Users can update own orders"
  ON supplier_orders
  FOR UPDATE
  TO authenticated
  USING (
    created_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_id = auth.uid()
      AND role IN ('super_admin', 'admin')
    )
  )
  WITH CHECK (
    created_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_id = auth.uid()
      AND role IN ('super_admin', 'admin')
    )
  );

-- Only admins can delete orders
CREATE POLICY "Admins can delete orders"
  ON supplier_orders
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_id = auth.uid()
      AND role IN ('super_admin', 'admin')
    )
  );

-- Policies for supplier_order_items

-- Users can insert items for orders they created
CREATE POLICY "Users can add items to orders"
  ON supplier_order_items
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM supplier_orders
      WHERE supplier_orders.id = order_id
      AND (
        supplier_orders.created_by = auth.uid() OR
        EXISTS (
          SELECT 1 FROM public.user_profiles
          WHERE user_id = auth.uid()
          AND role IN ('super_admin', 'admin')
        )
      )
    )
  );

-- All authenticated users can read order items
CREATE POLICY "Authenticated users can read order items"
  ON supplier_order_items
  FOR SELECT
  TO authenticated
  USING (true);

-- Users can update items for their orders
CREATE POLICY "Users can update own order items"
  ON supplier_order_items
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM supplier_orders
      WHERE supplier_orders.id = order_id
      AND (
        supplier_orders.created_by = auth.uid() OR
        EXISTS (
          SELECT 1 FROM public.user_profiles
          WHERE user_id = auth.uid()
          AND role IN ('super_admin', 'admin')
        )
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM supplier_orders
      WHERE supplier_orders.id = order_id
      AND (
        supplier_orders.created_by = auth.uid() OR
        EXISTS (
          SELECT 1 FROM public.user_profiles
          WHERE user_id = auth.uid()
          AND role IN ('super_admin', 'admin')
        )
      )
    )
  );

-- Users can delete items from their orders
CREATE POLICY "Users can delete own order items"
  ON supplier_order_items
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM supplier_orders
      WHERE supplier_orders.id = order_id
      AND (
        supplier_orders.created_by = auth.uid() OR
        EXISTS (
          SELECT 1 FROM public.user_profiles
          WHERE user_id = auth.uid()
          AND role IN ('super_admin', 'admin')
        )
      )
    )
  );

-- Function to generate order number
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  next_num integer;
  order_num text;
BEGIN
  -- Get the count of existing orders + 1
  SELECT COUNT(*) + 1 INTO next_num FROM supplier_orders;
  
  -- Format as ORD-YYYY-XXXX
  order_num := 'ORD-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(next_num::text, 4, '0');
  
  RETURN order_num;
END;
$$;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_supplier_orders_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
CREATE TRIGGER update_supplier_orders_updated_at
  BEFORE UPDATE ON supplier_orders
  FOR EACH ROW
  EXECUTE FUNCTION update_supplier_orders_updated_at();