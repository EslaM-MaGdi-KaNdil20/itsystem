const pool = require('./database');

const initMaintenanceSchedules = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS maintenance_schedules (
        id SERIAL PRIMARY KEY,
        device_id INTEGER REFERENCES devices(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        interval_days INTEGER NOT NULL DEFAULT 90,
        last_done DATE,
        next_due DATE NOT NULL,
        assigned_to INTEGER REFERENCES users(id) ON DELETE SET NULL,
        is_active BOOLEAN DEFAULT true,
        auto_create_task BOOLEAN DEFAULT true,
        notify_days_before INTEGER DEFAULT 7,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Track which schedules already had a task created for the upcoming due
    await pool.query(`
      ALTER TABLE maintenance_schedules
        ADD COLUMN IF NOT EXISTS last_task_created_for DATE
    `);

    console.log('✅ maintenance_schedules table ready');
  } catch (error) {
    console.error('❌ Error initializing maintenance_schedules:', error);
  }
};

module.exports = initMaintenanceSchedules;
