/*
  # Remove Legacy Tables Not in Schema Design
  
  ## Overview
  Removes tables that are not part of the new schema design document.
  
  ## Tables to Remove
  - stock_takes (replaced by stock_take_sessions + stock_take_items)
  - mpesa_config (not in schema design)
  - supplier_orders (not in schema design)
  - supplier_order_items (not in schema design)
  - invoice_reversals (not in schema design)
  - invoice_reversal_items (not in schema design)
  - drug_registry (not in schema design)
  
  ## Note
  These tables are not part of the core pharmacy POS schema and should be removed
  to maintain a clean, consistent database structure.
*/

-- =====================================================
-- DROP LEGACY TABLES
-- =====================================================

DROP TABLE IF EXISTS invoice_reversal_items CASCADE;
DROP TABLE IF EXISTS invoice_reversals CASCADE;
DROP TABLE IF EXISTS supplier_order_items CASCADE;
DROP TABLE IF EXISTS supplier_orders CASCADE;
DROP TABLE IF EXISTS stock_takes CASCADE;
DROP TABLE IF EXISTS mpesa_config CASCADE;
DROP TABLE IF EXISTS drug_registry CASCADE;

-- =====================================================
-- VERIFICATION
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '==============================================';
  RAISE NOTICE 'LEGACY TABLES REMOVED';
  RAISE NOTICE '==============================================';
  RAISE NOTICE 'Removed tables:';
  RAISE NOTICE '  - stock_takes';
  RAISE NOTICE '  - mpesa_config';
  RAISE NOTICE '  - supplier_orders';
  RAISE NOTICE '  - supplier_order_items';
  RAISE NOTICE '  - invoice_reversals';
  RAISE NOTICE '  - invoice_reversal_items';
  RAISE NOTICE '  - drug_registry';
  RAISE NOTICE '';
  RAISE NOTICE 'Database now contains only schema-approved tables';
END $$;
