import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.join(process.cwd(), 'jobs.db');
const db = new Database(dbPath);

// Platform types
export type Platform = 'youtube' | 'instagram' | 'tiktok' | 'linkedin' | 'skool' | 'substack';

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

export default db;
