/*
  # Helper Functions and Triggers
  
  ## Overview
  Creates essential functions and triggers for the pharmacy POS system.
  
  ## Functions
  1. Auto-create user profiles when new users sign up
  2. Auto-generate batch numbers
  3. Auto-create stock movements when batches are purchased
  4. Helper functions for user management
  
  ## Triggers
  1. Create user profile on auth.users insert
  2. Generate batch number on product_batches insert
  3. Create stock movement on product_batches insert
*/

-- =====================================================
-- USER PROFILE AUTO-CREATION
-- =====================================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.user_profiles (user_id, name, role, is_active)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'role', 'sales'),
    true
  );
  RETURN NEW;
END;
$$;

-- Drop and recreate trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

COMMENT ON FUNCTION handle_new_user IS 'Automatically creates user profile when new user signs up';

-- =====================================================
-- BATCH NUMBER AUTO-GENERATION
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
  v_year := TO_CHAR(CURRENT_DATE, 'YYYY');
  
  SELECT COUNT(*) INTO v_count
  FROM product_batches
  WHERE product_id = p_product_id
    AND batch_number LIKE 'BATCH-' || v_year || '-%';
  
  v_batch_number := 'BATCH-' || v_year || '-' || LPAD((v_count + 1)::text, 3, '0');
  
  RETURN v_batch_number;
END;
$$;

COMMENT ON FUNCTION generate_batch_number IS 'Generates sequential batch numbers: BATCH-YYYY-NNN';

-- =====================================================
-- AUTO-GENERATE BATCH NUMBER TRIGGER
-- =====================================================

CREATE OR REPLACE FUNCTION auto_generate_batch_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.batch_number IS NULL OR NEW.batch_number = '' THEN
    NEW.batch_number := generate_batch_number(NEW.product_id);
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_auto_generate_batch_number ON product_batches;

CREATE TRIGGER trigger_auto_generate_batch_number
  BEFORE INSERT ON product_batches
  FOR EACH ROW
  EXECUTE FUNCTION auto_generate_batch_number();

COMMENT ON FUNCTION auto_generate_batch_number IS 'Trigger to auto-generate batch numbers when not provided';

-- =====================================================
-- AUTO-CREATE STOCK MOVEMENT ON BATCH INSERT
-- =====================================================

CREATE OR REPLACE FUNCTION create_purchase_stock_movement()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO stock_movements (
    product_batch_id,
    movement_type,
    quantity,
    reference_type,
    reference_id,
    created_by
  ) VALUES (
    NEW.id,
    'purchase',
    NEW.quantity_received,
    'purchase_invoice',
    NEW.purchase_invoice_id,
    auth.uid()
  );
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_create_purchase_stock_movement ON product_batches;

CREATE TRIGGER trigger_create_purchase_stock_movement
  AFTER INSERT ON product_batches
  FOR EACH ROW
  EXECUTE FUNCTION create_purchase_stock_movement();

COMMENT ON FUNCTION create_purchase_stock_movement IS 'Automatically creates stock movement when new batch is purchased';

-- =====================================================
-- HELPER: GET ALL USERS
-- =====================================================

CREATE OR REPLACE FUNCTION get_all_users()
RETURNS TABLE (
  id uuid,
  email text,
  name text,
  role text,
  is_active boolean,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    u.id,
    u.email,
    up.name,
    up.role,
    up.is_active,
    u.created_at
  FROM auth.users u
  LEFT JOIN user_profiles up ON u.id = up.user_id
  ORDER BY u.created_at DESC;
END;
$$;

COMMENT ON FUNCTION get_all_users IS 'Returns all users with their profiles';

-- =====================================================
-- HELPER: CHECK IF USERS EXIST
-- =====================================================

CREATE OR REPLACE FUNCTION check_users_exist(emails text[])
RETURNS TABLE (
  email text,
  user_exists boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    e.email,
    EXISTS(SELECT 1 FROM auth.users WHERE auth.users.email = e.email) as user_exists
  FROM unnest(emails) as e(email);
END;
$$;

COMMENT ON FUNCTION check_users_exist IS 'Checks which emails already exist in the system';

-- =====================================================
-- HELPER: GET USERS WITH EMAILS
-- =====================================================

CREATE OR REPLACE FUNCTION get_users_with_emails(emails text[])
RETURNS TABLE (
  id uuid,
  email text,
  name text,
  role text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    u.id,
    u.email,
    up.name,
    up.role
  FROM auth.users u
  LEFT JOIN user_profiles up ON u.id = up.user_id
  WHERE u.email = ANY(emails);
END;
$$;

COMMENT ON FUNCTION get_users_with_emails IS 'Returns user details for given email addresses';

-- =====================================================
-- VERIFICATION
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '==============================================';
  RAISE NOTICE 'HELPER FUNCTIONS AND TRIGGERS CREATED';
  RAISE NOTICE '==============================================';
  RAISE NOTICE 'User Management:';
  RAISE NOTICE '  - Auto-create user profiles on signup';
  RAISE NOTICE '  - get_all_users() function';
  RAISE NOTICE '  - check_users_exist() function';
  RAISE NOTICE '';
  RAISE NOTICE 'Batch Management:';
  RAISE NOTICE '  - Auto-generate batch numbers';
  RAISE NOTICE '  - Auto-create stock movements on purchase';
  RAISE NOTICE '';
  RAISE NOTICE 'Stock Ledger:';
  RAISE NOTICE '  - Purchases automatically create stock_movements';
  RAISE NOTICE '  - Current stock = SUM(quantity) from stock_movements';
END $$;
