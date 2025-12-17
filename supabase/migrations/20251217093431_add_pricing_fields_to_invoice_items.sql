/*
  # Add Pricing Fields to Invoice Items Table

  1. Changes
    - Add `invoice_price` column to invoice_items table
    - Add `supplier_discount_percent` column to invoice_items table
    - Add `vat_rate` column to invoice_items table
    - Add `other_charges` column to invoice_items table

  2. Notes
    - All new fields are optional to support existing invoice items
    - These fields allow tracking of the original pricing breakdown for each invoice item
*/

-- Add new pricing fields to invoice_items table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'invoice_items' AND column_name = 'invoice_price'
  ) THEN
    ALTER TABLE invoice_items ADD COLUMN invoice_price numeric(10,2) CHECK (invoice_price >= 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'invoice_items' AND column_name = 'supplier_discount_percent'
  ) THEN
    ALTER TABLE invoice_items ADD COLUMN supplier_discount_percent numeric(5,2) DEFAULT 0 CHECK (supplier_discount_percent >= 0 AND supplier_discount_percent <= 100);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'invoice_items' AND column_name = 'vat_rate'
  ) THEN
    ALTER TABLE invoice_items ADD COLUMN vat_rate numeric(5,2) DEFAULT 0 CHECK (vat_rate >= 0 AND vat_rate <= 100);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'invoice_items' AND column_name = 'other_charges'
  ) THEN
    ALTER TABLE invoice_items ADD COLUMN other_charges numeric(10,2) DEFAULT 0 CHECK (other_charges >= 0);
  END IF;
END $$;

-- Add comments
COMMENT ON COLUMN invoice_items.invoice_price IS 'Original invoice price from supplier before discounts';
COMMENT ON COLUMN invoice_items.supplier_discount_percent IS 'Supplier discount percentage (0-100)';
COMMENT ON COLUMN invoice_items.vat_rate IS 'VAT/Tax rate percentage';
COMMENT ON COLUMN invoice_items.other_charges IS 'Additional charges added to cost';
