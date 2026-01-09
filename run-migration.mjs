import pg from 'pg';

const connectionString = 'postgresql://postgres:Iwillgetrich11!@db.fmvhajzdipkqycsmrzjv.supabase.co:5432/postgres';

const sql = `
-- Creators table
CREATE TABLE IF NOT EXISTS creators (
  id BIGSERIAL PRIMARY KEY,
  platform TEXT NOT NULL,
  platform_id TEXT NOT NULL,
  username TEXT,
  display_name TEXT NOT NULL,
  profile_url TEXT NOT NULL,
  followers INTEGER DEFAULT 0,
  following INTEGER DEFAULT 0,
  post_count INTEGER DEFAULT 0,
  total_views INTEGER DEFAULT 0,
  engagement_rate REAL DEFAULT 0,
  bio TEXT,
  external_url TEXT,
  qualified BOOLEAN DEFAULT false,
  qualification_reason TEXT,
  email TEXT,
  first_name TEXT,
  niche TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(platform, platform_id)
);

-- Funnels table
CREATE TABLE IF NOT EXISTS funnels (
  id BIGSERIAL PRIMARY KEY,
  funnel_url TEXT NOT NULL UNIQUE,
  domain TEXT,
  platform TEXT DEFAULT 'other',
  niche TEXT,
  quality_score INTEGER DEFAULT 0,
  issues JSONB,
  has_mobile_viewport BOOLEAN DEFAULT false,
  has_clear_cta BOOLEAN DEFAULT false,
  has_testimonials BOOLEAN DEFAULT false,
  has_trust_badges BOOLEAN DEFAULT false,
  page_load_time INTEGER,
  owner_name TEXT,
  owner_email TEXT,
  owner_phone TEXT,
  owner_instagram TEXT,
  owner_youtube TEXT,
  owner_x TEXT,
  owner_linkedin TEXT,
  owner_website TEXT,
  discovery_source TEXT DEFAULT 'google',
  search_query TEXT,
  page_title TEXT,
  page_description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Jobs table
CREATE TABLE IF NOT EXISTS jobs (
  id TEXT PRIMARY KEY,
  keyword TEXT NOT NULL,
  platform TEXT DEFAULT 'youtube',
  job_type TEXT DEFAULT 'creator',
  max_results INTEGER DEFAULT 50,
  status TEXT DEFAULT 'pending',
  progress INTEGER DEFAULT 0,
  total INTEGER DEFAULT 0,
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Job results linking table
CREATE TABLE IF NOT EXISTS job_results (
  id BIGSERIAL PRIMARY KEY,
  job_id TEXT REFERENCES jobs(id) ON DELETE CASCADE,
  creator_id BIGINT REFERENCES creators(id) ON DELETE CASCADE,
  funnel_id BIGINT REFERENCES funnels(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_creators_platform ON creators(platform);
CREATE INDEX IF NOT EXISTS idx_creators_niche ON creators(niche);
CREATE INDEX IF NOT EXISTS idx_creators_qualified ON creators(qualified);
CREATE INDEX IF NOT EXISTS idx_funnels_platform ON funnels(platform);
CREATE INDEX IF NOT EXISTS idx_funnels_niche ON funnels(niche);
CREATE INDEX IF NOT EXISTS idx_funnels_domain ON funnels(domain);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);

-- Enable RLS
ALTER TABLE creators ENABLE ROW LEVEL SECURITY;
ALTER TABLE funnels ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_results ENABLE ROW LEVEL SECURITY;

-- Allow all policies (for public access)
DROP POLICY IF EXISTS "Allow all" ON creators;
DROP POLICY IF EXISTS "Allow all" ON funnels;
DROP POLICY IF EXISTS "Allow all" ON jobs;
DROP POLICY IF EXISTS "Allow all" ON job_results;
CREATE POLICY "Allow all" ON creators FOR ALL USING (true);
CREATE POLICY "Allow all" ON funnels FOR ALL USING (true);
CREATE POLICY "Allow all" ON jobs FOR ALL USING (true);
CREATE POLICY "Allow all" ON job_results FOR ALL USING (true);
`;

async function runMigration() {
  const client = new pg.Client({ connectionString });

  try {
    console.log('Connecting to Supabase...');
    await client.connect();
    console.log('Connected! Running migration...');

    await client.query(sql);

    console.log('Migration completed successfully!');
    console.log('Tables created: creators, funnels, jobs, job_results');

    // Verify tables exist
    const result = await client.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name IN ('creators', 'funnels', 'jobs', 'job_results')
    `);

    console.log('Verified tables:', result.rows.map(r => r.table_name).join(', '));

  } catch (error) {
    console.error('Migration failed:', error.message);
  } finally {
    await client.end();
  }
}

runMigration();
