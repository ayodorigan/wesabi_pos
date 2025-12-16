/*
  # Add created_at column to stock_take_sessions table

  1. Changes
    - Add `created_at` column to `stock_take_sessions` table
    - Set default value to `now()` for new records
    - Backfill existing records with `started_at` value
    - Add index on `created_at` for performance

  2. Notes
    - This resolves the error where the application expects `created_at` but the table only has `started_at`
    - Existing sessions will have their `created_at` set to their `started_at` value
*/

-- Add created_at column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'stock_take_sessions' AND column_name = 'created_at'
  ) THEN
    ALTER TABLE stock_take_sessions 
    ADD COLUMN created_at timestamptz DEFAULT now();
    
    -- Backfill existing records with started_at value
    UPDATE stock_take_sessions 
    SET created_at = started_at 
    WHERE created_at IS NULL;
  END IF;
END $$;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_stock_take_sessions_created_at 
ON stock_take_sessions(created_at);