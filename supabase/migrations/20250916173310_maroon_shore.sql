/*
  # Reset and Recreate All RLS Policies

  This migration resets all RLS policies and recreates them properly according to user roles.
  
  ## User Roles:
  - super_admin: Full access to everything
  - admin: Full access except user management
  - sales: Can manage inventory, POS, view sales history
  - inventory: Can only manage inventory
  - stock_take: Can only perform stock takes
  
  ## Tables Updated:
  1. user_profiles - User profile management
  2. products - Product inventory management
  3. price_history - Product price tracking
  4. sales - Sales transactions
  5. sale_items - Individual sale items
  6. stock_takes - Stock take records
  7. stock_take_sessions - Stock take session management
  8. activity_logs - System activity logging
*/

-- Drop all existing policies
DROP POLICY IF EXISTS "Super admins can delete profiles" ON user_profiles;
DROP POLICY IF EXISTS "Super admins can insert profiles" ON user_profiles;
DROP POLICY IF EXISTS "Super admins can read all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Super admins can update all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can read own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;

DROP POLICY IF EXISTS "All authenticated users can read products" ON products;
DROP POLICY IF EXISTS "Authenticated users can insert products" ON products;
DROP POLICY IF EXISTS "Authorized users can update products" ON products;
DROP POLICY IF EXISTS "Only admins can delete products" ON products;

DROP POLICY IF EXISTS "All authenticated users can insert price_history" ON price_history;
DROP POLICY IF EXISTS "All authenticated users can read price_history" ON price_history;

DROP POLICY IF EXISTS "Authorized users can insert sales" ON sales;
DROP POLICY IF EXISTS "Authorized users can read sales" ON sales;

DROP POLICY IF EXISTS "Authorized users can insert sale_items" ON sale_items;
DROP POLICY IF EXISTS "Authorized users can read sale_items" ON sale_items;

DROP POLICY IF EXISTS "Authorized users can manage stock takes" ON stock_takes;
DROP POLICY IF EXISTS "Authorized users can manage stock take sessions" ON stock_take_sessions;

DROP POLICY IF EXISTS "All authenticated users can insert activity_logs" ON activity_logs;
DROP POLICY IF EXISTS "Authorized users can read activity_logs" ON activity_logs;

-- Create helper function to get user role (if not exists)
CREATE OR REPLACE FUNCTION get_user_role(user_uuid uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    user_role text;
BEGIN
    SELECT role INTO user_role
    FROM user_profiles
    WHERE user_id = user_uuid;
    
    RETURN COALESCE(user_role, 'sales');
END;
$$;

-- USER_PROFILES table policies
CREATE POLICY "Users can insert own profile"
    ON user_profiles FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can read own profile"
    ON user_profiles FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile"
    ON user_profiles FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Super admins can read all profiles"
    ON user_profiles FOR SELECT
    TO authenticated
    USING (get_user_role(auth.uid()) = 'super_admin');

CREATE POLICY "Super admins can insert profiles"
    ON user_profiles FOR INSERT
    TO authenticated
    WITH CHECK (get_user_role(auth.uid()) = 'super_admin');

CREATE POLICY "Super admins can update all profiles"
    ON user_profiles FOR UPDATE
    TO authenticated
    USING (get_user_role(auth.uid()) = 'super_admin');

CREATE POLICY "Super admins can delete profiles"
    ON user_profiles FOR DELETE
    TO authenticated
    USING (get_user_role(auth.uid()) = 'super_admin');

-- PRODUCTS table policies
CREATE POLICY "All authenticated users can read products"
    ON products FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Inventory managers can insert products"
    ON products FOR INSERT
    TO authenticated
    WITH CHECK (get_user_role(auth.uid()) = ANY (ARRAY['super_admin', 'admin', 'sales', 'inventory']));

CREATE POLICY "Inventory managers can update products"
    ON products FOR UPDATE
    TO authenticated
    USING (get_user_role(auth.uid()) = ANY (ARRAY['super_admin', 'admin', 'sales', 'inventory']))
    WITH CHECK (get_user_role(auth.uid()) = ANY (ARRAY['super_admin', 'admin', 'sales', 'inventory']));

CREATE POLICY "Only admins can delete products"
    ON products FOR DELETE
    TO authenticated
    USING (get_user_role(auth.uid()) = ANY (ARRAY['super_admin', 'admin']));

-- PRICE_HISTORY table policies
CREATE POLICY "All authenticated users can read price_history"
    ON price_history FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "All authenticated users can insert price_history"
    ON price_history FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- SALES table policies
CREATE POLICY "Sales users can read sales"
    ON sales FOR SELECT
    TO authenticated
    USING (get_user_role(auth.uid()) = ANY (ARRAY['super_admin', 'admin', 'sales']));

CREATE POLICY "Sales users can insert sales"
    ON sales FOR INSERT
    TO authenticated
    WITH CHECK (get_user_role(auth.uid()) = ANY (ARRAY['super_admin', 'admin', 'sales']));

-- SALE_ITEMS table policies
CREATE POLICY "Sales users can read sale_items"
    ON sale_items FOR SELECT
    TO authenticated
    USING (get_user_role(auth.uid()) = ANY (ARRAY['super_admin', 'admin', 'sales']));

CREATE POLICY "Sales users can insert sale_items"
    ON sale_items FOR INSERT
    TO authenticated
    WITH CHECK (get_user_role(auth.uid()) = ANY (ARRAY['super_admin', 'admin', 'sales']));

-- STOCK_TAKES table policies
CREATE POLICY "Stock take users can read stock_takes"
    ON stock_takes FOR SELECT
    TO authenticated
    USING (get_user_role(auth.uid()) = ANY (ARRAY['super_admin', 'admin', 'stock_take']));

CREATE POLICY "Stock take users can insert stock_takes"
    ON stock_takes FOR INSERT
    TO authenticated
    WITH CHECK (get_user_role(auth.uid()) = ANY (ARRAY['super_admin', 'admin', 'stock_take']));

CREATE POLICY "Stock take users can update stock_takes"
    ON stock_takes FOR UPDATE
    TO authenticated
    USING (get_user_role(auth.uid()) = ANY (ARRAY['super_admin', 'admin', 'stock_take']))
    WITH CHECK (get_user_role(auth.uid()) = ANY (ARRAY['super_admin', 'admin', 'stock_take']));

CREATE POLICY "Stock take users can delete stock_takes"
    ON stock_takes FOR DELETE
    TO authenticated
    USING (get_user_role(auth.uid()) = ANY (ARRAY['super_admin', 'admin', 'stock_take']));

-- STOCK_TAKE_SESSIONS table policies
CREATE POLICY "Stock take users can read sessions"
    ON stock_take_sessions FOR SELECT
    TO authenticated
    USING (get_user_role(auth.uid()) = ANY (ARRAY['super_admin', 'admin', 'stock_take']));

CREATE POLICY "Stock take users can insert sessions"
    ON stock_take_sessions FOR INSERT
    TO authenticated
    WITH CHECK (get_user_role(auth.uid()) = ANY (ARRAY['super_admin', 'admin', 'stock_take']));

CREATE POLICY "Stock take users can update sessions"
    ON stock_take_sessions FOR UPDATE
    TO authenticated
    USING (get_user_role(auth.uid()) = ANY (ARRAY['super_admin', 'admin', 'stock_take']))
    WITH CHECK (get_user_role(auth.uid()) = ANY (ARRAY['super_admin', 'admin', 'stock_take']));

CREATE POLICY "Stock take users can delete sessions"
    ON stock_take_sessions FOR DELETE
    TO authenticated
    USING (get_user_role(auth.uid()) = ANY (ARRAY['super_admin', 'admin', 'stock_take']));

-- ACTIVITY_LOGS table policies
CREATE POLICY "All authenticated users can insert activity_logs"
    ON activity_logs FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Admins can read activity_logs"
    ON activity_logs FOR SELECT
    TO authenticated
    USING (get_user_role(auth.uid()) = ANY (ARRAY['super_admin', 'admin']));

-- Ensure RLS is enabled on all tables
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_takes ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_take_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;