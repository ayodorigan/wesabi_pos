/*
  # Add Comprehensive Pricing Fields to Products Table

  1. New Columns
    - `invoice_price` (numeric) - Original invoice price before any calculations
    - `supplier_discount_percent` (numeric) - Supplier discount percentage (0-100)
    - `vat_rate` (numeric) - VAT rate percentage (default 16%)
    - `other_charges` (numeric) - Additional charges to be added to cost

  2. Changes
    - Add new pricing fields to products table
    - Set sensible defaults for existing products
    - Maintain existing cost_price and selling_price columns
    - All new fields are optional to support existing products

  3. Business Logic (enforced in application)
    - Discounted Amount = invoice_price - (invoice_price × supplier_discount_percent / 100)
    - VAT Amount = Discounted Amount × (vat_rate / 100)
    - Net Cost = Discounted Amount + VAT Amount + other_charges
    - Minimum Selling Price = Net Cost × 1.33

  4. Notes
    - invoice_price: Original price from supplier invoice
    - supplier_discount_percent: Discount provided by supplier (reduces cost)
    - vat_rate: Tax rate (default 16%, increases cost)
    - other_charges: Additional fees (shipping, handling, etc.)
    - If invoice_price is NULL, system falls back to cost_price for calculations
*/

-- Add new pricing fields to products table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'invoice_price'
  ) THEN
    ALTER TABLE products ADD COLUMN invoice_price numeric(10,2) CHECK (invoice_price >= 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'supplier_discount_percent'
  ) THEN
    ALTER TABLE products ADD COLUMN supplier_discount_percent numeric(5,2) DEFAULT 0 CHECK (supplier_discount_percent >= 0 AND supplier_discount_percent <= 100);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'vat_rate'
  ) THEN
    ALTER TABLE products ADD COLUMN vat_rate numeric(5,2) DEFAULT 16 CHECK (vat_rate >= 0 AND vat_rate <= 100);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'other_charges'
  ) THEN
    ALTER TABLE products ADD COLUMN other_charges numeric(10,2) DEFAULT 0 CHECK (other_charges >= 0);
  END IF;
END $$;

-- Add helpful comment to the table
COMMENT ON COLUMN products.invoice_price IS 'Original invoice price from supplier before discounts';
COMMENT ON COLUMN products.supplier_discount_percent IS 'Supplier discount percentage (0-100)';
COMMENT ON COLUMN products.vat_rate IS 'VAT/Tax rate percentage (default 16%)';
COMMENT ON COLUMN products.other_charges IS 'Additional charges added to cost (shipping, handling, etc.)';
COMMENT ON COLUMN products.cost_price IS 'Legacy cost price or calculated net cost';
COMMENT ON COLUMN products.selling_price IS 'Final selling price (must be >= net_cost × 1.33)';
