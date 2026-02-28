const pool = require('./database');

async function initAttendance() {
  try {
    // ZKTeco device configuration table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS zk_devices (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        ip_address VARCHAR(50) NOT NULL,
        port INTEGER DEFAULT 4370,
        is_active BOOLEAN DEFAULT true,
        last_sync_at TIMESTAMP,
        last_sync_status VARCHAR(50),
        total_users INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Attendance records table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS attendance_records (
        id SERIAL PRIMARY KEY,
        device_id INTEGER REFERENCES zk_devices(id),
        zk_user_id VARCHAR(50) NOT NULL,
        employee_id INTEGER REFERENCES employees(id),
        timestamp TIMESTAMP NOT NULL,
        punch_type INTEGER DEFAULT 0,
        status INTEGER DEFAULT 0,
        synced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(zk_user_id, timestamp)
      );
    `);

    // ZK-to-Employee mapping table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS zk_employee_map (
        id SERIAL PRIMARY KEY,
        zk_user_id VARCHAR(50) NOT NULL,
        zk_user_name VARCHAR(255),
        employee_id INTEGER REFERENCES employees(id),
        device_id INTEGER REFERENCES zk_devices(id),
        is_mapped BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(zk_user_id, device_id)
      );
    `);

    // Indices
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_attendance_timestamp ON attendance_records(timestamp)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_attendance_employee ON attendance_records(employee_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_attendance_zk_user ON attendance_records(zk_user_id)`);

    console.log('✅ Attendance/ZKTeco tables created/verified');
  } catch (error) {
    console.error('❌ Error creating attendance tables:', error.message);
  }
}

module.exports = initAttendance;
