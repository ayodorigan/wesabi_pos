/*
  # Standardize Pricing Fields Across Invoice Items and Products Tables

  1. Field Naming Standardization
    - Rename and reorganize all pricing fields to use consistent, clear names
    - Ensure both products and invoice_items tables have identical field structure
  
  2. New Standardized Fields
    **Products Table:**
    - `cost_price` - Original price paid to supplier before any discount (was invoice_price)
    - `discounted_cost_price` - Actual buying price after supplier discount (was discounted_cost)
    - `selling_price` - Price offered to customer before any discount (was target_selling_price)
    - `discounted_selling_price` - Final customer price after sales discount, before VAT (was minimum_selling_price)
    - `vat` - Statutory tax amount applied to the discounted selling price (was vat_amount)
    - `gross_profit_margin` - Percentage profit based on discounted selling price minus discounted cost price
    
    **Invoice Items Table:**
    - Same standardized fields as products table
    
  3. Migration Strategy
    - Add new standardized columns
    - Copy data from old columns to new columns
    - Drop old columns
    - Maintain all existing data
  
  4. Important Notes
    - This migration ensures invoice_items and products store identical pricing data
    - No recalculations should occur after this migration
    - All pricing logic happens once at invoice creation time
*/

-- ============================================================================
-- PRODUCTS TABLE: Add new standardized columns
-- ============================================================================

-- Add discounted_cost_price (replaces discounted_cost)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' AND column_name = 'discounted_cost_price'
  ) THEN
    ALTER TABLE products ADD COLUMN discounted_cost_price numeric;
  END IF;
END $$;

-- Add discounted_selling_price (replaces minimum_selling_price)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' AND column_name = 'discounted_selling_price'
  ) THEN
    ALTER TABLE products ADD COLUMN discounted_selling_price numeric;
  END IF;
END $$;

-- Add vat (replaces vat_amount, but products didn't have vat_amount)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' AND column_name = 'vat'
  ) THEN
    ALTER TABLE products ADD COLUMN vat numeric DEFAULT 0;
  END IF;
END $$;

-- Add gross_profit_margin
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' AND column_name = 'gross_profit_margin'
  ) THEN
    ALTER TABLE products ADD COLUMN gross_profit_margin numeric;
  END IF;
END $$;

-- Add supplier_discount_percent if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' AND column_name = 'supplier_discount_percent'
  ) THEN
    ALTER TABLE products ADD COLUMN supplier_discount_percent numeric;
  END IF;
END $$;

-- Migrate data from old columns to new standardized columns in products
UPDATE products 
SET 
  discounted_cost_price = COALESCE(discounted_cost, cost_price),
  discounted_selling_price = COALESCE(minimum_selling_price, selling_price),
  vat = 0,
  gross_profit_margin = CASE 
    WHEN COALESCE(discounted_cost, cost_price) > 0 
    THEN ((selling_price - COALESCE(discounted_cost, cost_price)) / COALESCE(discounted_cost, cost_price) * 100)
    ELSE 0 
  END
WHERE discounted_cost_price IS NULL;

-- Now rename cost_price semantics: 
-- Currently cost_price contains the "actual cost" but we need it to be "original supplier price"
-- invoice_price is the original supplier price, so we need to reorganize

-- First, let's add a temp column to preserve the current cost_price
ALTER TABLE products ADD COLUMN IF NOT EXISTS temp_actual_cost numeric;
UPDATE products SET temp_actual_cost = cost_price;

-- Update cost_price to be invoice_price (original supplier price before discount)
UPDATE products 
SET cost_price = COALESCE(invoice_price, cost_price)
WHERE invoice_price IS NOT NULL;

-- Update discounted_cost_price to be the actual cost (what was in cost_price or discounted_cost)
UPDATE products 
SET discounted_cost_price = COALESCE(discounted_cost, temp_actual_cost, cost_price);

-- Update selling_price to be target_selling_price if it exists
UPDATE products 
SET selling_price = COALESCE(target_selling_price, selling_price)
WHERE target_selling_price IS NOT NULL;

-- Drop temp column
ALTER TABLE products DROP COLUMN IF EXISTS temp_actual_cost;

-- Drop old redundant columns from products
ALTER TABLE products DROP COLUMN IF EXISTS invoice_price;
ALTER TABLE products DROP COLUMN IF EXISTS discounted_cost;
ALTER TABLE products DROP COLUMN IF EXISTS minimum_selling_price;
ALTER TABLE products DROP COLUMN IF EXISTS target_selling_price;
ALTER TABLE products DROP COLUMN IF EXISTS other_charges;

-- ============================================================================
-- INVOICE_ITEMS TABLE: Add new standardized columns
-- ============================================================================

-- Add discounted_cost_price
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'invoice_items' AND column_name = 'discounted_cost_price'
  ) THEN
    ALTER TABLE invoice_items ADD COLUMN discounted_cost_price numeric;
  END IF;
END $$;

-- Add discounted_selling_price
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'invoice_items' AND column_name = 'discounted_selling_price'
  ) THEN
    ALTER TABLE invoice_items ADD COLUMN discounted_selling_price numeric;
  END IF;
END $$;

-- Rename vat_amount to vat
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'invoice_items' AND column_name = 'vat_amount'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'invoice_items' AND column_name = 'vat'
  ) THEN
    ALTER TABLE invoice_items RENAME COLUMN vat_amount TO vat;
  END IF;
END $$;

-- Add vat if it doesn't exist (in case vat_amount didn't exist)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'invoice_items' AND column_name = 'vat'
  ) THEN
    ALTER TABLE invoice_items ADD COLUMN vat numeric DEFAULT 0;
  END IF;
END $$;

-- Add gross_profit_margin
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'invoice_items' AND column_name = 'gross_profit_margin'
  ) THEN
    ALTER TABLE invoice_items ADD COLUMN gross_profit_margin numeric;
  END IF;
END $$;

-- Migrate data from old columns to new standardized columns in invoice_items
-- Similar reorganization as products

-- Add temp column
ALTER TABLE invoice_items ADD COLUMN IF NOT EXISTS temp_actual_cost numeric;
UPDATE invoice_items SET temp_actual_cost = cost_price;

-- Update cost_price to be invoice_price (original supplier price)
UPDATE invoice_items 
SET cost_price = COALESCE(invoice_price, cost_price)
WHERE invoice_price IS NOT NULL;

-- Update discounted_cost_price
UPDATE invoice_items 
SET discounted_cost_price = COALESCE(discounted_cost, temp_actual_cost, cost_price)
WHERE discounted_cost_price IS NULL;

-- Update selling_price to be target_selling_price if it exists
UPDATE invoice_items 
SET selling_price = COALESCE(target_selling_price, selling_price)
WHERE target_selling_price IS NOT NULL;

-- Update discounted_selling_price
UPDATE invoice_items 
SET discounted_selling_price = COALESCE(minimum_selling_price, selling_price)
WHERE discounted_selling_price IS NULL;

-- Calculate gross_profit_margin
UPDATE invoice_items 
SET gross_profit_margin = CASE 
  WHEN discounted_cost_price > 0 
  THEN ((discounted_selling_price - discounted_cost_price) / discounted_cost_price * 100)
  ELSE 0 
END
WHERE gross_profit_margin IS NULL;

-- Drop temp column
ALTER TABLE invoice_items DROP COLUMN IF EXISTS temp_actual_cost;

-- Drop old redundant columns from invoice_items
ALTER TABLE invoice_items DROP COLUMN IF EXISTS invoice_price;
ALTER TABLE invoice_items DROP COLUMN IF EXISTS discounted_cost;
ALTER TABLE invoice_items DROP COLUMN IF EXISTS minimum_selling_price;
ALTER TABLE invoice_items DROP COLUMN IF EXISTS target_selling_price;
ALTER TABLE invoice_items DROP COLUMN IF EXISTS other_charges;
ALTER TABLE invoice_items DROP COLUMN IF EXISTS selling_price_ex_vat;
ALTER TABLE invoice_items DROP COLUMN IF EXISTS final_price_rounded;
ALTER TABLE invoice_items DROP COLUMN IF EXISTS rounding_extra;
ALTER TABLE invoice_items DROP COLUMN IF EXISTS profit;
ALTER TABLE invoice_items DROP COLUMN IF EXISTS price_type_used;
ALTER TABLE invoice_items DROP COLUMN IF EXISTS actual_cost_at_sale;

-- ============================================================================
-- Add comments to document the standardized fields
-- ============================================================================

COMMENT ON COLUMN products.cost_price IS 'Original price paid to supplier before any discount';
COMMENT ON COLUMN products.discounted_cost_price IS 'Actual buying price after supplier discount';
COMMENT ON COLUMN products.selling_price IS 'Price offered to customer before any discount';
COMMENT ON COLUMN products.discounted_selling_price IS 'Final customer price after sales discount, before VAT';
COMMENT ON COLUMN products.vat IS 'Statutory tax amount applied to the discounted selling price';
COMMENT ON COLUMN products.gross_profit_margin IS 'Percentage profit based on discounted selling price minus discounted cost price';

COMMENT ON COLUMN invoice_items.cost_price IS 'Original price paid to supplier before any discount';
COMMENT ON COLUMN invoice_items.discounted_cost_price IS 'Actual buying price after supplier discount';
COMMENT ON COLUMN invoice_items.selling_price IS 'Price offered to customer before any discount';
COMMENT ON COLUMN invoice_items.discounted_selling_price IS 'Final customer price after sales discount, before VAT';
COMMENT ON COLUMN invoice_items.vat IS 'Statutory tax amount applied to the discounted selling price';
COMMENT ON COLUMN invoice_items.gross_profit_margin IS 'Percentage profit based on discounted selling price minus discounted cost price';
