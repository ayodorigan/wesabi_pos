/*
  # Add Progress Data to Stock Take Sessions

  1. Changes
    - Add `progress_data` column to `stock_take_sessions` table
    - This will store the intermediate stock counts as JSONB
    - Allows users to save their work and resume later

  2. Structure
    - `progress_data` will contain a JSON object with product IDs as keys
    - Each product will have actualStock and reason fields
*/

-- Add progress_data column to stock_take_sessions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'stock_take_sessions' AND column_name = 'progress_data'
  ) THEN
    ALTER TABLE stock_take_sessions 
    ADD COLUMN progress_data jsonb DEFAULT '{}'::jsonb;
  END IF;
END $$;