/*
  # M-Pesa Transactions Table

  1. New Tables
    - `mpesa_transactions`
      - `id` (uuid, primary key)
      - `merchant_request_id` (text) - For STK Push
      - `checkout_request_id` (text) - For STK Push
      - `mpesa_receipt_number` (text) - M-Pesa confirmation code
      - `transaction_date` (text) - Date from M-Pesa
      - `phone_number` (text) - Customer phone
      - `amount` (numeric) - Transaction amount
      - `business_short_code` (text) - Till/Paybill number
      - `bill_ref_number` (text) - Reference/Receipt number
      - `result_code` (integer) - Response code (0 = success)
      - `result_description` (text) - Response description
      - `transaction_status` (text) - pending/completed/failed
      - `transaction_type` (text) - STK/C2B
      - `customer_name` (text) - Customer name from C2B
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Updates to Sales Table
    - Add `checkout_request_id` column for linking STK Push
    - Add `payment_status` column (pending/completed/failed)
    - Add `mpesa_receipt_number` column
    - Add `customer_phone` column

  3. Security
    - Enable RLS on `mpesa_transactions` table
    - Add policies for authenticated users
*/

-- Create mpesa_transactions table
CREATE TABLE IF NOT EXISTS mpesa_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_request_id text,
  checkout_request_id text,
  mpesa_receipt_number text,
  transaction_date text,
  phone_number text,
  amount numeric DEFAULT 0,
  business_short_code text,
  bill_ref_number text,
  result_code integer,
  result_description text,
  transaction_status text DEFAULT 'pending',
  transaction_type text DEFAULT 'STK',
  customer_name text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_mpesa_checkout_request ON mpesa_transactions(checkout_request_id);
CREATE INDEX IF NOT EXISTS idx_mpesa_receipt_number ON mpesa_transactions(mpesa_receipt_number);
CREATE INDEX IF NOT EXISTS idx_mpesa_bill_ref ON mpesa_transactions(bill_ref_number);
CREATE INDEX IF NOT EXISTS idx_mpesa_phone ON mpesa_transactions(phone_number);
CREATE INDEX IF NOT EXISTS idx_mpesa_status ON mpesa_transactions(transaction_status);

-- Enable RLS
ALTER TABLE mpesa_transactions ENABLE ROW LEVEL SECURITY;

-- Policies for mpesa_transactions
CREATE POLICY "Authenticated users can view mpesa transactions"
  ON mpesa_transactions
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Service role can insert mpesa transactions"
  ON mpesa_transactions
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Service role can update mpesa transactions"
  ON mpesa_transactions
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Add columns to sales table if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sales' AND column_name = 'checkout_request_id'
  ) THEN
    ALTER TABLE sales ADD COLUMN checkout_request_id text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sales' AND column_name = 'payment_status'
  ) THEN
    ALTER TABLE sales ADD COLUMN payment_status text DEFAULT 'completed';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sales' AND column_name = 'mpesa_receipt_number'
  ) THEN
    ALTER TABLE sales ADD COLUMN mpesa_receipt_number text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sales' AND column_name = 'customer_phone'
  ) THEN
    ALTER TABLE sales ADD COLUMN customer_phone text;
  END IF;
END $$;

-- Create indexes on sales table
CREATE INDEX IF NOT EXISTS idx_sales_checkout_request ON sales(checkout_request_id);
CREATE INDEX IF NOT EXISTS idx_sales_payment_status ON sales(payment_status);
CREATE INDEX IF NOT EXISTS idx_sales_mpesa_receipt ON sales(mpesa_receipt_number);

-- Create M-Pesa configuration table for storing settings
CREATE TABLE IF NOT EXISTS mpesa_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  config_key text UNIQUE NOT NULL,
  config_value text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE mpesa_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view mpesa config"
  ON mpesa_config
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can manage mpesa config"
  ON mpesa_config
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
