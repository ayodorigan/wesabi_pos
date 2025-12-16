/*
  # Fix User Deletion Cascade Constraints
  
  1. Purpose
     - Fix foreign key constraints so user deletion doesn't fail
     - Preserve historical records when users are deleted
     - Set user_id to NULL in historical records instead of blocking deletion
  
  2. Changes
     - Drop existing foreign key constraints on user_id columns
     - Recreate with ON DELETE SET NULL
     - Applies to: invoices, credit_notes, sales, price_history, stock_takes, stock_take_sessions, activity_logs
  
  3. Tables Modified
     - invoices: user_id -> ON DELETE SET NULL
     - credit_notes: user_id -> ON DELETE SET NULL
     - sales: sales_person_id -> ON DELETE SET NULL
     - price_history: user_id -> ON DELETE SET NULL
     - stock_takes: user_id -> ON DELETE SET NULL
     - stock_take_sessions: user_id -> ON DELETE SET NULL
     - activity_logs: user_id -> ON DELETE SET NULL
*/

-- Drop and recreate foreign key constraint for invoices
DO $$ 
BEGIN
  -- Drop existing constraint if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'invoices_user_id_fkey' 
    AND table_name = 'invoices'
  ) THEN
    ALTER TABLE invoices DROP CONSTRAINT invoices_user_id_fkey;
  END IF;
  
  -- Add new constraint with ON DELETE SET NULL
  ALTER TABLE invoices 
    ADD CONSTRAINT invoices_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
END $$;

-- Drop and recreate foreign key constraint for credit_notes
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'credit_notes_user_id_fkey' 
    AND table_name = 'credit_notes'
  ) THEN
    ALTER TABLE credit_notes DROP CONSTRAINT credit_notes_user_id_fkey;
  END IF;
  
  ALTER TABLE credit_notes 
    ADD CONSTRAINT credit_notes_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
END $$;

-- Drop and recreate foreign key constraint for sales
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'sales_sales_person_id_fkey' 
    AND table_name = 'sales'
  ) THEN
    ALTER TABLE sales DROP CONSTRAINT sales_sales_person_id_fkey;
  END IF;
  
  ALTER TABLE sales 
    ADD CONSTRAINT sales_sales_person_id_fkey 
    FOREIGN KEY (sales_person_id) REFERENCES auth.users(id) ON DELETE SET NULL;
END $$;

-- Drop and recreate foreign key constraint for price_history
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'price_history_user_id_fkey' 
    AND table_name = 'price_history'
  ) THEN
    ALTER TABLE price_history DROP CONSTRAINT price_history_user_id_fkey;
  END IF;
  
  ALTER TABLE price_history 
    ADD CONSTRAINT price_history_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
END $$;

-- Drop and recreate foreign key constraint for stock_takes
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'stock_takes_user_id_fkey' 
    AND table_name = 'stock_takes'
  ) THEN
    ALTER TABLE stock_takes DROP CONSTRAINT stock_takes_user_id_fkey;
  END IF;
  
  ALTER TABLE stock_takes 
    ADD CONSTRAINT stock_takes_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
END $$;

-- Drop and recreate foreign key constraint for stock_take_sessions
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'stock_take_sessions_user_id_fkey' 
    AND table_name = 'stock_take_sessions'
  ) THEN
    ALTER TABLE stock_take_sessions DROP CONSTRAINT stock_take_sessions_user_id_fkey;
  END IF;
  
  ALTER TABLE stock_take_sessions 
    ADD CONSTRAINT stock_take_sessions_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
END $$;

-- Drop and recreate foreign key constraint for activity_logs
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'activity_logs_user_id_fkey' 
    AND table_name = 'activity_logs'
  ) THEN
    ALTER TABLE activity_logs DROP CONSTRAINT activity_logs_user_id_fkey;
  END IF;
  
  ALTER TABLE activity_logs 
    ADD CONSTRAINT activity_logs_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
END $$;