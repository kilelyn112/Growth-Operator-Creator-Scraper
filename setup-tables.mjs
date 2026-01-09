import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://fmvhajzdipkqycsmrzjv.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZtdmhhanpkaXBrcXljc21yemp2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Nzc2MDgwMCwiZXhwIjoyMDgzMzM2ODAwfQ.FPZdhgHIhiGmxhzRSPRtsOEe9Jvdo2MrynJMjdMoh8I';

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false }
});

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
`;

async function setup() {
  // Use the SQL endpoint via Supabase's internal API
  const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: {
      'apikey': serviceRoleKey,
      'Authorization': `Bearer ${serviceRoleKey}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal'
    },
    body: JSON.stringify({ query: sql })
  });
  
  if (response.ok) {
    console.log('Tables created successfully!');
  } else {
    // RPC doesn't exist, try different approach - test if tables exist
    console.log('RPC not available, checking if we can access tables...');
    
    const { data, error } = await supabase.from('creators').select('id').limit(1);
    if (error) {
      if (error.code === '42P01') {
        console.log('Tables do not exist yet.');
        console.log('Please run the SQL manually in Supabase dashboard.');
        console.log('Go to: SQL Editor -> New Query -> Paste the SQL');
      } else {
        console.log('Connection works! Error:', error.message);
      }
    } else {
      console.log('Tables already exist!');
    }
  }
}

setup().catch(console.error);
