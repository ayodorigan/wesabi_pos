/*
  # Create Authentication and Authorization System

  1. User Profiles Table
    - Links to auth.users
    - Stores role and profile information
    - Enables proper authorization

  2. Security Functions
    - Role checking function
    - Secure user creation trigger

  3. Row Level Security
    - Policies for user access control
    - Super admin override capabilities

  4. Triggers
    - Auto-create profile on user signup
    - First user becomes super admin
*/

-- Create user_profiles table
CREATE TABLE user_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  name text NOT NULL,
  phone text,
  role text NOT NULL DEFAULT 'sales' CHECK (role IN ('super_admin', 'admin', 'sales', 'inventory', 'stock_take')),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Create function to get user role
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

-- Create function to handle new user creation
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_count integer;
  user_role text := 'sales';
  user_name text := 'New User';
BEGIN
  -- Count existing users
  SELECT COUNT(*) INTO user_count FROM user_profiles;
  
  -- First user becomes super admin
  IF user_count = 0 THEN
    user_role := 'super_admin';
    user_name := 'Super Administrator';
  END IF;
  
  -- Extract name from user metadata if available
  IF NEW.raw_user_meta_data ? 'name' THEN
    user_name := NEW.raw_user_meta_data->>'name';
  ELSIF NEW.raw_user_meta_data ? 'full_name' THEN
    user_name := NEW.raw_user_meta_data->>'full_name';
  END IF;
  
  -- Create user profile
  INSERT INTO user_profiles (user_id, name, phone, role, is_active)
  VALUES (
    NEW.id,
    user_name,
    NEW.raw_user_meta_data->>'phone',
    user_role,
    true
  );
  
  RETURN NEW;
END;
$$;

-- Create trigger for new user creation
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Create RLS policies
CREATE POLICY "Users can read own profile"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile"
  ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Super admins can read all profiles"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (get_user_role(auth.uid()) = 'super_admin');

CREATE POLICY "Super admins can insert profiles"
  ON user_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (get_user_role(auth.uid()) = 'super_admin');

CREATE POLICY "Super admins can update all profiles"
  ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (get_user_role(auth.uid()) = 'super_admin');

CREATE POLICY "Super admins can delete profiles"
  ON user_profiles
  FOR DELETE
  TO authenticated
  USING (get_user_role(auth.uid()) = 'super_admin');

-- Update existing table policies to use the new role system
DROP POLICY IF EXISTS "All authenticated users can read products" ON products;
DROP POLICY IF EXISTS "Inventory and admin users can insert products" ON products;
DROP POLICY IF EXISTS "Inventory and admin users can update products" ON products;
DROP POLICY IF EXISTS "Only admins can delete products" ON products;

CREATE POLICY "All authenticated users can read products"
  ON products
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authorized users can insert products"
  ON products
  FOR INSERT
  TO authenticated
  WITH CHECK (get_user_role(auth.uid()) IN ('super_admin', 'admin', 'sales', 'inventory'));

CREATE POLICY "Authorized users can update products"
  ON products
  FOR UPDATE
  TO authenticated
  USING (get_user_role(auth.uid()) IN ('super_admin', 'admin', 'sales', 'inventory'));

CREATE POLICY "Only admins can delete products"
  ON products
  FOR DELETE
  TO authenticated
  USING (get_user_role(auth.uid()) IN ('super_admin', 'admin'));

-- Update sales policies
DROP POLICY IF EXISTS "Sales and admin users can insert sales" ON sales;
DROP POLICY IF EXISTS "Sales and admin users can read sales" ON sales;

CREATE POLICY "Authorized users can insert sales"
  ON sales
  FOR INSERT
  TO authenticated
  WITH CHECK (get_user_role(auth.uid()) IN ('super_admin', 'admin', 'sales'));

CREATE POLICY "Authorized users can read sales"
  ON sales
  FOR SELECT
  TO authenticated
  USING (get_user_role(auth.uid()) IN ('super_admin', 'admin', 'sales'));

-- Update sale_items policies
DROP POLICY IF EXISTS "Sales and admin users can insert sale_items" ON sale_items;
DROP POLICY IF EXISTS "Sales and admin users can read sale_items" ON sale_items;

CREATE POLICY "Authorized users can insert sale_items"
  ON sale_items
  FOR INSERT
  TO authenticated
  WITH CHECK (get_user_role(auth.uid()) IN ('super_admin', 'admin', 'sales'));

CREATE POLICY "Authorized users can read sale_items"
  ON sale_items
  FOR SELECT
  TO authenticated
  USING (get_user_role(auth.uid()) IN ('super_admin', 'admin', 'sales'));

-- Update stock take policies
DROP POLICY IF EXISTS "Stock take users can insert sessions" ON stock_take_sessions;
DROP POLICY IF EXISTS "Stock take users can read sessions" ON stock_take_sessions;
DROP POLICY IF EXISTS "Stock take users can update sessions" ON stock_take_sessions;
DROP POLICY IF EXISTS "Stock take users can delete sessions" ON stock_take_sessions;
DROP POLICY IF EXISTS "Users can create stock take sessions" ON stock_take_sessions;
DROP POLICY IF EXISTS "Users can read all stock take sessions" ON stock_take_sessions;
DROP POLICY IF EXISTS "Users can update stock take sessions" ON stock_take_sessions;
DROP POLICY IF EXISTS "Users can delete stock take sessions" ON stock_take_sessions;

CREATE POLICY "Authorized users can manage stock take sessions"
  ON stock_take_sessions
  FOR ALL
  TO authenticated
  USING (get_user_role(auth.uid()) IN ('super_admin', 'admin', 'stock_take'))
  WITH CHECK (get_user_role(auth.uid()) IN ('super_admin', 'admin', 'stock_take'));

-- Update stock takes policies
DROP POLICY IF EXISTS "Stock take users can insert stock_takes" ON stock_takes;
DROP POLICY IF EXISTS "Stock take users can read stock_takes" ON stock_takes;

CREATE POLICY "Authorized users can manage stock takes"
  ON stock_takes
  FOR ALL
  TO authenticated
  USING (get_user_role(auth.uid()) IN ('super_admin', 'admin', 'stock_take'))
  WITH CHECK (get_user_role(auth.uid()) IN ('super_admin', 'admin', 'stock_take'));

-- Update activity logs policies
DROP POLICY IF EXISTS "Admin users can read activity_logs" ON activity_logs;
DROP POLICY IF EXISTS "All authenticated users can insert activity_logs" ON activity_logs;

CREATE POLICY "Authorized users can read activity_logs"
  ON activity_logs
  FOR SELECT
  TO authenticated
  USING (get_user_role(auth.uid()) IN ('super_admin', 'admin'));

CREATE POLICY "All authenticated users can insert activity_logs"
  ON activity_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Update price history policies
DROP POLICY IF EXISTS "All authenticated users can insert price_history" ON price_history;
DROP POLICY IF EXISTS "All authenticated users can read price_history" ON price_history;

CREATE POLICY "All authenticated users can read price_history"
  ON price_history
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "All authenticated users can insert price_history"
  ON price_history
  FOR INSERT
  TO authenticated
  WITH CHECK (true);