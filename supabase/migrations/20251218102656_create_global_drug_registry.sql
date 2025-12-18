/*
  # Create Global Drug Names Registry

  1. New Tables
    - `drug_registry`
      - `id` (uuid, primary key)
      - `name` (text, unique) - The drug/item name
      - `category` (text, nullable) - Category if available
      - `usage_count` (integer) - Track how many times this drug name is used
      - `last_used_at` (timestamptz) - When it was last used
      - `created_at` (timestamptz) - When first added
      - `updated_at` (timestamptz) - Last update time
  
  2. Security
    - Enable RLS on `drug_registry` table
    - Add policies for authenticated users to read all drug names
    - Add policies for authenticated users to insert/update drug names
  
  3. Functions
    - `add_drug_to_registry` - Upsert drug name to registry
    - Triggers to automatically populate from products, invoice_items, supplier_order_items
  
  4. Indexes
    - Index on name for fast lookups
    - Index on usage_count for popular drugs
*/

-- Create drug_registry table
CREATE TABLE IF NOT EXISTS drug_registry (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  category text,
  usage_count integer DEFAULT 1 CHECK (usage_count >= 0),
  last_used_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE drug_registry ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Authenticated users can view all drug names"
  ON drug_registry FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert drug names"
  ON drug_registry FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update drug names"
  ON drug_registry FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_drug_registry_name ON drug_registry(name);
CREATE INDEX IF NOT EXISTS idx_drug_registry_usage_count ON drug_registry(usage_count DESC);
CREATE INDEX IF NOT EXISTS idx_drug_registry_last_used ON drug_registry(last_used_at DESC);

-- Function to add or update drug in registry
CREATE OR REPLACE FUNCTION add_drug_to_registry(
  drug_name text,
  drug_category text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  drug_id uuid;
BEGIN
  -- Insert or update the drug name
  INSERT INTO drug_registry (name, category, usage_count, last_used_at, updated_at)
  VALUES (drug_name, drug_category, 1, now(), now())
  ON CONFLICT (name) DO UPDATE SET
    category = COALESCE(EXCLUDED.category, drug_registry.category),
    usage_count = drug_registry.usage_count + 1,
    last_used_at = now(),
    updated_at = now()
  RETURNING id INTO drug_id;
  
  RETURN drug_id;
END;
$$;

-- Trigger function to add drug from products table
CREATE OR REPLACE FUNCTION trigger_add_drug_from_products()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM add_drug_to_registry(NEW.name, NEW.category);
  RETURN NEW;
END;
$$;

-- Trigger function to add drug from invoice_items table
CREATE OR REPLACE FUNCTION trigger_add_drug_from_invoice_items()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM add_drug_to_registry(NEW.product_name, NEW.category);
  RETURN NEW;
END;
$$;

-- Trigger function to add drug from supplier_order_items table
CREATE OR REPLACE FUNCTION trigger_add_drug_from_supplier_order_items()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  product_category text;
BEGIN
  -- Get category from products table
  SELECT category INTO product_category
  FROM products
  WHERE id = NEW.product_id;
  
  PERFORM add_drug_to_registry(NEW.product_name, product_category);
  RETURN NEW;
END;
$$;

-- Create triggers
DROP TRIGGER IF EXISTS add_drug_from_products_trigger ON products;
CREATE TRIGGER add_drug_from_products_trigger
  AFTER INSERT ON products
  FOR EACH ROW
  EXECUTE FUNCTION trigger_add_drug_from_products();

DROP TRIGGER IF EXISTS add_drug_from_invoice_items_trigger ON invoice_items;
CREATE TRIGGER add_drug_from_invoice_items_trigger
  AFTER INSERT ON invoice_items
  FOR EACH ROW
  EXECUTE FUNCTION trigger_add_drug_from_invoice_items();

DROP TRIGGER IF EXISTS add_drug_from_supplier_order_items_trigger ON supplier_order_items;
CREATE TRIGGER add_drug_from_supplier_order_items_trigger
  AFTER INSERT ON supplier_order_items
  FOR EACH ROW
  EXECUTE FUNCTION trigger_add_drug_from_supplier_order_items();

-- Populate registry with existing data from products
INSERT INTO drug_registry (name, category, usage_count, last_used_at)
SELECT 
  name,
  category,
  COUNT(*) as usage_count,
  MAX(created_at) as last_used_at
FROM products
GROUP BY name, category
ON CONFLICT (name) DO NOTHING;

-- Populate registry with existing data from invoice_items
DO $$
DECLARE
  item_record RECORD;
BEGIN
  FOR item_record IN 
    SELECT DISTINCT product_name, category, COUNT(*) as cnt, MAX(created_at) as last_used
    FROM invoice_items
    GROUP BY product_name, category
  LOOP
    INSERT INTO drug_registry (name, category, usage_count, last_used_at)
    VALUES (item_record.product_name, item_record.category, item_record.cnt, item_record.last_used)
    ON CONFLICT (name) DO UPDATE SET
      usage_count = drug_registry.usage_count + item_record.cnt,
      last_used_at = GREATEST(drug_registry.last_used_at, item_record.last_used);
  END LOOP;
END $$;

-- Populate registry with existing data from supplier_order_items
DO $$
DECLARE
  item_record RECORD;
BEGIN
  FOR item_record IN 
    SELECT DISTINCT soi.product_name, p.category, COUNT(*) as cnt, MAX(soi.created_at) as last_used
    FROM supplier_order_items soi
    LEFT JOIN products p ON soi.product_id = p.id
    GROUP BY soi.product_name, p.category
  LOOP
    INSERT INTO drug_registry (name, category, usage_count, last_used_at)
    VALUES (item_record.product_name, item_record.category, item_record.cnt, item_record.last_used)
    ON CONFLICT (name) DO UPDATE SET
      usage_count = drug_registry.usage_count + item_record.cnt,
      last_used_at = GREATEST(drug_registry.last_used_at, item_record.last_used);
  END LOOP;
END $$;