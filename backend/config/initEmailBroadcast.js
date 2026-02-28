const pool = require('./database');

const initEmailBroadcast = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS email_broadcasts (
        id SERIAL PRIMARY KEY,
        subject VARCHAR(500) NOT NULL,
        body TEXT NOT NULL,
        template VARCHAR(50) DEFAULT 'general',
        recipients_filter JSONB DEFAULT '{}',
        recipients_count INTEGER DEFAULT 0,
        sent_by VARCHAR(255),
        status VARCHAR(20) DEFAULT 'sent',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ Email broadcasts table ready');
  } catch (error) {
    console.error('❌ Error initializing email broadcasts table:', error);
  }
};

module.exports = initEmailBroadcast;
