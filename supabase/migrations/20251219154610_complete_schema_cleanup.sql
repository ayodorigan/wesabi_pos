/*
  # Complete Schema Cleanup - Remove Old Columns

  ## Overview
  This migration removes all obsolete columns from the products table now that
  the new batch and ledger system is in place.

  ## Columns Being Removed
  
  ### From products table:
  - `cost_price` → Now in product_batches
  - `selling_price` → Now in product_batches
  - `current_stock` → Calculated from stock_movements
  - `supplier` (text) → Replaced by supplier_id FK
  - `category` (text) → Replaced by category_id FK
  - `batch_number` → Batches are separate records in product_batches
  - `expiry_date` → Now in product_batches
  - `invoice_number` → Not needed on products
  - `supplier_discount_percent` → Now in product_batches
  - `vat_rate` → Now in product_batches
  - `has_vat` → Replaced by is_vat_exempt
  - `discounted_cost_price` → Calculated, not stored
  - `discounted_selling_price` → Calculated, not stored
  - `vat` → Calculated, not stored
  - `gross_profit_margin` → Calculated, not stored

  ## Final products table structure (master data only):
  - id, name, barcode (product identifiers)
  - category_id, supplier_id (foreign keys)
  - min_stock_level (reorder level)
  - is_vat_exempt (VAT flag)
  - created_at, updated_at (audit timestamps)

  ## Impact
  - Frontend MUST now use product_batches for pricing and stock
  - Frontend MUST query stock_movements for current stock
  - Frontend MUST use current_stock_view for stock display
*/

-- =====================================================
-- REMOVE OBSOLETE COLUMNS FROM PRODUCTS TABLE
-- =====================================================

-- Remove pricing columns (now in product_batches)
ALTER TABLE products DROP COLUMN IF EXISTS cost_price;
ALTER TABLE products DROP COLUMN IF EXISTS selling_price;
ALTER TABLE products DROP COLUMN IF EXISTS discounted_cost_price;
ALTER TABLE products DROP COLUMN IF EXISTS discounted_selling_price;

-- Remove stock column (calculated from stock_movements)
ALTER TABLE products DROP COLUMN IF EXISTS current_stock;

-- Remove batch-specific columns (now in product_batches)
ALTER TABLE products DROP COLUMN IF EXISTS batch_number;
ALTER TABLE products DROP COLUMN IF EXISTS expiry_date;
ALTER TABLE products DROP COLUMN IF EXISTS supplier_discount_percent;
ALTER TABLE products DROP COLUMN IF EXISTS vat_rate;
ALTER TABLE products DROP COLUMN IF EXISTS vat;
ALTER TABLE products DROP COLUMN IF EXISTS has_vat;
ALTER TABLE products DROP COLUMN IF EXISTS gross_profit_margin;

-- Remove old text-based foreign keys (replaced by proper FKs)
ALTER TABLE products DROP COLUMN IF EXISTS supplier;
ALTER TABLE products DROP COLUMN IF EXISTS category;

-- Remove invoice reference (not needed here)
ALTER TABLE products DROP COLUMN IF EXISTS invoice_number;

-- =====================================================
-- VERIFY PRODUCTS TABLE IS NOW CLEAN
-- =====================================================

-- Add comment to document the clean structure
COMMENT ON TABLE products IS 'Master data for products - contains only product identifiers and references. Use product_batches for pricing, stock_movements for stock levels.';

-- =====================================================
-- UPDATE VIEWS TO USE NEW STRUCTURE
-- =====================================================

-- Recreate current_stock_view to be more comprehensive
DROP VIEW IF EXISTS current_stock_view;

CREATE VIEW current_stock_view AS
SELECT 
  pb.id as batch_id,
  pb.product_id,
  p.name as product_name,
  p.barcode,
  pb.batch_number,
  pb.expiry_date,
  pb.cost_price,
  pb.selling_price,
  pb.supplier_discount_percent,
  pb.vat_rate,
  ROUND((pb.selling_price * pb.vat_rate / 100), 2) as vat_amount,
  ROUND(pb.selling_price + (pb.selling_price * pb.vat_rate / 100), 2) as selling_price_inc_vat,
  s.name as supplier_name,
  s.id as supplier_id,
  c.name as category_name,
  c.id as category_id,
  p.is_vat_exempt,
  p.min_stock_level,
  COALESCE(SUM(sm.quantity), 0) as current_stock,
  pb.quantity_received,
  pb.created_at,
  pb.purchase_invoice_id
FROM product_batches pb
JOIN products p ON p.id = pb.product_id
LEFT JOIN suppliers s ON s.id = pb.supplier_id
LEFT JOIN categories c ON c.id = p.category_id
LEFT JOIN stock_movements sm ON sm.product_batch_id = pb.id
GROUP BY 
  pb.id, p.id, p.name, p.barcode, p.is_vat_exempt, p.min_stock_level,
  pb.batch_number, pb.expiry_date, pb.cost_price, pb.selling_price, 
  pb.supplier_discount_percent, pb.vat_rate, pb.quantity_received,
  pb.created_at, pb.purchase_invoice_id,
  s.name, s.id, c.name, c.id
HAVING COALESCE(SUM(sm.quantity), 0) > 0
ORDER BY p.name, pb.expiry_date NULLS LAST;

-- Grant access to the view
GRANT SELECT ON current_stock_view TO authenticated;

COMMENT ON VIEW current_stock_view IS 'Real-time view of current stock with all batch details - stock is calculated from stock_movements ledger';

-- =====================================================
-- CREATE PRODUCT SUMMARY VIEW (for inventory listing)
-- =====================================================

CREATE OR REPLACE VIEW product_summary_view AS
SELECT 
  p.id as product_id,
  p.name as product_name,
  p.barcode,
  c.name as category_name,
  c.id as category_id,
  s.name as default_supplier_name,
  s.id as default_supplier_id,
  p.min_stock_level,
  p.is_vat_exempt,
  -- Total stock across all batches
  COALESCE(SUM(sm.quantity), 0) as total_stock,
  -- Count of active batches
  COUNT(DISTINCT CASE WHEN COALESCE(batch_stock.stock, 0) > 0 THEN pb.id END) as active_batch_count,
  -- Earliest expiry date
  MIN(pb.expiry_date) as earliest_expiry,
  -- Average cost price (weighted by stock)
  CASE 
    WHEN COALESCE(SUM(sm.quantity), 0) > 0 THEN
      SUM(pb.cost_price * COALESCE(batch_stock.stock, 0)) / SUM(COALESCE(batch_stock.stock, 0))
    ELSE
      AVG(pb.cost_price)
  END as avg_cost_price,
  -- Average selling price (weighted by stock)
  CASE 
    WHEN COALESCE(SUM(sm.quantity), 0) > 0 THEN
      SUM(pb.selling_price * COALESCE(batch_stock.stock, 0)) / SUM(COALESCE(batch_stock.stock, 0))
    ELSE
      AVG(pb.selling_price)
  END as avg_selling_price,
  p.created_at,
  p.updated_at
FROM products p
LEFT JOIN categories c ON c.id = p.category_id
LEFT JOIN suppliers s ON s.id = p.supplier_id
LEFT JOIN product_batches pb ON pb.product_id = p.id
LEFT JOIN stock_movements sm ON sm.product_batch_id = pb.id
LEFT JOIN LATERAL (
  SELECT COALESCE(SUM(quantity), 0) as stock
  FROM stock_movements
  WHERE product_batch_id = pb.id
) batch_stock ON true
GROUP BY 
  p.id, p.name, p.barcode, p.min_stock_level, p.is_vat_exempt,
  p.created_at, p.updated_at,
  c.name, c.id, s.name, s.id
ORDER BY p.name;

GRANT SELECT ON product_summary_view TO authenticated;

COMMENT ON VIEW product_summary_view IS 'Summary view of products with aggregated stock and batch information';

-- =====================================================
-- CREATE LOW STOCK VIEW
-- =====================================================

CREATE OR REPLACE VIEW low_stock_view AS
SELECT 
  p.id as product_id,
  p.name as product_name,
  p.barcode,
  c.name as category_name,
  p.min_stock_level,
  COALESCE(SUM(sm.quantity), 0) as current_stock,
  p.min_stock_level - COALESCE(SUM(sm.quantity), 0) as stock_shortage,
  COUNT(DISTINCT pb.id) as batch_count,
  MIN(pb.expiry_date) as nearest_expiry
FROM products p
LEFT JOIN categories c ON c.id = p.category_id
LEFT JOIN product_batches pb ON pb.product_id = p.id
LEFT JOIN stock_movements sm ON sm.product_batch_id = pb.id
GROUP BY p.id, p.name, p.barcode, p.min_stock_level, c.name
HAVING COALESCE(SUM(sm.quantity), 0) < p.min_stock_level
ORDER BY (p.min_stock_level - COALESCE(SUM(sm.quantity), 0)) DESC;

GRANT SELECT ON low_stock_view TO authenticated;

COMMENT ON VIEW low_stock_view IS 'Products that are below their minimum stock level';

-- =====================================================
-- CREATE EXPIRING BATCHES VIEW
-- =====================================================

CREATE OR REPLACE VIEW expiring_batches_view AS
SELECT 
  pb.id as batch_id,
  p.id as product_id,
  p.name as product_name,
  pb.batch_number,
  pb.expiry_date,
  COALESCE(SUM(sm.quantity), 0) as current_stock,
  pb.cost_price,
  pb.selling_price,
  s.name as supplier_name,
  pb.expiry_date - CURRENT_DATE as days_until_expiry
FROM product_batches pb
JOIN products p ON p.id = pb.product_id
LEFT JOIN suppliers s ON s.id = pb.supplier_id
LEFT JOIN stock_movements sm ON sm.product_batch_id = pb.id
WHERE pb.expiry_date IS NOT NULL
  AND pb.expiry_date <= CURRENT_DATE + INTERVAL '90 days'
GROUP BY pb.id, p.id, p.name, pb.batch_number, pb.expiry_date,
         pb.cost_price, pb.selling_price, s.name
HAVING COALESCE(SUM(sm.quantity), 0) > 0
ORDER BY pb.expiry_date ASC;

GRANT SELECT ON expiring_batches_view TO authenticated;

COMMENT ON VIEW expiring_batches_view IS 'Batches that will expire within 90 days with current stock';

-- =====================================================
-- CLEANUP COMPLETE
-- =====================================================

-- Log the completion
DO $$
BEGIN
  RAISE NOTICE 'Schema cleanup complete. Products table is now pure master data.';
  RAISE NOTICE 'Use product_batches for pricing and batch information.';
  RAISE NOTICE 'Use stock_movements for stock changes.';
  RAISE NOTICE 'Use current_stock_view for current stock display.';
  RAISE NOTICE 'Use product_summary_view for inventory listing.';
END $$;
