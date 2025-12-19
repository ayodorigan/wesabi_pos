/*
  # Add Advanced Pricing Fields to Invoice Items Table

  1. Changes
    - Add `discounted_cost` column to invoice_items table
    - Add `minimum_selling_price` column to invoice_items table
    - Add `target_selling_price` column to invoice_items table

  2. Notes
    - All new fields are optional to support existing invoice items
    - These fields store the calculated pricing breakdown from the invoice process
    - discounted_cost: Cost after applying supplier discount
    - minimum_selling_price: Minimum profitable selling price
    - target_selling_price: Recommended retail price
*/

-- Add discounted_cost field
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'invoice_items' AND column_name = 'discounted_cost'
  ) THEN
    ALTER TABLE invoice_items ADD COLUMN discounted_cost numeric(10,2) CHECK (discounted_cost >= 0);
  END IF;
END $$;

-- Add minimum_selling_price field
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'invoice_items' AND column_name = 'minimum_selling_price'
  ) THEN
    ALTER TABLE invoice_items ADD COLUMN minimum_selling_price numeric(10,2) CHECK (minimum_selling_price >= 0);
  END IF;
END $$;

-- Add target_selling_price field
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'invoice_items' AND column_name = 'target_selling_price'
  ) THEN
    ALTER TABLE invoice_items ADD COLUMN target_selling_price numeric(10,2) CHECK (target_selling_price >= 0);
  END IF;
END $$;

-- Add comments for documentation
COMMENT ON COLUMN invoice_items.discounted_cost IS 'Cost after applying supplier discount';
COMMENT ON COLUMN invoice_items.minimum_selling_price IS 'Minimum profitable selling price (floor price)';
COMMENT ON COLUMN invoice_items.target_selling_price IS 'Recommended retail price for optimal margin';
