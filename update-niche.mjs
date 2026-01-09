import pg from 'pg';

const client = new pg.Client('postgresql://postgres:Iwillgetrich11!@db.fmvhajzdipkqycsmrzjv.supabase.co:5432/postgres');

async function updateNiches() {
  await client.connect();
  console.log('Connected');

  // Get all jobs with their keywords
  const jobs = await client.query(`
    SELECT j.id, j.keyword
    FROM jobs j
    WHERE j.keyword IS NOT NULL
  `);
  console.log(`Found ${jobs.rows.length} jobs`);

  // For each job, update creators linked to it
  for (const job of jobs.rows) {
    const result = await client.query(`
      UPDATE creators c
      SET niche = $1
      FROM job_results jr
      WHERE jr.creator_id = c.id
        AND jr.job_id = $2
        AND (c.niche IS NULL OR c.niche = '')
    `, [job.keyword, job.id]);

    if (result.rowCount > 0) {
      console.log(`Updated ${result.rowCount} creators with niche "${job.keyword}"`);
    }
  }

  await client.end();
  console.log('Done');
}

updateNiches().catch(console.error);
