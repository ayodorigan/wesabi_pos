/*
  # Remove Old Schema Tables
  
  ## Overview
  This migration removes all the old schema tables that are not part of the new batch-based design.
  
  ## Tables Removed
  - products (old version with stock in product table)
  - invoices (old supplier invoices)
  - invoice_items (old invoice items)
  - credit_notes (old credit notes)
  - credit_note_items (old credit note items)
  - sales (old sales)
  - sale_items (old sale items)
  - price_history (old price history)
  - stock_takes (old stock takes)
  - stock_take_sessions (old stock take sessions)
  
  ## Note
  This prepares the database for a clean implementation of the new schema
*/

-- =====================================================
-- DROP OLD SCHEMA TABLES
-- =====================================================

DROP TABLE IF EXISTS stock_takes CASCADE;
DROP TABLE IF EXISTS stock_take_sessions CASCADE;
DROP TABLE IF EXISTS price_history CASCADE;
DROP TABLE IF EXISTS sale_items CASCADE;
DROP TABLE IF EXISTS sales CASCADE;
DROP TABLE IF EXISTS credit_note_items CASCADE;
DROP TABLE IF EXISTS credit_notes CASCADE;
DROP TABLE IF EXISTS invoice_items CASCADE;
DROP TABLE IF EXISTS invoices CASCADE;
DROP TABLE IF EXISTS products CASCADE;

-- =====================================================
-- VERIFICATION
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '==============================================';
  RAISE NOTICE 'OLD SCHEMA TABLES REMOVED';
  RAISE NOTICE '==============================================';
  RAISE NOTICE 'Old tables dropped successfully';
END $$;
