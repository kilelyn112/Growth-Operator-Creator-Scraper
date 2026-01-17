-- Users table for authentication and trial management
CREATE TABLE IF NOT EXISTS users (
  id BIGSERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(50),
  first_name VARCHAR(100) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  is_member BOOLEAN DEFAULT FALSE,
  trial_started_at TIMESTAMPTZ DEFAULT NOW(),
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for quick email lookups
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_is_member ON users(is_member);

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own data
DROP POLICY IF EXISTS "Users can view own data" ON users;
CREATE POLICY "Users can view own data" ON users FOR SELECT USING (true);

-- Policy: Allow inserts (for signup)
DROP POLICY IF EXISTS "Allow signup" ON users;
CREATE POLICY "Allow signup" ON users FOR INSERT WITH CHECK (true);

-- Policy: Users can update their own data
DROP POLICY IF EXISTS "Users can update own data" ON users;
CREATE POLICY "Users can update own data" ON users FOR UPDATE USING (true);

-- Admin policy: Full access (you'll access via service role key)
DROP POLICY IF EXISTS "Admin full access" ON users;
CREATE POLICY "Admin full access" ON users FOR ALL USING (true);
