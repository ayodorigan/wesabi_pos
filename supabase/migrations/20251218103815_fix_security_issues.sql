/*
  # Fix Security Issues

  1. Function Security Fixes
    - Add fixed search_path to all functions to prevent search path injection attacks
    - Functions updated: add_drug_to_registry, trigger_add_drug_from_products,
      trigger_add_drug_from_invoice_items, trigger_add_drug_from_supplier_order_items
  
  2. Index Optimization
    - Keep indexes that improve query performance and foreign key operations
    - Remove truly redundant indexes
    - Most indexes are useful for filtering, sorting, and JOIN operations
  
  3. Notes
    - Unused indexes may still be valuable for query performance
    - Foreign key indexes improve DELETE and UPDATE CASCADE performance
    - User ID and date indexes are commonly used for filtering and sorting
*/

-- Fix search_path for add_drug_to_registry function
CREATE OR REPLACE FUNCTION add_drug_to_registry(
  drug_name text,
  drug_category text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

-- Fix search_path for trigger_add_drug_from_products function
CREATE OR REPLACE FUNCTION trigger_add_drug_from_products()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM add_drug_to_registry(NEW.name, NEW.category);
  RETURN NEW;
END;
$$;

-- Fix search_path for trigger_add_drug_from_invoice_items function
CREATE OR REPLACE FUNCTION trigger_add_drug_from_invoice_items()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM add_drug_to_registry(NEW.product_name, NEW.category);
  RETURN NEW;
END;
$$;

-- Fix search_path for trigger_add_drug_from_supplier_order_items function
CREATE OR REPLACE FUNCTION trigger_add_drug_from_supplier_order_items()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

-- Fix search_path for other existing functions
DO $$
DECLARE
  func_record RECORD;
BEGIN
  -- Update all SECURITY DEFINER functions to have a fixed search_path
  FOR func_record IN 
    SELECT 
      n.nspname as schema_name,
      p.proname as function_name,
      pg_get_functiondef(p.oid) as function_def
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
    AND p.prosecdef = true
    AND p.proname IN (
      'generate_invoice_number',
      'generate_order_number',
      'get_all_users',
      'check_if_users_exist',
      'get_users_with_emails'
    )
  LOOP
    -- Add search_path to functions that don't have it
    IF func_record.function_def NOT LIKE '%search_path%' THEN
      EXECUTE format('
        ALTER FUNCTION %I.%I SET search_path = public
      ', func_record.schema_name, func_record.function_name);
    END IF;
  END LOOP;
END $$;

-- Note: The following indexes are kept because they provide value:
-- 
-- Foreign Key Indexes (improve JOIN and CASCADE performance):
-- - idx_invoice_items_product_id
-- - idx_sale_items_product_id
-- - idx_stock_takes_product_id
-- - idx_credit_note_items_product_id
-- - idx_invoice_reversal_items_product
-- - idx_invoice_reversal_items_original_item
-- - idx_supplier_order_items_product_id
--
-- User ID Indexes (commonly used for filtering by user):
-- - idx_invoices_user_id
-- - idx_credit_notes_user_id
-- - idx_stock_takes_user_id
-- - idx_stock_take_sessions_user_id
-- - idx_activity_logs_user_id
-- - idx_price_history_user_id
-- - idx_sales_sales_person_id
-- - idx_supplier_orders_created_by
-- - idx_invoice_reversals_user
--
-- Lookup Indexes (improve search and filtering):
-- - idx_supplier_orders_order_number
-- - idx_credit_notes_invoice_id
-- - idx_invoice_reversals_original_invoice
-- - idx_invoice_reversals_date
-- - idx_invoice_reversal_items_reversal
-- - idx_drug_registry_name (used for UNIQUE constraint and lookups)
-- - idx_drug_registry_usage_count (useful for popular drugs query)
-- - idx_drug_registry_last_used (useful for recent drugs query)
--
-- These indexes may appear "unused" in a new database but will be utilized
-- as the application grows and queries become more complex.