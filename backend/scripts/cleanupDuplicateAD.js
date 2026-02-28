const pool = require('../config/database');

(async () => {
  try {
    // Find all duplicate sam_account_names
    const dups = await pool.query(`
      SELECT sam_account_name, 
             MIN(id) as old_id, 
             MAX(id) as new_id
      FROM ad_users 
      GROUP BY sam_account_name 
      HAVING COUNT(*) > 1
    `);
    console.log('Found', dups.rows.length, 'duplicate pairs');

    let deleted = 0;
    for (const dup of dups.rows) {
      // Get both records
      const oldRec = (await pool.query('SELECT local_employee_id, is_synced_employee, is_synced_user FROM ad_users WHERE id=$1', [dup.old_id])).rows[0];
      const newRec = (await pool.query('SELECT local_employee_id, is_synced_employee, is_synced_user FROM ad_users WHERE id=$1', [dup.new_id])).rows[0];

      // Transfer links from old to new if needed
      if (oldRec.local_employee_id && !newRec.local_employee_id) {
        await pool.query('UPDATE ad_users SET local_employee_id=$1, is_synced_employee=true WHERE id=$2',
          [oldRec.local_employee_id, dup.new_id]);
      }
      if (oldRec.is_synced_user && !newRec.is_synced_user) {
        await pool.query('UPDATE ad_users SET is_synced_user=true WHERE id=$1', [dup.new_id]);
      }

      // Delete the old duplicate
      await pool.query('DELETE FROM ad_users WHERE id=$1', [dup.old_id]);
      deleted++;
    }

    const remaining = await pool.query('SELECT COUNT(*)::int as t FROM ad_users');
    console.log('Deleted', deleted, 'duplicates. Remaining:', remaining.rows[0].t, 'ad_users');
    
    // Add unique constraint on sam_account_name to prevent future duplicates
    try {
      await pool.query('CREATE UNIQUE INDEX IF NOT EXISTS idx_ad_users_sam_unique ON ad_users(sam_account_name)');
      console.log('Added unique index on sam_account_name');
    } catch (e) {
      console.log('Unique index already exists or error:', e.message);
    }

    await pool.end();
  } catch (e) {
    console.error('Error:', e.message);
    await pool.end();
    process.exit(1);
  }
})();
