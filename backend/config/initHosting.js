const pool = require('./database');

async function initHosting() {
  try {
    // Hosting config - singleton pattern (always id=1)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS hosting_config (
        id SERIAL PRIMARY KEY,
        server_url VARCHAR(500) NOT NULL DEFAULT '',
        port INTEGER DEFAULT 2087,
        username VARCHAR(255) NOT NULL DEFAULT '',
        api_token TEXT NOT NULL DEFAULT '',
        cpanel_user VARCHAR(255) DEFAULT '',
        domain VARCHAR(255) NOT NULL DEFAULT '',
        use_ssl BOOLEAN DEFAULT true,
        auto_sync_enabled BOOLEAN DEFAULT false,
        sync_interval_minutes INTEGER DEFAULT 60,
        last_sync_at TIMESTAMP,
        last_sync_status VARCHAR(50),
        last_sync_message TEXT,
        last_sync_count INTEGER DEFAULT 0,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Hosting sync logs
    await pool.query(`
      CREATE TABLE IF NOT EXISTS hosting_sync_logs (
        id SERIAL PRIMARY KEY,
        sync_type VARCHAR(50) DEFAULT 'emails',
        total_found INTEGER DEFAULT 0,
        new_count INTEGER DEFAULT 0,
        updated_count INTEGER DEFAULT 0,
        error_count INTEGER DEFAULT 0,
        status VARCHAR(50),
        message TEXT,
        details JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Add alert config columns to hosting_config if not exist
    await pool.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'hosting_config' AND column_name = 'alert_threshold_percent') THEN
          ALTER TABLE hosting_config ADD COLUMN alert_threshold_percent INTEGER DEFAULT 85;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'hosting_config' AND column_name = 'alert_email') THEN
          ALTER TABLE hosting_config ADD COLUMN alert_email VARCHAR(500) DEFAULT '';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'hosting_config' AND column_name = 'alert_enabled') THEN
          ALTER TABLE hosting_config ADD COLUMN alert_enabled BOOLEAN DEFAULT true;
        END IF;
      END $$;
    `);

    // Add extra columns to email_accounts if not exist
    await pool.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'email_accounts' AND column_name = 'source') THEN
          ALTER TABLE email_accounts ADD COLUMN source VARCHAR(50) DEFAULT 'manual';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'email_accounts' AND column_name = 'domain') THEN
          ALTER TABLE email_accounts ADD COLUMN domain VARCHAR(255);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'email_accounts' AND column_name = 'disk_used_mb') THEN
          ALTER TABLE email_accounts ADD COLUMN disk_used_mb NUMERIC(10,2) DEFAULT 0;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'email_accounts' AND column_name = 'last_synced_at') THEN
          ALTER TABLE email_accounts ADD COLUMN last_synced_at TIMESTAMP;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'email_accounts' AND column_name = 'cpanel_user') THEN
          ALTER TABLE email_accounts ADD COLUMN cpanel_user VARCHAR(255);
        END IF;
      END $$;
    `);

    console.log('✅ Hosting/cPanel tables initialized');
  } catch (error) {
    console.error('❌ Error initializing hosting tables:', error);
  }
}

module.exports = initHosting;
