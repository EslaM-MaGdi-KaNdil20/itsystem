const pool = require('./database');

async function initTasks() {
  try {
    // Add user_id to notifications for user-specific notifications (task assignments etc.)
    await pool.query(`ALTER TABLE notifications ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON DELETE CASCADE`);

    // Tasks table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS tasks (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        status VARCHAR(50) DEFAULT 'todo',
        priority VARCHAR(20) DEFAULT 'medium',
        position INTEGER DEFAULT 0,
        assigned_to INTEGER REFERENCES users(id) ON DELETE SET NULL,
        created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        due_date DATE,
        related_type VARCHAR(50),
        related_id INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT tasks_status_check CHECK (status IN ('todo','in_progress','review','done')),
        CONSTRAINT tasks_priority_check CHECK (priority IN ('low','medium','high','urgent'))
      )
    `);

    // Task comments table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS task_comments (
        id SERIAL PRIMARY KEY,
        task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
        user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        comment TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('✅ Tasks tables created/verified');
  } catch (error) {
    console.error('❌ Error initializing tasks tables:', error);
    throw error;
  }
}

module.exports = initTasks;
