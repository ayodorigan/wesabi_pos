/*
  # Remove Unnecessary Views

  ## Overview
  Removes views that were created in the schema cleanup migration.
  These views don't follow industry standards for pharmacy POS systems
  as they create unnecessary abstractions over simple table references.

  ## Views Being Removed
  - `current_stock_view` - Duplicate aggregation, query batches directly
  - `product_summary_view` - Unnecessary aggregation, query tables directly
  - `low_stock_view` - Calculate on demand in application
  - `expiring_batches_view` - Calculate on demand in application

  ## Best Practice
  - Query product_batches directly for batch information
  - Query stock_movements directly for stock levels
  - Calculate aggregations in application layer when needed
  - Keep database schema simple with normalized tables only
*/

-- Drop all views created in the cleanup migration
DROP VIEW IF EXISTS expiring_batches_view;
DROP VIEW IF EXISTS low_stock_view;
DROP VIEW IF EXISTS product_summary_view;
DROP VIEW IF EXISTS current_stock_view;

-- Remove table comments that reference the removed views
COMMENT ON TABLE products IS 'Master data for products - contains only product identifiers and references to categories and suppliers';

-- Log the completion
DO $$
BEGIN
  RAISE NOTICE 'Unnecessary views removed. Query tables directly for better control.';
  RAISE NOTICE 'Query product_batches for batch information';
  RAISE NOTICE 'Query stock_movements for stock levels';
  RAISE NOTICE 'Calculate aggregations in application layer';
END $$;
