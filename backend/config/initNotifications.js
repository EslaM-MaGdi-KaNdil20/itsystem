const pool = require('./database');

const initNotifications = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id            SERIAL PRIMARY KEY,
        type          VARCHAR(50)  NOT NULL, -- 'license_expiry' | 'warranty_expiry' | 'ticket_stale'
        title         VARCHAR(255) NOT NULL,
        message       TEXT         NOT NULL,
        link          VARCHAR(255),          -- e.g. '/licenses' or '/tickets'
        ref_id        INTEGER,               -- license_id / device_id / ticket_id
        is_read       BOOLEAN      NOT NULL DEFAULT false,
        created_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
      CREATE INDEX IF NOT EXISTS idx_notifications_type    ON notifications(type);
    `);
    console.log('✅ Notifications table ready');
  } catch (err) {
    console.error('❌ Error initializing notifications table:', err);
  }
};

module.exports = initNotifications;
