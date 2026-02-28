const pool = require('../config/database');
const ZKLib = require('node-zklib');

// ─── Helper: create ZK connection ───
async function connectZK(ip, port = 4370) {
  const zk = new ZKLib(ip, port, 10000, 4000);
  await zk.createSocket();
  return zk;
}

// ─── Get all ZK devices ───
const getDevices = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM zk_devices ORDER BY id');
    res.json(result.rows);
  } catch (error) {
    console.error('ZK getDevices error:', error);
    res.status(500).json({ error: 'خطأ في جلب الأجهزة' });
  }
};

// ─── Add a new ZK device ───
const addDevice = async (req, res) => {
  try {
    const { name, ip_address, port } = req.body;
    if (!name || !ip_address) return res.status(400).json({ error: 'الاسم و IP مطلوبان' });

    const result = await pool.query(
      'INSERT INTO zk_devices (name, ip_address, port) VALUES ($1, $2, $3) RETURNING *',
      [name, ip_address, port || 4370]
    );
    res.json({ success: true, device: result.rows[0] });
  } catch (error) {
    console.error('ZK addDevice error:', error);
    res.status(500).json({ error: 'خطأ في إضافة الجهاز' });
  }
};

// ─── Update ZK device ───
const updateDevice = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, ip_address, port, is_active } = req.body;
    const result = await pool.query(
      'UPDATE zk_devices SET name=$1, ip_address=$2, port=$3, is_active=$4 WHERE id=$5 RETURNING *',
      [name, ip_address, port || 4370, is_active, id]
    );
    res.json({ success: true, device: result.rows[0] });
  } catch (error) {
    console.error('ZK updateDevice error:', error);
    res.status(500).json({ error: 'خطأ في تحديث الجهاز' });
  }
};

// ─── Delete ZK device ───
const deleteDevice = async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM attendance_records WHERE device_id = $1', [id]);
    await pool.query('DELETE FROM zk_employee_map WHERE device_id = $1', [id]);
    await pool.query('DELETE FROM zk_devices WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (error) {
    console.error('ZK deleteDevice error:', error);
    res.status(500).json({ error: 'خطأ في حذف الجهاز' });
  }
};

// ─── Test connection to a ZK device ───
const testConnection = async (req, res) => {
  let zk;
  try {
    const { ip_address, port } = req.body;
    if (!ip_address) return res.status(400).json({ error: 'IP مطلوب' });

    zk = await connectZK(ip_address, port || 4370);
    const info = await zk.getInfo();
    await zk.disconnect();

    res.json({
      success: true,
      message: 'تم الاتصال بنجاح',
      info: {
        userCount: info?.userCounts || 0,
        logCount: info?.logCounts || 0,
        firmwareVersion: info?.firmwareVersion || '',
      }
    });
  } catch (error) {
    if (zk) try { await zk.disconnect(); } catch (e) {}
    console.error('ZK test error:', error.message);
    res.status(500).json({ error: 'فشل الاتصال: ' + error.message });
  }
};

// ─── Sync users from ZK device ───
const syncUsers = async (req, res) => {
  let zk;
  try {
    const { device_id } = req.params;
    const device = (await pool.query('SELECT * FROM zk_devices WHERE id = $1', [device_id])).rows[0];
    if (!device) return res.status(404).json({ error: 'الجهاز غير موجود' });

    zk = await connectZK(device.ip_address, device.port);
    const users = await zk.getUsers();
    await zk.disconnect();

    // Debug: log first 3 users to see raw data structure
    const rawUsers = users.data || [];
    if (rawUsers.length > 0) {
      console.log('ZK raw user sample:', JSON.stringify(rawUsers.slice(0, 3), null, 2));
    }

    let synced = 0, updated = 0;
    for (const u of rawUsers) {
      // userId = the actual enrollment ID on the device (what user sees)
      // uid = internal database index (not visible to user)
      const zkUserId = String(u.userId ?? u.uid);
      const zkUserName = u.name || '';

      // Try to auto-match with employee
      let employeeId = null;
      // 1) Match by employee_code = zkUserId (already linked)
      const empByCode = await pool.query('SELECT id FROM employees WHERE employee_code = $1', [zkUserId]);
      if (empByCode.rows.length > 0) {
        employeeId = empByCode.rows[0].id;
      } else if (zkUserName && zkUserName.trim().length > 1) {
        // 2) Match by name (only if name is not empty)
        const empByName = await pool.query('SELECT id FROM employees WHERE full_name ILIKE $1 AND full_name IS NOT NULL AND full_name != $$$$', [zkUserName.trim()]);
        if (empByName.rows.length === 1) {
          employeeId = empByName.rows[0].id;
          // Auto-update employee_code to ZK ID for future matching
          await pool.query('UPDATE employees SET employee_code = $1 WHERE id = $2', [zkUserId, employeeId]);
        }
      }

      const existing = await pool.query(
        'SELECT id FROM zk_employee_map WHERE zk_user_id = $1 AND device_id = $2',
        [zkUserId, device_id]
      );

      if (existing.rows.length > 0) {
        await pool.query(
          'UPDATE zk_employee_map SET zk_user_name = $1, employee_id = COALESCE(employee_id, $2) WHERE id = $3',
          [zkUserName, employeeId, existing.rows[0].id]
        );
        updated++;
      } else {
        await pool.query(
          'INSERT INTO zk_employee_map (zk_user_id, zk_user_name, employee_id, device_id, is_mapped) VALUES ($1, $2, $3, $4, $5)',
          [zkUserId, zkUserName, employeeId, device_id, !!employeeId]
        );
        synced++;
      }
    }

    await pool.query(
      'UPDATE zk_devices SET last_sync_at = NOW(), last_sync_status = $1, total_users = $2 WHERE id = $3',
      ['success', (users.data || []).length, device_id]
    );

    res.json({
      success: true,
      message: `تم سحب ${(users.data || []).length} مستخدم (${synced} جديد، ${updated} محدث)`,
      totalUsers: (users.data || []).length,
      synced, updated
    });
  } catch (error) {
    if (zk) try { await zk.disconnect(); } catch (e) {}
    console.error('ZK syncUsers error:', error);
    res.status(500).json({ error: 'خطأ في سحب المستخدمين: ' + error.message });
  }
};

// ─── Get ZK/Employee mappings ───
const getMappings = async (req, res) => {
  try {
    const { device_id } = req.params;
    const result = await pool.query(`
      SELECT m.*, e.full_name as employee_name, e.employee_code, e.department_id,
             d.name as department_name
      FROM zk_employee_map m
      LEFT JOIN employees e ON e.id = m.employee_id
      LEFT JOIN departments d ON d.id = e.department_id
      WHERE m.device_id = $1
      ORDER BY m.zk_user_id::int
    `, [device_id]);
    res.json(result.rows);
  } catch (error) {
    console.error('ZK getMappings error:', error);
    res.status(500).json({ error: 'خطأ في جلب الربط' });
  }
};

// ─── Map a ZK user to an employee ───
const mapUser = async (req, res) => {
  try {
    const { mapping_id } = req.params;
    const { employee_id } = req.body;

    await pool.query(
      'UPDATE zk_employee_map SET employee_id = $1, is_mapped = true WHERE id = $2',
      [employee_id, mapping_id]
    );

    // Get the ZK user ID from the mapping
    const map = (await pool.query('SELECT zk_user_id FROM zk_employee_map WHERE id = $1', [mapping_id])).rows[0];
    if (map) {
      // Update attendance records
      await pool.query(
        'UPDATE attendance_records SET employee_id = $1 WHERE zk_user_id = $2 AND employee_id IS NULL',
        [employee_id, map.zk_user_id]
      );
      // Update employee_code to ZK user ID for linking
      await pool.query(
        'UPDATE employees SET employee_code = $1 WHERE id = $2',
        [map.zk_user_id, employee_id]
      );
    }

    res.json({ success: true, message: 'تم ربط المستخدم بالموظف وتحديث كود الموظف' });
  } catch (error) {
    console.error('ZK mapUser error:', error);
    res.status(500).json({ error: 'خطأ في الربط' });
  }
};

// ─── Bulk sync: update all mapped employees' codes to their ZK IDs ───
const bulkSyncCodes = async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT m.zk_user_id, m.employee_id, e.employee_code, e.full_name FROM zk_employee_map m JOIN employees e ON e.id = m.employee_id WHERE m.is_mapped = true'
    );

    let updated = 0, skipped = 0;
    for (const row of result.rows) {
      if (row.employee_code === row.zk_user_id) {
        skipped++;
        continue;
      }
      // Check no other employee already has this code
      const conflict = await pool.query(
        'SELECT id FROM employees WHERE employee_code = $1 AND id != $2',
        [row.zk_user_id, row.employee_id]
      );
      if (conflict.rows.length === 0) {
        await pool.query(
          'UPDATE employees SET employee_code = $1 WHERE id = $2',
          [row.zk_user_id, row.employee_id]
        );
        updated++;
      } else {
        skipped++;
      }
    }

    res.json({
      success: true,
      message: `تم تحديث ${updated} كود موظف (${skipped} بدون تغيير)`,
      updated, skipped
    });
  } catch (error) {
    console.error('ZK bulkSyncCodes error:', error);
    res.status(500).json({ error: 'خطأ في تحديث الأكواد' });
  }
};

// ─── Sync attendance logs from ZK device ───
const syncAttendance = async (req, res) => {
  let zk;
  try {
    const { device_id } = req.params;
    const device = (await pool.query('SELECT * FROM zk_devices WHERE id = $1', [device_id])).rows[0];
    if (!device) return res.status(404).json({ error: 'الجهاز غير موجود' });

    zk = await connectZK(device.ip_address, device.port);
    const logs = await zk.getAttendances();
    await zk.disconnect();

    // Load mappings for quick lookups
    const mappings = (await pool.query(
      'SELECT zk_user_id, employee_id FROM zk_employee_map WHERE device_id = $1',
      [device_id]
    )).rows;
    const mapLookup = {};
    mappings.forEach(m => { mapLookup[m.zk_user_id] = m.employee_id; });

    // Debug: log first 3 attendance records
    const rawLogs = logs.data || [];
    if (rawLogs.length > 0) {
      console.log('ZK raw attendance sample:', JSON.stringify(rawLogs.slice(0, 3), null, 2));
    }

    let imported = 0, skipped = 0;
    for (const log of rawLogs) {
      // deviceUserId = the enrollment ID matching userId from getUsers
      const zkUserId = String(log.deviceUserId ?? log.userId ?? log.uid);
      const timestamp = log.recordTime;
      const employeeId = mapLookup[zkUserId] || null;

      try {
        await pool.query(`
          INSERT INTO attendance_records (device_id, zk_user_id, employee_id, timestamp, punch_type, status)
          VALUES ($1, $2, $3, $4, $5, $6)
          ON CONFLICT (zk_user_id, timestamp) DO NOTHING
        `, [device_id, zkUserId, employeeId, timestamp, log.type || 0, log.state || 0]);
        imported++;
      } catch (e) {
        skipped++;
      }
    }

    await pool.query(
      'UPDATE zk_devices SET last_sync_at = NOW(), last_sync_status = $1 WHERE id = $2',
      ['attendance_synced', device_id]
    );

    res.json({
      success: true,
      message: `تم سحب ${imported} سجل حضور (${skipped} مكرر/خطأ)`,
      totalLogs: (logs.data || []).length,
      imported, skipped
    });
  } catch (error) {
    if (zk) try { await zk.disconnect(); } catch (e) {}
    console.error('ZK syncAttendance error:', error);
    res.status(500).json({ error: 'خطأ في سحب الحضور: ' + error.message });
  }
};

// ─── Get attendance records with filters ───
const getAttendance = async (req, res) => {
  try {
    const { date, employee_id, device_id, from, to } = req.query;

    let query = `
      SELECT a.*, e.full_name as employee_name, e.employee_code, d.name as department_name,
             zd.name as device_name
      FROM attendance_records a
      LEFT JOIN employees e ON e.id = a.employee_id
      LEFT JOIN departments d ON d.id = e.department_id
      LEFT JOIN zk_devices zd ON zd.id = a.device_id
      WHERE 1=1
    `;
    const params = [];
    let idx = 1;

    if (date) {
      query += ` AND DATE(a.timestamp) = $${idx++}`;
      params.push(date);
    }
    if (from) {
      query += ` AND DATE(a.timestamp) >= $${idx++}`;
      params.push(from);
    }
    if (to) {
      query += ` AND DATE(a.timestamp) <= $${idx++}`;
      params.push(to);
    }
    if (employee_id) {
      query += ` AND a.employee_id = $${idx++}`;
      params.push(employee_id);
    }
    if (device_id) {
      query += ` AND a.device_id = $${idx++}`;
      params.push(device_id);
    }

    query += ' ORDER BY a.timestamp DESC LIMIT 500';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('ZK getAttendance error:', error);
    res.status(500).json({ error: 'خطأ في جلب الحضور' });
  }
};

// ─── Get attendance stats/summary ───
const getAttendanceStats = async (req, res) => {
  try {
    const { date } = req.query;
    const targetDate = date || new Date().toISOString().split('T')[0];

    const [totalEmployees, presentToday, totalRecords, devices] = await Promise.all([
      pool.query('SELECT COUNT(*) FROM employees WHERE is_active = true'),
      pool.query('SELECT COUNT(DISTINCT employee_id) FROM attendance_records WHERE DATE(timestamp) = $1 AND employee_id IS NOT NULL', [targetDate]),
      pool.query('SELECT COUNT(*) FROM attendance_records'),
      pool.query('SELECT COUNT(*) FROM zk_devices WHERE is_active = true'),
    ]);

    res.json({
      totalEmployees: parseInt(totalEmployees.rows[0].count),
      presentToday: parseInt(presentToday.rows[0].count),
      absentToday: parseInt(totalEmployees.rows[0].count) - parseInt(presentToday.rows[0].count),
      totalRecords: parseInt(totalRecords.rows[0].count),
      activeDevices: parseInt(devices.rows[0].count),
      date: targetDate
    });
  } catch (error) {
    console.error('ZK getStats error:', error);
    res.status(500).json({ error: 'خطأ في الإحصائيات' });
  }
};

// ─── Daily report: first-in / last-out per employee ───
const getDailyReport = async (req, res) => {
  try {
    const { date } = req.query;
    const targetDate = date || new Date().toISOString().split('T')[0];

    const result = await pool.query(`
      SELECT 
        a.employee_id,
        e.full_name as employee_name,
        e.employee_code,
        d.name as department_name,
        MIN(a.timestamp) as first_in,
        MAX(a.timestamp) as last_out,
        COUNT(*) as punch_count,
        EXTRACT(EPOCH FROM (MAX(a.timestamp) - MIN(a.timestamp)))/3600 as hours_worked
      FROM attendance_records a
      LEFT JOIN employees e ON e.id = a.employee_id
      LEFT JOIN departments d ON d.id = e.department_id
      WHERE DATE(a.timestamp) = $1 AND a.employee_id IS NOT NULL
      GROUP BY a.employee_id, e.full_name, e.employee_code, d.name
      ORDER BY e.full_name
    `, [targetDate]);

    res.json({
      date: targetDate,
      records: result.rows
    });
  } catch (error) {
    console.error('ZK getDailyReport error:', error);
    res.status(500).json({ error: 'خطأ في التقرير اليومي' });
  }
};

module.exports = {
  getDevices,
  addDevice,
  updateDevice,
  deleteDevice,
  testConnection,
  syncUsers,
  getMappings,
  mapUser,
  bulkSyncCodes,
  syncAttendance,
  getAttendance,
  getAttendanceStats,
  getDailyReport
};
