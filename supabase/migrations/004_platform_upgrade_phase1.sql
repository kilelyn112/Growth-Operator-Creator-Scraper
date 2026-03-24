-- =============================================
-- Phase 1: Platform Upgrade
-- Offers table + User leads table + Jobs user_id
-- =============================================

-- Offers: AI-guided offer builder data per user
CREATE TABLE IF NOT EXISTS offers (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  status TEXT DEFAULT 'draft',  -- 'draft', 'complete', 'needs_revision'
  version INTEGER DEFAULT 1,

  -- Step 1: Who You Serve
  target_market TEXT,
  target_pain_points JSONB DEFAULT '[]',
  target_desires JSONB DEFAULT '[]',

  -- Step 2: What You Do
  service_category TEXT,
  service_description TEXT,
  delivery_method TEXT,

  -- Step 3: The Transformation
  before_state TEXT,
  after_state TEXT,
  timeframe TEXT,

  -- Step 4: Proof & Credibility
  case_studies JSONB DEFAULT '[]',
  credentials JSONB DEFAULT '[]',
  unique_mechanism TEXT,

  -- Step 5: The Offer Stack
  offer_name TEXT,
  price_point TEXT,
  offer_stack JSONB DEFAULT '[]',
  guarantee TEXT,

  -- AI Analysis
  offer_score INTEGER DEFAULT 0,
  ai_feedback JSONB,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS idx_offers_user_id ON offers(user_id);
ALTER TABLE offers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on offers" ON offers FOR ALL USING (true) WITH CHECK (true);

-- User leads: per-user lead tracking (links to global creators/funnels)
CREATE TABLE IF NOT EXISTS user_leads (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  creator_id BIGINT REFERENCES creators(id) ON DELETE SET NULL,
  funnel_id BIGINT REFERENCES funnels(id) ON DELETE SET NULL,

  status TEXT DEFAULT 'new',  -- 'new', 'contacted', 'replied', 'call_booked', 'closed', 'lost'
  notes TEXT,
  tags JSONB DEFAULT '[]',
  source TEXT DEFAULT 'search',  -- 'search', 'manual', 'import'

  added_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, creator_id),
  UNIQUE(user_id, funnel_id)
);

CREATE INDEX IF NOT EXISTS idx_user_leads_user_id ON user_leads(user_id);
CREATE INDEX IF NOT EXISTS idx_user_leads_status ON user_leads(status);
ALTER TABLE user_leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on user_leads" ON user_leads FOR ALL USING (true) WITH CHECK (true);

-- Add user_id to jobs for per-user tracking
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS user_id BIGINT REFERENCES users(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_jobs_user_id ON jobs(user_id);
