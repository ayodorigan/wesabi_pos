/*
  # Clean Slate - Drop Everything
  
  ## Overview
  This migration drops all existing database objects to prepare for a complete schema redesign.
  This is a destructive operation that removes all tables, functions, triggers, and policies.
  
  ## What Gets Dropped
  - All custom tables in the public schema
  - All views
  - All functions
  - All triggers
  - All RLS policies
  
  ## Note
  - auth.users table is NOT dropped (managed by Supabase)
  - This allows for a clean start following the new schema design
*/

-- =====================================================
-- DROP ALL VIEWS
-- =====================================================

DROP VIEW IF EXISTS expiring_batches_view CASCADE;
DROP VIEW IF EXISTS low_stock_view CASCADE;
DROP VIEW IF EXISTS product_summary_view CASCADE;
DROP VIEW IF EXISTS current_stock_view CASCADE;

-- =====================================================
-- DROP ALL TABLES (in correct order to avoid FK issues)
-- =====================================================

-- Drop tables that reference other tables first
DROP TABLE IF EXISTS activity_logs CASCADE;
DROP TABLE IF EXISTS price_history CASCADE;
DROP TABLE IF EXISTS stock_take_items CASCADE;
DROP TABLE IF EXISTS stock_take_sessions CASCADE;
DROP TABLE IF EXISTS customer_return_items CASCADE;
DROP TABLE IF EXISTS customer_returns CASCADE;
DROP TABLE IF EXISTS credit_note_items CASCADE;
DROP TABLE IF EXISTS credit_notes CASCADE;
DROP TABLE IF EXISTS mpesa_transactions CASCADE;
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS sale_items CASCADE;
DROP TABLE IF EXISTS sales CASCADE;
DROP TABLE IF EXISTS stock_movements CASCADE;
DROP TABLE IF EXISTS product_batches CASCADE;
DROP TABLE IF EXISTS purchase_invoice_items CASCADE;
DROP TABLE IF EXISTS purchase_invoices CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS categories CASCADE;
DROP TABLE IF EXISTS suppliers CASCADE;
DROP TABLE IF EXISTS user_profiles CASCADE;

-- Legacy tables if they exist
DROP TABLE IF EXISTS inventory CASCADE;
DROP TABLE IF EXISTS invoices CASCADE;
DROP TABLE IF EXISTS invoice_items CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS order_items CASCADE;

-- =====================================================
-- DROP ALL FUNCTIONS
-- =====================================================

DROP FUNCTION IF EXISTS generate_batch_number(uuid) CASCADE;
DROP FUNCTION IF EXISTS auto_generate_batch_number() CASCADE;
DROP FUNCTION IF EXISTS handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS create_user_profile() CASCADE;
DROP FUNCTION IF EXISTS get_all_users() CASCADE;
DROP FUNCTION IF EXISTS check_users_exist(text[]) CASCADE;
DROP FUNCTION IF EXISTS get_users_with_emails(text[]) CASCADE;

-- =====================================================
-- DROP ALL TRIGGERS
-- =====================================================

-- Triggers are dropped automatically with CASCADE on functions and tables

-- =====================================================
-- VERIFICATION
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '==============================================';
  RAISE NOTICE 'DATABASE CLEANED - ALL OBJECTS DROPPED';
  RAISE NOTICE '==============================================';
  RAISE NOTICE 'Ready for new schema creation';
  RAISE NOTICE 'auth.users table preserved (Supabase managed)';
END $$;
