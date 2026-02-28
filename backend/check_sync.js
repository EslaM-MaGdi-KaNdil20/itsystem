const { Pool } = require('pg');
const pool = new Pool({host:'localhost',user:'postgres',password:'Sobek@W2026',database:'itsupport_db'});

async function main() {
  try {
    const res = await pool.query('SELECT id, total_found, new_added, updated, errors, details FROM hosting_sync_logs ORDER BY id DESC LIMIT 1');
    if (res.rows.length === 0) {
      console.log('No sync logs found');
    } else {
      const row = res.rows[0];
      console.log('=== Latest Sync Log ===');
      console.log('ID:', row.id);
      console.log('Found:', row.total_found);
      console.log('New:', row.new_added);
      console.log('Updated:', row.updated);
      console.log('Errors:', row.errors);
      if (row.details) {
        const d = typeof row.details === 'string' ? JSON.parse(row.details) : row.details;
        if (d.errors && d.errors.length > 0) {
          console.log('\n=== Error Details (first 10) ===');
          d.errors.slice(0, 10).forEach((e, i) => console.log(`Error ${i+1}:`, JSON.stringify(e)));
        }
        if (d.synced) {
          console.log('\n=== Synced ===');
          d.synced.forEach((s, i) => console.log(`Synced ${i+1}:`, JSON.stringify(s)));
        }
      }
    }
  } catch(e) {
    console.error('Error:', e.message);
  }
  await pool.end();
}
main();
