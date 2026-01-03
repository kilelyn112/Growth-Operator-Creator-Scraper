import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.join(process.cwd(), 'jobs.db');
const db = new Database(dbPath);

// Initialize tables
db.exec(`
  CREATE TABLE IF NOT EXISTS jobs (
    id TEXT PRIMARY KEY,
    keyword TEXT NOT NULL,
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
    channel_id TEXT NOT NULL,
    channel_name TEXT,
    channel_url TEXT,
    subscribers INTEGER,
    video_count INTEGER,
    total_views INTEGER,
    qualified BOOLEAN,
    qualification_reason TEXT,
    email TEXT,
    first_name TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (job_id) REFERENCES jobs(id)
  );

  CREATE INDEX IF NOT EXISTS idx_creators_job_id ON creators(job_id);
`);

export interface Job {
  id: string;
  keyword: string;
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
  channel_id: string;
  channel_name: string;
  channel_url: string;
  subscribers: number;
  video_count: number;
  total_views: number;
  qualified: boolean;
  qualification_reason: string;
  email: string | null;
  first_name: string | null;
  created_at: string;
}

// Job operations
export function createJob(id: string, keyword: string, maxResults: number): Job {
  const stmt = db.prepare(`
    INSERT INTO jobs (id, keyword, max_results, status)
    VALUES (?, ?, ?, 'pending')
  `);
  stmt.run(id, keyword, maxResults);
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
export function addCreator(creator: Omit<Creator, 'id' | 'created_at'>): Creator {
  const stmt = db.prepare(`
    INSERT INTO creators (
      job_id, channel_id, channel_name, channel_url, subscribers,
      video_count, total_views, qualified, qualification_reason, email, first_name
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const result = stmt.run(
    creator.job_id,
    creator.channel_id,
    creator.channel_name,
    creator.channel_url,
    creator.subscribers,
    creator.video_count,
    creator.total_views,
    creator.qualified ? 1 : 0,
    creator.qualification_reason,
    creator.email,
    creator.first_name
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
  const stmt = db.prepare('SELECT * FROM creators WHERE job_id = ? ORDER BY qualified DESC, subscribers DESC');
  const rows = stmt.all(jobId) as (Omit<Creator, 'qualified'> & { qualified: number })[];
  return rows.map(row => ({ ...row, qualified: Boolean(row.qualified) }));
}

export function getQualifiedCreatorsByJobId(jobId: string): Creator[] {
  const stmt = db.prepare('SELECT * FROM creators WHERE job_id = ? AND qualified = 1 ORDER BY subscribers DESC');
  const rows = stmt.all(jobId) as (Omit<Creator, 'qualified'> & { qualified: number })[];
  return rows.map(row => ({ ...row, qualified: Boolean(row.qualified) }));
}

export default db;
