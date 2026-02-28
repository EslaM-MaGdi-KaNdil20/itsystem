const pool = require('./database');

async function initActivityLog() {
  try {
    // Create activity_logs table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS activity_logs (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        user_name VARCHAR(255),
        action VARCHAR(50) NOT NULL,
        entity_type VARCHAR(50) NOT NULL,
        entity_id INTEGER,
        entity_name VARCHAR(255),
        details TEXT,
        ip_address VARCHAR(45),
        user_agent TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // Create index for faster queries
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs(created_at DESC);
    `);
    
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_activity_logs_entity ON activity_logs(entity_type, entity_id);
    `);
    
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_activity_logs_user ON activity_logs(user_id);
    `);
    
    console.log('✅ Activity Logs table created/verified');
    
  } catch (error) {
    console.error('Error initializing activity logs table:', error);
    throw error;
  }
}

module.exports = initActivityLog;
