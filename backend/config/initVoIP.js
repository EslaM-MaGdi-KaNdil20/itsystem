const pool = require('./database');

async function initVoIP() {
  try {
    // VoIP/PBX config - singleton pattern (always id=1)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS voip_config (
        id SERIAL PRIMARY KEY,
        pbx_type VARCHAR(50) DEFAULT 'grandstream',
        server_url VARCHAR(500) NOT NULL DEFAULT '',
        port INTEGER DEFAULT 8089,
        username VARCHAR(255) NOT NULL DEFAULT '',
        password TEXT NOT NULL DEFAULT '',
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

    // VoIP extensions cache
    await pool.query(`
      CREATE TABLE IF NOT EXISTS voip_extensions (
        id SERIAL PRIMARY KEY,
        extension VARCHAR(20) NOT NULL,
        caller_id_name VARCHAR(255),
        caller_id_number VARCHAR(50),
        department VARCHAR(255),
        email VARCHAR(255),
        account_type VARCHAR(50) DEFAULT 'SIP',
        status VARCHAR(50) DEFAULT 'active',
        employee_id INTEGER REFERENCES employees(id) ON DELETE SET NULL,
        mac_address VARCHAR(50),
        ip_address VARCHAR(50),
        device_model VARCHAR(255),
        out_of_service VARCHAR(10) DEFAULT 'no',
        enable_ldap VARCHAR(10),
        raw_data JSONB,
        last_synced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(extension)
      )
    `);

    // VoIP sync logs
    await pool.query(`
      CREATE TABLE IF NOT EXISTS voip_sync_logs (
        id SERIAL PRIMARY KEY,
        sync_type VARCHAR(50) DEFAULT 'extensions',
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

    console.log('✅ VoIP/PBX tables created/verified');
  } catch (error) {
    console.error('❌ Error initializing VoIP tables:', error);
  }
}

module.exports = initVoIP;
