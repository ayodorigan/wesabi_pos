/*
  # Add Pricing and Profit Fields
  
  1. Products Table Updates
    - Add `discounted_cost` - actual purchase cost after discount (nullable)
    - Add `minimum_selling_price` - floor price (discounted_cost × 1.33)
    - Add `target_selling_price` - default shelf price (cost_price × 1.33)
    - Add `has_vat` - whether VAT applies to this product (default true)
    - Rename `cost_price` semantics to mean "original_cost" (list cost before discount)
  
  2. Invoice Items Table Updates
    - Add `selling_price_ex_vat` - selling price before VAT
    - Add `vat_amount` - VAT amount charged
    - Add `final_price_rounded` - final price after rounding up to 0 or 5
    - Add `rounding_extra` - extra profit from rounding
    - Add `profit` - total profit per item (ex-VAT)
    - Add `price_type_used` - MINIMUM or TARGET
    - Add `actual_cost_at_sale` - cost at time of sale for audit trail
  
  3. Sale Items Table Updates
    - Add same pricing fields as invoice_items for consistency
  
  4. Notes
    - All calculations follow the markup rule of 1.33x
    - VAT is 16% by default
    - Rounding increases profit but not VAT
    - Profit = (SellingPriceExVAT - ActualCost) + RoundingExtra
*/

-- Add price type enum
DO $$ BEGIN
  CREATE TYPE price_type AS ENUM ('MINIMUM', 'TARGET');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- =====================================================
-- 1. UPDATE PRODUCTS TABLE
-- =====================================================

-- Add new pricing fields to products
DO $$
BEGIN
  -- Add discounted_cost (nullable - only if supplier offers discount)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' AND column_name = 'discounted_cost'
  ) THEN
    ALTER TABLE products ADD COLUMN discounted_cost numeric CHECK (discounted_cost >= 0);
  END IF;

  -- Add minimum_selling_price (floor price when discount exists)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' AND column_name = 'minimum_selling_price'
  ) THEN
    ALTER TABLE products ADD COLUMN minimum_selling_price numeric DEFAULT 0 CHECK (minimum_selling_price >= 0);
  END IF;

  -- Add target_selling_price (default shelf price)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' AND column_name = 'target_selling_price'
  ) THEN
    ALTER TABLE products ADD COLUMN target_selling_price numeric DEFAULT 0 CHECK (target_selling_price >= 0);
  END IF;

  -- Add has_vat flag
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' AND column_name = 'has_vat'
  ) THEN
    ALTER TABLE products ADD COLUMN has_vat boolean DEFAULT true;
  END IF;
END $$;

-- =====================================================
-- 2. UPDATE INVOICE_ITEMS TABLE
-- =====================================================

DO $$
BEGIN
  -- Add selling_price_ex_vat
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'invoice_items' AND column_name = 'selling_price_ex_vat'
  ) THEN
    ALTER TABLE invoice_items ADD COLUMN selling_price_ex_vat numeric DEFAULT 0 CHECK (selling_price_ex_vat >= 0);
  END IF;

  -- Add vat_amount
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'invoice_items' AND column_name = 'vat_amount'
  ) THEN
    ALTER TABLE invoice_items ADD COLUMN vat_amount numeric DEFAULT 0 CHECK (vat_amount >= 0);
  END IF;

  -- Add final_price_rounded
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'invoice_items' AND column_name = 'final_price_rounded'
  ) THEN
    ALTER TABLE invoice_items ADD COLUMN final_price_rounded numeric DEFAULT 0 CHECK (final_price_rounded >= 0);
  END IF;

  -- Add rounding_extra
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'invoice_items' AND column_name = 'rounding_extra'
  ) THEN
    ALTER TABLE invoice_items ADD COLUMN rounding_extra numeric DEFAULT 0 CHECK (rounding_extra >= 0);
  END IF;

  -- Add profit
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'invoice_items' AND column_name = 'profit'
  ) THEN
    ALTER TABLE invoice_items ADD COLUMN profit numeric DEFAULT 0;
  END IF;

  -- Add price_type_used
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'invoice_items' AND column_name = 'price_type_used'
  ) THEN
    ALTER TABLE invoice_items ADD COLUMN price_type_used price_type DEFAULT 'TARGET';
  END IF;

  -- Add actual_cost_at_sale
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'invoice_items' AND column_name = 'actual_cost_at_sale'
  ) THEN
    ALTER TABLE invoice_items ADD COLUMN actual_cost_at_sale numeric DEFAULT 0 CHECK (actual_cost_at_sale >= 0);
  END IF;
END $$;

-- =====================================================
-- 3. UPDATE SALE_ITEMS TABLE
-- =====================================================

DO $$
BEGIN
  -- Add cost_price for sale items (for profit tracking)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'sale_items' AND column_name = 'cost_price'
  ) THEN
    ALTER TABLE sale_items ADD COLUMN cost_price numeric DEFAULT 0 CHECK (cost_price >= 0);
  END IF;

  -- Add selling_price_ex_vat
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'sale_items' AND column_name = 'selling_price_ex_vat'
  ) THEN
    ALTER TABLE sale_items ADD COLUMN selling_price_ex_vat numeric DEFAULT 0 CHECK (selling_price_ex_vat >= 0);
  END IF;

  -- Add vat_amount
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'sale_items' AND column_name = 'vat_amount'
  ) THEN
    ALTER TABLE sale_items ADD COLUMN vat_amount numeric DEFAULT 0 CHECK (vat_amount >= 0);
  END IF;

  -- Add final_price_rounded
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'sale_items' AND column_name = 'final_price_rounded'
  ) THEN
    ALTER TABLE sale_items ADD COLUMN final_price_rounded numeric DEFAULT 0 CHECK (final_price_rounded >= 0);
  END IF;

  -- Add rounding_extra
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'sale_items' AND column_name = 'rounding_extra'
  ) THEN
    ALTER TABLE sale_items ADD COLUMN rounding_extra numeric DEFAULT 0 CHECK (rounding_extra >= 0);
  END IF;

  -- Add profit
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'sale_items' AND column_name = 'profit'
  ) THEN
    ALTER TABLE sale_items ADD COLUMN profit numeric DEFAULT 0;
  END IF;

  -- Add price_type_used
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'sale_items' AND column_name = 'price_type_used'
  ) THEN
    ALTER TABLE sale_items ADD COLUMN price_type_used price_type DEFAULT 'TARGET';
  END IF;

  -- Add actual_cost_at_sale
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'sale_items' AND column_name = 'actual_cost_at_sale'
  ) THEN
    ALTER TABLE sale_items ADD COLUMN actual_cost_at_sale numeric DEFAULT 0 CHECK (actual_cost_at_sale >= 0);
  END IF;
END $$;

-- =====================================================
-- 4. CREATE HELPER FUNCTION TO CALCULATE PRICING
-- =====================================================

CREATE OR REPLACE FUNCTION calculate_product_pricing(
  original_cost numeric,
  discount_percent numeric DEFAULT 0,
  has_vat_flag boolean DEFAULT true,
  vat_rate_percent numeric DEFAULT 16
)
RETURNS TABLE (
  discounted_cost numeric,
  actual_cost numeric,
  minimum_selling_price_ex_vat numeric,
  target_selling_price_ex_vat numeric,
  minimum_price_with_vat numeric,
  target_price_with_vat numeric
)
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  calc_discounted_cost numeric;
  calc_actual_cost numeric;
  calc_min_price_ex_vat numeric;
  calc_target_price_ex_vat numeric;
  calc_min_price_with_vat numeric;
  calc_target_price_with_vat numeric;
BEGIN
  -- Calculate discounted cost if discount exists
  IF discount_percent > 0 THEN
    calc_discounted_cost := original_cost * (1 - discount_percent / 100.0);
  ELSE
    calc_discounted_cost := NULL;
  END IF;
  
  -- Determine actual cost
  calc_actual_cost := COALESCE(calc_discounted_cost, original_cost);
  
  -- Calculate minimum selling price (ex-VAT) = discounted_cost × 1.33
  IF calc_discounted_cost IS NOT NULL THEN
    calc_min_price_ex_vat := calc_discounted_cost * 1.33;
  ELSE
    calc_min_price_ex_vat := NULL;
  END IF;
  
  -- Calculate target selling price (ex-VAT) = original_cost × 1.33
  calc_target_price_ex_vat := original_cost * 1.33;
  
  -- Add VAT if applicable
  IF has_vat_flag THEN
    IF calc_min_price_ex_vat IS NOT NULL THEN
      calc_min_price_with_vat := calc_min_price_ex_vat * (1 + vat_rate_percent / 100.0);
    ELSE
      calc_min_price_with_vat := NULL;
    END IF;
    calc_target_price_with_vat := calc_target_price_ex_vat * (1 + vat_rate_percent / 100.0);
  ELSE
    calc_min_price_with_vat := calc_min_price_ex_vat;
    calc_target_price_with_vat := calc_target_price_ex_vat;
  END IF;
  
  RETURN QUERY SELECT 
    calc_discounted_cost,
    calc_actual_cost,
    calc_min_price_ex_vat,
    calc_target_price_ex_vat,
    calc_min_price_with_vat,
    calc_target_price_with_vat;
END;
$$;

-- =====================================================
-- 5. MIGRATE EXISTING DATA
-- =====================================================

-- Update existing products with calculated pricing
UPDATE products
SET 
  discounted_cost = CASE 
    WHEN supplier_discount_percent > 0 
    THEN cost_price * (1 - supplier_discount_percent / 100.0)
    ELSE NULL
  END,
  target_selling_price = cost_price * 1.33,
  minimum_selling_price = CASE 
    WHEN supplier_discount_percent > 0 
    THEN (cost_price * (1 - supplier_discount_percent / 100.0)) * 1.33
    ELSE cost_price * 1.33
  END,
  has_vat = true
WHERE target_selling_price = 0 OR minimum_selling_price = 0;

-- Update existing invoice_items with profit calculation (best effort)
UPDATE invoice_items
SET 
  selling_price_ex_vat = selling_price / 1.16,  -- Assume 16% VAT was included
  vat_amount = selling_price - (selling_price / 1.16),
  final_price_rounded = selling_price,
  rounding_extra = 0,
  actual_cost_at_sale = cost_price,
  profit = (selling_price / 1.16) - cost_price,
  price_type_used = 'TARGET'
WHERE selling_price_ex_vat = 0;

-- Update existing sale_items with profit calculation (best effort)
UPDATE sale_items
SET 
  selling_price_ex_vat = unit_price / 1.16,  -- Assume 16% VAT was included
  vat_amount = unit_price - (unit_price / 1.16),
  final_price_rounded = unit_price,
  rounding_extra = 0,
  profit = (unit_price / 1.16) - COALESCE(cost_price, 0),
  price_type_used = 'TARGET'
WHERE selling_price_ex_vat = 0;

-- Add comment explaining the schema
COMMENT ON COLUMN products.cost_price IS 'Original list cost from supplier (before discount)';
COMMENT ON COLUMN products.discounted_cost IS 'Actual purchase cost after supplier discount (nullable)';
COMMENT ON COLUMN products.minimum_selling_price IS 'Floor price = discounted_cost × 1.33 (used for promotions)';
COMMENT ON COLUMN products.target_selling_price IS 'Default shelf price = original_cost × 1.33';
COMMENT ON COLUMN products.selling_price IS 'Current active selling price (may be min or target)';
COMMENT ON COLUMN products.has_vat IS 'Whether VAT applies to this product';

COMMENT ON COLUMN invoice_items.selling_price_ex_vat IS 'Selling price before VAT';
COMMENT ON COLUMN invoice_items.vat_amount IS 'VAT amount charged (not part of profit)';
COMMENT ON COLUMN invoice_items.final_price_rounded IS 'Final price after rounding up to 0 or 5';
COMMENT ON COLUMN invoice_items.rounding_extra IS 'Extra profit from rounding (increases profit)';
COMMENT ON COLUMN invoice_items.profit IS 'Total profit per item = (selling_price_ex_vat - actual_cost) + rounding_extra';
COMMENT ON COLUMN invoice_items.price_type_used IS 'Whether MINIMUM or TARGET price was used';
COMMENT ON COLUMN invoice_items.actual_cost_at_sale IS 'Cost at time of sale (for audit trail)';
