const pool = require('./database');

const initGuidesTable = async () => {
  try {
    // User Guides table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_guides (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        category VARCHAR(100) NOT NULL,
        description TEXT,
        created_by VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ User Guides table created/verified');

    // Guide Steps table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS guide_steps (
        id SERIAL PRIMARY KEY,
        guide_id INTEGER REFERENCES user_guides(id) ON DELETE CASCADE,
        step_number INTEGER NOT NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        image_path VARCHAR(500),
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Guide Steps table created/verified');

  } catch (error) {
    console.error('Error initializing guides tables:', error);
  }
};

module.exports = initGuidesTable;
