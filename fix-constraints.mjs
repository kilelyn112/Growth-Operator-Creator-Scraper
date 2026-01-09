import pg from 'pg';

const client = new pg.Client('postgresql://postgres:Iwillgetrich11!@db.fmvhajzdipkqycsmrzjv.supabase.co:5432/postgres');

async function fix() {
  await client.connect();
  console.log('Connected');

  // Add unique constraint to job_results for creators
  try {
    await client.query(`
      ALTER TABLE job_results
      ADD CONSTRAINT job_results_job_creator_unique
      UNIQUE (job_id, creator_id);
    `);
    console.log('Creator constraint added');
  } catch(e) {
    console.log('Creator constraint:', e.message);
  }

  // Add unique constraint for funnel links
  try {
    await client.query(`
      ALTER TABLE job_results
      ADD CONSTRAINT job_results_job_funnel_unique
      UNIQUE (job_id, funnel_id);
    `);
    console.log('Funnel constraint added');
  } catch(e) {
    console.log('Funnel constraint:', e.message);
  }

  await client.end();
  console.log('Done');
}
fix();
