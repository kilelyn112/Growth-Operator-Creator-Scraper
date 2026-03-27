-- =============================================
-- Phase 2: Campaign-Powered Discovery Engine
-- =============================================

-- Campaigns: multi-niche search campaigns driven by offer
CREATE TABLE IF NOT EXISTS campaigns (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  name TEXT NOT NULL,
  status TEXT DEFAULT 'draft',  -- 'draft', 'running', 'paused', 'completed'

  -- Offer context
  offer_description TEXT,
  target_market TEXT,

  -- Search config
  platform TEXT DEFAULT 'youtube',
  max_results_per_niche INTEGER DEFAULT 30,
  selected_niches JSONB DEFAULT '[]',   -- [{id, name, searchKeyword}]

  -- Progress tracking
  total_niches INTEGER DEFAULT 0,
  completed_niches INTEGER DEFAULT 0,
  total_creators_found INTEGER DEFAULT 0,
  qualified_creators INTEGER DEFAULT 0,
  creators_with_email INTEGER DEFAULT 0,

  -- Job tracking
  active_jobs JSONB DEFAULT '[]',  -- [{niche_id, job_id, status}]

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_campaigns_user_id ON campaigns(user_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON campaigns(status);
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on campaigns" ON campaigns FOR ALL USING (true) WITH CHECK (true);

-- Campaign results: links campaigns to discovered creators (deduplicated)
CREATE TABLE IF NOT EXISTS campaign_results (
  id BIGSERIAL PRIMARY KEY,
  campaign_id BIGINT NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  creator_id BIGINT NOT NULL REFERENCES creators(id) ON DELETE CASCADE,
  niche_id TEXT,
  niche_name TEXT,
  added_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(campaign_id, creator_id)
);

CREATE INDEX IF NOT EXISTS idx_campaign_results_campaign ON campaign_results(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_results_creator ON campaign_results(creator_id);
ALTER TABLE campaign_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on campaign_results" ON campaign_results FOR ALL USING (true) WITH CHECK (true);
