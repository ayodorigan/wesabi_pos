/*
  # Add Batch Auto-Generation

  ## Overview
  Implements automatic batch number generation for product_batches table.
  This is industry standard for pharmacy POS systems - every purchase creates
  a unique batch that can be tracked independently.

  ## What This Does
  1. Creates function to generate sequential batch numbers per product
  2. Creates trigger to auto-generate batch_number on insert if not provided
  3. Batch numbers follow format: BATCH-YYYY-NNN (e.g., BATCH-2025-001)

  ## Usage
  Frontend can now omit batch_number or pass empty string:
  
  ```sql
  INSERT INTO product_batches (product_id, cost_price, selling_price, ...)
  VALUES (product_id, 50.00, 75.00, ...);
  -- batch_number will be auto-generated: BATCH-2025-001
  ```

  Or provide custom batch number (e.g., from supplier):
  
  ```sql
  INSERT INTO product_batches (product_id, batch_number, ...)
  VALUES (product_id, 'SUPPLIER-BATCH-XYZ', ...);
  -- Uses the provided batch number
  ```

  ## Security
  - No RLS changes needed
  - Function is safe for authenticated users
*/

-- =====================================================
-- FUNCTION: Generate Sequential Batch Numbers
-- =====================================================

CREATE OR REPLACE FUNCTION generate_batch_number(p_product_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count integer;
  v_batch_number text;
  v_year text;
BEGIN
  -- Get current year
  v_year := TO_CHAR(CURRENT_DATE, 'YYYY');
  
  -- Count existing batches for this product this year
  SELECT COUNT(*) INTO v_count
  FROM product_batches
  WHERE product_id = p_product_id
    AND batch_number LIKE 'BATCH-' || v_year || '-%';
  
  -- Generate batch number: BATCH-2025-001, BATCH-2025-002, etc.
  v_batch_number := 'BATCH-' || v_year || '-' || LPAD((v_count + 1)::text, 3, '0');
  
  RETURN v_batch_number;
END;
$$;

COMMENT ON FUNCTION generate_batch_number IS 'Generates sequential batch numbers per product: BATCH-YYYY-NNN';

-- =====================================================
-- TRIGGER: Auto-Generate Batch Number on Insert
-- =====================================================

CREATE OR REPLACE FUNCTION auto_generate_batch_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only generate if batch_number is empty or NULL
  IF NEW.batch_number IS NULL OR NEW.batch_number = '' THEN
    NEW.batch_number := generate_batch_number(NEW.product_id);
  END IF;
  
  RETURN NEW;
END;
$$;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS trigger_auto_generate_batch_number ON product_batches;

CREATE TRIGGER trigger_auto_generate_batch_number
  BEFORE INSERT ON product_batches
  FOR EACH ROW
  EXECUTE FUNCTION auto_generate_batch_number();

COMMENT ON FUNCTION auto_generate_batch_number IS 'Trigger function to auto-generate batch numbers when not provided';

-- =====================================================
-- VERIFICATION
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE 'Batch auto-generation enabled';
  RAISE NOTICE 'Batch numbers will be auto-generated in format: BATCH-YYYY-NNN';
  RAISE NOTICE 'You can still provide custom batch numbers if needed';
END $$;
