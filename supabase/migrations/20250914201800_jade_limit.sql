/*
  # Create Stock Take Sessions and Enhanced Stock Takes

  1. New Tables
    - `stock_take_sessions`
      - `id` (uuid, primary key)
      - `name` (text, session name)
      - `user_id` (uuid, foreign key to users)
      - `user_name` (text, user name)
      - `status` (text, active/completed)
      - `created_at` (timestamp)
      - `completed_at` (timestamp, nullable)
    
  2. Enhanced Tables
    - Update `stock_takes` table to include session reference
    - Add session_id foreign key to stock_takes

  3. Security
    - Enable RLS on new tables
    - Add policies for authenticated users
*/

-- Create stock_take_sessions table
CREATE TABLE IF NOT EXISTS stock_take_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  user_id uuid REFERENCES auth.users(id),
  user_name text NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed')),
  created_at timestamptz DEFAULT now(),
  completed_at timestamptz
);

-- Add session_id to stock_takes table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'stock_takes' AND column_name = 'session_id'
  ) THEN
    ALTER TABLE stock_takes ADD COLUMN session_id uuid REFERENCES stock_take_sessions(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Enable RLS
ALTER TABLE stock_take_sessions ENABLE ROW LEVEL SECURITY;

-- Create policies for stock_take_sessions
CREATE POLICY "Users can read all stock take sessions"
  ON stock_take_sessions
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create stock take sessions"
  ON stock_take_sessions
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update stock take sessions"
  ON stock_take_sessions
  FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Users can delete stock take sessions"
  ON stock_take_sessions
  FOR DELETE
  TO authenticated
  USING (true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_stock_take_sessions_user_id ON stock_take_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_stock_take_sessions_status ON stock_take_sessions(status);
CREATE INDEX IF NOT EXISTS idx_stock_take_sessions_created_at ON stock_take_sessions(created_at);
CREATE INDEX IF NOT EXISTS idx_stock_takes_session_id ON stock_takes(session_id);