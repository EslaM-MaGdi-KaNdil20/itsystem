const pool = require('./database');

async function initAD() {
  try {
    // Active Directory configuration table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS ad_config (
        id SERIAL PRIMARY KEY,
        domain_name VARCHAR(255) NOT NULL,
        server_url VARCHAR(500) NOT NULL,
        base_dn VARCHAR(500) NOT NULL,
        bind_dn VARCHAR(500) NOT NULL,
        bind_password TEXT NOT NULL,
        search_filter VARCHAR(500) DEFAULT '(&(objectClass=user)(objectCategory=person))',
        use_ssl BOOLEAN DEFAULT false,
        port INTEGER DEFAULT 389,
        sync_interval_minutes INTEGER DEFAULT 60,
        auto_sync_enabled BOOLEAN DEFAULT false,
        auto_create_users BOOLEAN DEFAULT false,
        default_role VARCHAR(50) DEFAULT 'user',
        sync_employees BOOLEAN DEFAULT true,
        last_sync_at TIMESTAMP,
        last_sync_status VARCHAR(50),
        last_sync_message TEXT,
        last_sync_count INTEGER DEFAULT 0,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ AD Config table created/verified');

    // AD Users cache table — stores imported AD users
    await pool.query(`
      CREATE TABLE IF NOT EXISTS ad_users (
        id SERIAL PRIMARY KEY,
        ad_guid VARCHAR(255) UNIQUE,
        sam_account_name VARCHAR(255),
        user_principal_name VARCHAR(500),
        display_name VARCHAR(255),
        first_name VARCHAR(255),
        last_name VARCHAR(255),
        email VARCHAR(255),
        phone VARCHAR(100),
        mobile VARCHAR(100),
        title VARCHAR(255),
        department VARCHAR(255),
        company VARCHAR(255),
        office VARCHAR(255),
        manager_dn VARCHAR(500),
        distinguished_name VARCHAR(500),
        member_of TEXT,
        is_enabled BOOLEAN DEFAULT true,
        when_created TIMESTAMP,
        when_changed TIMESTAMP,
        last_logon TIMESTAMP,
        local_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        local_employee_id INTEGER REFERENCES employees(id) ON DELETE SET NULL,
        is_synced_user BOOLEAN DEFAULT false,
        is_synced_employee BOOLEAN DEFAULT false,
        last_sync_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ AD Users table created/verified');

    // AD Sync logs
    await pool.query(`
      CREATE TABLE IF NOT EXISTS ad_sync_logs (
        id SERIAL PRIMARY KEY,
        sync_type VARCHAR(50) NOT NULL,
        status VARCHAR(50) NOT NULL,
        total_found INTEGER DEFAULT 0,
        new_imported INTEGER DEFAULT 0,
        updated INTEGER DEFAULT 0,
        errors INTEGER DEFAULT 0,
        error_details TEXT,
        duration_ms INTEGER,
        triggered_by VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ AD Sync Logs table created/verified');

    // Add ad_guid column to users table if not exists
    await pool.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='ad_guid') THEN
          ALTER TABLE users ADD COLUMN ad_guid VARCHAR(255);
          ALTER TABLE users ADD COLUMN is_ad_user BOOLEAN DEFAULT false;
          ALTER TABLE users ADD COLUMN ad_username VARCHAR(255);
        END IF;
      END $$;
    `);
    console.log('✅ AD columns added to users table');

    // Add ad_guid column to employees table if not exists
    await pool.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='employees' AND column_name='ad_guid') THEN
          ALTER TABLE employees ADD COLUMN ad_guid VARCHAR(255);
          ALTER TABLE employees ADD COLUMN is_ad_employee BOOLEAN DEFAULT false;
        END IF;
      END $$;
    `);
    console.log('✅ AD columns added to employees table');

    // Add AD columns to departments table if not exists
    await pool.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='departments' AND column_name='ad_ou') THEN
          ALTER TABLE departments ADD COLUMN ad_ou VARCHAR(500);
          ALTER TABLE departments ADD COLUMN ad_dn VARCHAR(500);
          ALTER TABLE departments ADD COLUMN ad_type VARCHAR(50) DEFAULT 'ou';
          ALTER TABLE departments ADD COLUMN is_ad_department BOOLEAN DEFAULT false;
        END IF;
      END $$;
    `);
    console.log('✅ AD columns added to departments table');

    // AD Groups/OUs cache table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS ad_groups_ous (
        id SERIAL PRIMARY KEY,
        ad_guid VARCHAR(255),
        name VARCHAR(255) NOT NULL,
        display_name VARCHAR(255),
        distinguished_name VARCHAR(500) UNIQUE,
        description TEXT,
        type VARCHAR(50) NOT NULL,
        member_count INTEGER DEFAULT 0,
        parent_dn VARCHAR(500),
        local_department_id INTEGER REFERENCES departments(id) ON DELETE SET NULL,
        is_synced BOOLEAN DEFAULT false,
        last_sync_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ AD Groups/OUs table created/verified');

    console.log('✅ Active Directory initialization complete');
  } catch (error) {
    console.error('❌ AD initialization error:', error.message);
  }
}

module.exports = initAD;
