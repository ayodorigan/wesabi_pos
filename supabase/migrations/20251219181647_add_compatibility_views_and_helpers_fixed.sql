/*
  # Database Compatibility Layer
  
  ## Overview
  Creates views and helper functions to provide backward compatibility
  while the frontend is being migrated to the new schema.
  
  ## Compatibility Views
  1. `invoices` - Maps purchase_invoices to old invoice structure
  2. `invoice_items` - Maps product_batches to old invoice items structure  
  3. `stock_takes` - Maps stock_take_items to old stock takes structure
  4. `products_with_stock` - Augments products with batch data and calculated stock
  
  ## Helper Functions
  1. `add_stock_movement()` - Create stock movements
  2. `get_batch_stock()` - Calculate current stock for a batch
  3. `get_product_stock()` - Calculate total stock for a product
  4. `get_available_batches()` - Get batches with stock for FEFO selection
  
  ## Temporary Layer
  These views will be removed once frontend migration is complete.
*/

-- =====================================================
-- DROP EXISTING OBJECTS IF THEY EXIST
-- =====================================================

DROP VIEW IF EXISTS invoices CASCADE;
DROP VIEW IF EXISTS invoice_items CASCADE;
DROP VIEW IF EXISTS stock_takes CASCADE;
DROP VIEW IF EXISTS products_with_stock CASCADE;

DROP FUNCTION IF EXISTS add_stock_movement(uuid, integer, text, text, uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS get_batch_stock(uuid) CASCADE;
DROP FUNCTION IF EXISTS get_product_stock(uuid) CASCADE;
DROP FUNCTION IF EXISTS get_available_batches(uuid) CASCADE;

-- =====================================================
-- COMPATIBILITY VIEWS
-- =====================================================

-- Emulate old 'invoices' table from new 'purchase_invoices'
CREATE VIEW invoices AS
SELECT 
  pi.id,
  pi.invoice_number,
  s.name AS supplier,
  pi.invoice_date,
  COALESCE(SUM(pb.cost_price * pb.quantity_received), 0) AS total_amount,
  pi.notes,
  pi.created_by AS user_id,
  up.name AS user_name,
  pi.created_at,
  pi.created_at AS updated_at
FROM purchase_invoices pi
LEFT JOIN suppliers s ON pi.supplier_id = s.id
LEFT JOIN product_batches pb ON pb.purchase_invoice_id = pi.id
LEFT JOIN user_profiles up ON pi.created_by = up.user_id
GROUP BY pi.id, pi.invoice_number, s.name, pi.invoice_date, pi.notes, pi.created_by, up.name, pi.created_at;

COMMENT ON VIEW invoices IS 'Compatibility view - maps purchase_invoices to old invoices structure';

-- Emulate old 'invoice_items' table from new 'product_batches'
CREATE VIEW invoice_items AS
SELECT 
  pb.id,
  pb.purchase_invoice_id AS invoice_id,
  pb.product_id,
  p.name AS product_name,
  c.name AS category,
  pb.batch_number,
  pb.expiry_date,
  pb.quantity_received AS quantity,
  pb.cost_price,
  CASE 
    WHEN COALESCE(pb.supplier_discount_percent, 0) > 0 
    THEN pb.cost_price * (1 - pb.supplier_discount_percent / 100)
    ELSE NULL
  END AS discounted_cost_price,
  pb.cost_price * (1 + COALESCE(pb.vat_rate, 0) / 100) * 1.25 AS selling_price,
  NULL::numeric AS discounted_selling_price,
  (pb.cost_price * COALESCE(pb.vat_rate, 0) / 100) AS vat,
  25.00 AS gross_profit_margin,
  pb.supplier_discount_percent,
  pb.vat_rate,
  pb.cost_price * pb.quantity_received AS total_cost,
  p.barcode
FROM product_batches pb
LEFT JOIN products p ON pb.product_id = p.id
LEFT JOIN categories c ON p.category_id = c.id;

COMMENT ON VIEW invoice_items IS 'Compatibility view - maps product_batches to old invoice_items structure';

-- Emulate old 'stock_takes' table from new 'stock_take_items'
CREATE VIEW stock_takes AS
SELECT 
  sti.id,
  sts.id AS session_id,
  pb.product_id AS product_id,
  p.name AS product_name,
  sti.expected_quantity AS expected_stock,
  COALESCE(sti.actual_quantity, 0) AS actual_stock,
  (COALESCE(sti.actual_quantity, 0) - sti.expected_quantity) AS difference,
  'Stock take' AS reason,
  sts.created_by AS user_id,
  up.name AS user_name,
  sts.started_at AS created_at
FROM stock_take_items sti
LEFT JOIN stock_take_sessions sts ON sti.session_id = sts.id
LEFT JOIN product_batches pb ON sti.product_batch_id = pb.id
LEFT JOIN products p ON pb.product_id = p.id
LEFT JOIN user_profiles up ON sts.created_by = up.user_id;

COMMENT ON VIEW stock_takes IS 'Compatibility view - maps stock_take_items to old stock_takes structure';

-- Emulate products with aggregated stock from stock_movements
CREATE VIEW products_with_stock AS
WITH latest_batches AS (
  SELECT DISTINCT ON (pb.product_id)
    pb.id AS batch_id,
    pb.product_id,
    pb.batch_number,
    pb.expiry_date,
    pb.cost_price,
    pb.supplier_discount_percent,
    pb.vat_rate,
    pb.purchase_invoice_id,
    s.name AS supplier_name,
    pi.invoice_number
  FROM product_batches pb
  LEFT JOIN suppliers s ON pb.supplier_id = s.id
  LEFT JOIN purchase_invoices pi ON pb.purchase_invoice_id = pi.id
  ORDER BY pb.product_id, pb.created_at DESC
),
product_stock AS (
  SELECT 
    pb.product_id,
    COALESCE(SUM(sm.quantity), 0) AS total_stock
  FROM product_batches pb
  LEFT JOIN stock_movements sm ON sm.product_batch_id = pb.id
  GROUP BY pb.product_id
)
SELECT 
  p.id,
  p.name,
  p.barcode,
  c.name AS category,
  lb.supplier_name AS supplier,
  lb.batch_number,
  lb.expiry_date,
  lb.cost_price,
  CASE 
    WHEN COALESCE(lb.supplier_discount_percent, 0) > 0 
    THEN lb.cost_price * (1 - lb.supplier_discount_percent / 100)
    ELSE NULL
  END AS discounted_cost_price,
  lb.cost_price * (1 + COALESCE(lb.vat_rate, 0) / 100) * 1.25 AS selling_price,
  NULL::numeric AS discounted_selling_price,
  (lb.cost_price * COALESCE(lb.vat_rate, 0) / 100) AS vat,
  25.00 AS gross_profit_margin,
  lb.supplier_discount_percent,
  lb.vat_rate,
  NOT p.is_vat_exempt AS has_vat,
  COALESCE(ps.total_stock, 0) AS current_stock,
  p.min_stock_level,
  lb.invoice_number,
  p.created_at,
  p.updated_at
FROM products p
LEFT JOIN categories c ON p.category_id = c.id
LEFT JOIN latest_batches lb ON lb.product_id = p.id
LEFT JOIN product_stock ps ON ps.product_id = p.id;

COMMENT ON VIEW products_with_stock IS 'Compatibility view - augments products with latest batch data and calculated stock';

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Function to add stock movement
CREATE FUNCTION add_stock_movement(
  p_batch_id uuid,
  p_quantity integer,
  p_movement_type text,
  p_reference_type text DEFAULT NULL,
  p_reference_id uuid DEFAULT NULL,
  p_user_id uuid DEFAULT NULL
) RETURNS void AS $$
BEGIN
  INSERT INTO stock_movements (
    product_batch_id,
    movement_type,
    quantity,
    reference_type,
    reference_id,
    created_by
  ) VALUES (
    p_batch_id,
    p_movement_type,
    p_quantity,
    p_reference_type,
    p_reference_id,
    COALESCE(p_user_id, auth.uid())
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION add_stock_movement IS 'Create a stock movement entry';

-- Function to get current stock for a batch
CREATE FUNCTION get_batch_stock(p_batch_id uuid)
RETURNS integer AS $$
  SELECT COALESCE(SUM(quantity), 0)::integer
  FROM stock_movements
  WHERE product_batch_id = p_batch_id;
$$ LANGUAGE sql STABLE;

COMMENT ON FUNCTION get_batch_stock IS 'Calculate current stock for a specific batch';

-- Function to get current stock for a product (all batches)
CREATE FUNCTION get_product_stock(p_product_id uuid)
RETURNS integer AS $$
  SELECT COALESCE(SUM(sm.quantity), 0)::integer
  FROM stock_movements sm
  JOIN product_batches pb ON sm.product_batch_id = pb.id
  WHERE pb.product_id = p_product_id;
$$ LANGUAGE sql STABLE;

COMMENT ON FUNCTION get_product_stock IS 'Calculate total stock for a product across all batches';

-- Function to get available batches for FEFO selection
CREATE FUNCTION get_available_batches(p_product_id uuid)
RETURNS TABLE (
  id uuid,
  batch_number text,
  expiry_date date,
  cost_price numeric,
  selling_price numeric,
  vat_rate numeric,
  current_stock integer,
  supplier_name text
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pb.id,
    pb.batch_number,
    pb.expiry_date,
    pb.cost_price,
    pb.cost_price * (1 + COALESCE(pb.vat_rate, 0) / 100) * 1.25 AS selling_price,
    pb.vat_rate,
    get_batch_stock(pb.id) AS current_stock,
    s.name AS supplier_name
  FROM product_batches pb
  LEFT JOIN suppliers s ON pb.supplier_id = s.id
  WHERE pb.product_id = p_product_id
    AND get_batch_stock(pb.id) > 0
  ORDER BY pb.expiry_date ASC NULLS LAST, pb.created_at ASC;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_available_batches IS 'Get available batches for a product ordered by FEFO (First Expiry, First Out)';

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================

GRANT SELECT ON invoices TO authenticated;
GRANT SELECT ON invoice_items TO authenticated;
GRANT SELECT ON stock_takes TO authenticated;
GRANT SELECT ON products_with_stock TO authenticated;

-- =====================================================
-- VERIFICATION
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '==============================================';
  RAISE NOTICE 'COMPATIBILITY LAYER CREATED';
  RAISE NOTICE '==============================================';
  RAISE NOTICE 'Views created:';
  RAISE NOTICE '  - invoices';
  RAISE NOTICE '  - invoice_items';
  RAISE NOTICE '  - stock_takes';
  RAISE NOTICE '  - products_with_stock';
  RAISE NOTICE '';
  RAISE NOTICE 'Helper functions created:';
  RAISE NOTICE '  - add_stock_movement()';
  RAISE NOTICE '  - get_batch_stock()';
  RAISE NOTICE '  - get_product_stock()';
  RAISE NOTICE '  - get_available_batches() [FEFO]';
  RAISE NOTICE '';
  RAISE NOTICE 'Frontend can now use compatibility layer during migration';
END $$;
