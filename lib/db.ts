import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.join(process.cwd(), 'jobs.db');
const db = new Database(dbPath);

// Platform types
export type Platform = 'youtube' | 'instagram' | 'x' | 'tiktok' | 'linkedin' | 'skool' | 'substack';
export type FunnelPlatform = 'clickfunnels' | 'gohighlevel' | 'other';

// Initialize tables with multi-platform support
db.exec(`
  CREATE TABLE IF NOT EXISTS jobs (
    id TEXT PRIMARY KEY,
    keyword TEXT NOT NULL,
    platform TEXT DEFAULT 'youtube',
    max_results INTEGER,
    status TEXT DEFAULT 'pending',
    progress INTEGER DEFAULT 0,
    total INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    error TEXT
  );

  CREATE TABLE IF NOT EXISTS creators (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    job_id TEXT NOT NULL,
    platform TEXT DEFAULT 'youtube',
    platform_id TEXT NOT NULL,
    username TEXT,
    display_name TEXT,
    profile_url TEXT,
    followers INTEGER DEFAULT 0,
    following INTEGER DEFAULT 0,
    post_count INTEGER DEFAULT 0,
    total_views INTEGER DEFAULT 0,
    engagement_rate REAL DEFAULT 0,
    bio TEXT,
    external_url TEXT,
    qualified BOOLEAN,
    qualification_reason TEXT,
    email TEXT,
    first_name TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (job_id) REFERENCES jobs(id)
  );

  CREATE INDEX IF NOT EXISTS idx_creators_job_id ON creators(job_id);
  CREATE INDEX IF NOT EXISTS idx_creators_platform ON creators(platform);

  CREATE TABLE IF NOT EXISTS funnels (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    job_id TEXT NOT NULL,
    funnel_url TEXT NOT NULL,
    domain TEXT,
    platform TEXT DEFAULT 'other',
    niche TEXT,

    -- Quality Analysis
    quality_score INTEGER DEFAULT 0,
    issues TEXT,
    has_mobile_viewport BOOLEAN DEFAULT 0,
    has_clear_cta BOOLEAN DEFAULT 0,
    has_testimonials BOOLEAN DEFAULT 0,
    has_trust_badges BOOLEAN DEFAULT 0,
    page_load_time INTEGER,

    -- Owner Info
    owner_name TEXT,
    owner_email TEXT,
    owner_phone TEXT,
    owner_instagram TEXT,
    owner_youtube TEXT,
    owner_x TEXT,
    owner_linkedin TEXT,
    owner_website TEXT,

    -- Source Info
    discovery_source TEXT DEFAULT 'google',
    search_query TEXT,

    -- Metadata
    page_title TEXT,
    page_description TEXT,

    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (job_id) REFERENCES jobs(id)
  );

  CREATE INDEX IF NOT EXISTS idx_funnels_job_id ON funnels(job_id);
  CREATE INDEX IF NOT EXISTS idx_funnels_platform ON funnels(platform);
  CREATE INDEX IF NOT EXISTS idx_funnels_domain ON funnels(domain);
`);

// Migration: Add platform column to existing tables if they don't have it
try {
  db.exec(`ALTER TABLE jobs ADD COLUMN platform TEXT DEFAULT 'youtube'`);
} catch { /* Column already exists */ }

try {
  db.exec(`ALTER TABLE creators ADD COLUMN platform TEXT DEFAULT 'youtube'`);
} catch { /* Column already exists */ }

try {
  db.exec(`ALTER TABLE creators ADD COLUMN platform_id TEXT`);
  db.exec(`UPDATE creators SET platform_id = channel_id WHERE platform_id IS NULL`);
} catch { /* Column already exists */ }

try {
  db.exec(`ALTER TABLE creators ADD COLUMN username TEXT`);
} catch { /* Column already exists */ }

try {
  db.exec(`ALTER TABLE creators ADD COLUMN display_name TEXT`);
  db.exec(`UPDATE creators SET display_name = channel_name WHERE display_name IS NULL`);
} catch { /* Column already exists */ }

try {
  db.exec(`ALTER TABLE creators ADD COLUMN profile_url TEXT`);
  db.exec(`UPDATE creators SET profile_url = channel_url WHERE profile_url IS NULL`);
} catch { /* Column already exists */ }

try {
  db.exec(`ALTER TABLE creators ADD COLUMN followers INTEGER DEFAULT 0`);
  db.exec(`UPDATE creators SET followers = subscribers WHERE followers = 0 OR followers IS NULL`);
} catch { /* Column already exists */ }

try {
  db.exec(`ALTER TABLE creators ADD COLUMN following INTEGER DEFAULT 0`);
} catch { /* Column already exists */ }

try {
  db.exec(`ALTER TABLE creators ADD COLUMN post_count INTEGER DEFAULT 0`);
  db.exec(`UPDATE creators SET post_count = video_count WHERE post_count = 0 OR post_count IS NULL`);
} catch { /* Column already exists */ }

try {
  db.exec(`ALTER TABLE creators ADD COLUMN engagement_rate REAL DEFAULT 0`);
} catch { /* Column already exists */ }

try {
  db.exec(`ALTER TABLE creators ADD COLUMN bio TEXT`);
} catch { /* Column already exists */ }

try {
  db.exec(`ALTER TABLE creators ADD COLUMN external_url TEXT`);
} catch { /* Column already exists */ }

export interface Job {
  id: string;
  keyword: string;
  platform: Platform;
  max_results: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  total: number;
  created_at: string;
  error?: string;
}

export interface Creator {
  id: number;
  job_id: string;
  platform: Platform;
  platform_id: string;
  username: string | null;
  display_name: string;
  profile_url: string;
  followers: number;
  following: number;
  post_count: number;
  total_views: number;
  engagement_rate: number;
  bio: string | null;
  external_url: string | null;
  qualified: boolean;
  qualification_reason: string;
  email: string | null;
  first_name: string | null;
  created_at: string;
  // Legacy fields for backward compatibility
  channel_id?: string;
  channel_name?: string;
  channel_url?: string;
  subscribers?: number;
  video_count?: number;
}

// Job operations
export function createJob(id: string, keyword: string, maxResults: number, platform: Platform = 'youtube'): Job {
  const stmt = db.prepare(`
    INSERT INTO jobs (id, keyword, platform, max_results, status)
    VALUES (?, ?, ?, ?, 'pending')
  `);
  stmt.run(id, keyword, platform, maxResults);
  return getJob(id)!;
}

export function getJob(id: string): Job | null {
  const stmt = db.prepare('SELECT * FROM jobs WHERE id = ?');
  return stmt.get(id) as Job | null;
}

export function updateJobStatus(
  id: string,
  status: Job['status'],
  progress?: number,
  total?: number,
  error?: string
): void {
  let sql = 'UPDATE jobs SET status = ?';
  const params: (string | number)[] = [status];

  if (progress !== undefined) {
    sql += ', progress = ?';
    params.push(progress);
  }
  if (total !== undefined) {
    sql += ', total = ?';
    params.push(total);
  }
  if (error !== undefined) {
    sql += ', error = ?';
    params.push(error);
  }

  sql += ' WHERE id = ?';
  params.push(id);

  const stmt = db.prepare(sql);
  stmt.run(...params);
}

// Creator operations
export interface AddCreatorInput {
  job_id: string;
  platform: Platform;
  platform_id: string;
  username?: string | null;
  display_name: string;
  profile_url: string;
  followers: number;
  following?: number;
  post_count: number;
  total_views?: number;
  engagement_rate?: number;
  bio?: string | null;
  external_url?: string | null;
  qualified: boolean;
  qualification_reason: string;
  email?: string | null;
  first_name?: string | null;
}

export function addCreator(creator: AddCreatorInput): Creator {
  const stmt = db.prepare(`
    INSERT INTO creators (
      job_id, platform, platform_id, username, display_name, profile_url,
      followers, following, post_count, total_views, engagement_rate,
      bio, external_url, qualified, qualification_reason, email, first_name
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const result = stmt.run(
    creator.job_id,
    creator.platform,
    creator.platform_id,
    creator.username || null,
    creator.display_name,
    creator.profile_url,
    creator.followers,
    creator.following || 0,
    creator.post_count,
    creator.total_views || 0,
    creator.engagement_rate || 0,
    creator.bio || null,
    creator.external_url || null,
    creator.qualified ? 1 : 0,
    creator.qualification_reason,
    creator.email || null,
    creator.first_name || null
  );

  return getCreatorById(result.lastInsertRowid as number)!;
}

export function getCreatorById(id: number): Creator | null {
  const stmt = db.prepare('SELECT * FROM creators WHERE id = ?');
  const row = stmt.get(id) as (Omit<Creator, 'qualified'> & { qualified: number }) | null;
  if (!row) return null;
  return { ...row, qualified: Boolean(row.qualified) };
}

export function getCreatorsByJobId(jobId: string): Creator[] {
  const stmt = db.prepare('SELECT * FROM creators WHERE job_id = ? ORDER BY qualified DESC, followers DESC');
  const rows = stmt.all(jobId) as (Omit<Creator, 'qualified'> & { qualified: number })[];
  return rows.map(row => ({ ...row, qualified: Boolean(row.qualified) }));
}

export function getQualifiedCreatorsByJobId(jobId: string): Creator[] {
  const stmt = db.prepare('SELECT * FROM creators WHERE job_id = ? AND qualified = 1 ORDER BY followers DESC');
  const rows = stmt.all(jobId) as (Omit<Creator, 'qualified'> & { qualified: number })[];
  return rows.map(row => ({ ...row, qualified: Boolean(row.qualified) }));
}

// Get existing platform IDs and usernames for a job (for deduplication)
export function getExistingIdentifiers(jobId: string): Set<string> {
  const stmt = db.prepare('SELECT platform_id, username FROM creators WHERE job_id = ?');
  const rows = stmt.all(jobId) as { platform_id: string; username: string | null }[];
  const identifiers = new Set<string>();
  for (const row of rows) {
    if (row.platform_id) identifiers.add(row.platform_id.toLowerCase());
    if (row.username) identifiers.add(row.username.toLowerCase());
  }
  return identifiers;
}

// ============ FUNNEL OPERATIONS ============

export interface Funnel {
  id: number;
  job_id: string;
  funnel_url: string;
  domain: string | null;
  platform: FunnelPlatform;
  niche: string | null;

  // Quality Analysis
  quality_score: number;
  issues: string | null; // JSON array
  has_mobile_viewport: boolean;
  has_clear_cta: boolean;
  has_testimonials: boolean;
  has_trust_badges: boolean;
  page_load_time: number | null;

  // Owner Info
  owner_name: string | null;
  owner_email: string | null;
  owner_phone: string | null;
  owner_instagram: string | null;
  owner_youtube: string | null;
  owner_x: string | null;
  owner_linkedin: string | null;
  owner_website: string | null;

  // Source Info
  discovery_source: string;
  search_query: string | null;

  // Metadata
  page_title: string | null;
  page_description: string | null;

  created_at: string;
}

export interface AddFunnelInput {
  job_id: string;
  funnel_url: string;
  domain?: string | null;
  platform: FunnelPlatform;
  niche?: string | null;

  quality_score?: number;
  issues?: string[] | null;
  has_mobile_viewport?: boolean;
  has_clear_cta?: boolean;
  has_testimonials?: boolean;
  has_trust_badges?: boolean;
  page_load_time?: number | null;

  owner_name?: string | null;
  owner_email?: string | null;
  owner_phone?: string | null;
  owner_instagram?: string | null;
  owner_youtube?: string | null;
  owner_x?: string | null;
  owner_linkedin?: string | null;
  owner_website?: string | null;

  discovery_source?: string;
  search_query?: string | null;

  page_title?: string | null;
  page_description?: string | null;
}

export function addFunnel(funnel: AddFunnelInput): Funnel {
  const stmt = db.prepare(`
    INSERT INTO funnels (
      job_id, funnel_url, domain, platform, niche,
      quality_score, issues, has_mobile_viewport, has_clear_cta,
      has_testimonials, has_trust_badges, page_load_time,
      owner_name, owner_email, owner_phone, owner_instagram,
      owner_youtube, owner_x, owner_linkedin, owner_website,
      discovery_source, search_query, page_title, page_description
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const result = stmt.run(
    funnel.job_id,
    funnel.funnel_url,
    funnel.domain || null,
    funnel.platform,
    funnel.niche || null,
    funnel.quality_score || 0,
    funnel.issues ? JSON.stringify(funnel.issues) : null,
    funnel.has_mobile_viewport ? 1 : 0,
    funnel.has_clear_cta ? 1 : 0,
    funnel.has_testimonials ? 1 : 0,
    funnel.has_trust_badges ? 1 : 0,
    funnel.page_load_time || null,
    funnel.owner_name || null,
    funnel.owner_email || null,
    funnel.owner_phone || null,
    funnel.owner_instagram || null,
    funnel.owner_youtube || null,
    funnel.owner_x || null,
    funnel.owner_linkedin || null,
    funnel.owner_website || null,
    funnel.discovery_source || 'google',
    funnel.search_query || null,
    funnel.page_title || null,
    funnel.page_description || null
  );

  return getFunnelById(result.lastInsertRowid as number)!;
}

export function getFunnelById(id: number): Funnel | null {
  const stmt = db.prepare('SELECT * FROM funnels WHERE id = ?');
  const row = stmt.get(id) as Record<string, unknown> | null;
  if (!row) return null;
  return normalizeFunnelRow(row);
}

export function getFunnelsByJobId(jobId: string): Funnel[] {
  const stmt = db.prepare('SELECT * FROM funnels WHERE job_id = ? ORDER BY quality_score DESC, created_at DESC');
  const rows = stmt.all(jobId) as Record<string, unknown>[];
  return rows.map(normalizeFunnelRow);
}

export function getFunnelsWithEmailByJobId(jobId: string): Funnel[] {
  const stmt = db.prepare('SELECT * FROM funnels WHERE job_id = ? AND owner_email IS NOT NULL ORDER BY quality_score DESC');
  const rows = stmt.all(jobId) as Record<string, unknown>[];
  return rows.map(normalizeFunnelRow);
}

export function getExistingFunnelDomains(jobId: string): Set<string> {
  const stmt = db.prepare('SELECT domain FROM funnels WHERE job_id = ? AND domain IS NOT NULL');
  const rows = stmt.all(jobId) as { domain: string }[];
  return new Set(rows.map(r => r.domain.toLowerCase()));
}

function normalizeFunnelRow(row: Record<string, unknown>): Funnel {
  return {
    id: row.id as number,
    job_id: row.job_id as string,
    funnel_url: row.funnel_url as string,
    domain: row.domain as string | null,
    platform: row.platform as FunnelPlatform,
    niche: row.niche as string | null,
    quality_score: row.quality_score as number,
    issues: row.issues as string | null,
    has_mobile_viewport: Boolean(row.has_mobile_viewport),
    has_clear_cta: Boolean(row.has_clear_cta),
    has_testimonials: Boolean(row.has_testimonials),
    has_trust_badges: Boolean(row.has_trust_badges),
    page_load_time: row.page_load_time as number | null,
    owner_name: row.owner_name as string | null,
    owner_email: row.owner_email as string | null,
    owner_phone: row.owner_phone as string | null,
    owner_instagram: row.owner_instagram as string | null,
    owner_youtube: row.owner_youtube as string | null,
    owner_x: row.owner_x as string | null,
    owner_linkedin: row.owner_linkedin as string | null,
    owner_website: row.owner_website as string | null,
    discovery_source: row.discovery_source as string,
    search_query: row.search_query as string | null,
    page_title: row.page_title as string | null,
    page_description: row.page_description as string | null,
    created_at: row.created_at as string,
  };
}

export default db;
