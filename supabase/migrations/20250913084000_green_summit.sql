/*
  # Disable RLS temporarily to fix policy violations

  1. Security Changes
    - Disable RLS on all tables temporarily
    - This allows the app to work without authentication
    - In production, you would want proper RLS policies with auth

  2. Tables affected
    - products
    - sales  
    - sale_items
    - stock_takes
    - activity_logs
    - user_profiles
*/

-- Disable RLS on all tables
ALTER TABLE products DISABLE ROW LEVEL SECURITY;
ALTER TABLE sales DISABLE ROW LEVEL SECURITY;
ALTER TABLE sale_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE stock_takes DISABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles DISABLE ROW LEVEL SECURITY;

-- Drop all existing policies to avoid conflicts
DROP POLICY IF EXISTS "Anyone can read products" ON products;
DROP POLICY IF EXISTS "Anyone can insert products" ON products;
DROP POLICY IF EXISTS "Anyone can update products" ON products;
DROP POLICY IF EXISTS "Anyone can delete products" ON products;

DROP POLICY IF EXISTS "Anyone can read sales" ON sales;
DROP POLICY IF EXISTS "Anyone can insert sales" ON sales;
DROP POLICY IF EXISTS "Anyone can update sales" ON sales;

DROP POLICY IF EXISTS "Anyone can read sale_items" ON sale_items;
DROP POLICY IF EXISTS "Anyone can insert sale_items" ON sale_items;
DROP POLICY IF EXISTS "Anyone can update sale_items" ON sale_items;

DROP POLICY IF EXISTS "Anyone can read stock_takes" ON stock_takes;
DROP POLICY IF EXISTS "Anyone can insert stock_takes" ON stock_takes;
DROP POLICY IF EXISTS "Anyone can update stock_takes" ON stock_takes;

DROP POLICY IF EXISTS "Anyone can read activity_logs" ON activity_logs;
DROP POLICY IF EXISTS "Anyone can insert activity_logs" ON activity_logs;
DROP POLICY IF EXISTS "Anyone can update activity_logs" ON activity_logs;

DROP POLICY IF EXISTS "Anyone can read user_profiles" ON user_profiles;
DROP POLICY IF EXISTS "Anyone can insert user_profiles" ON user_profiles;
DROP POLICY IF EXISTS "Anyone can update user_profiles" ON user_profiles;