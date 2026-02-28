const pool = require('./database');
const bcrypt = require('bcrypt');

async function initDatabase() {
  try {
    // Create users table with roles
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        full_name VARCHAR(255) NOT NULL,
        role VARCHAR(50) DEFAULT 'user',
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT role_check CHECK (role IN ('super_admin', 'admin', 'support', 'user'))
      );
    `);
    
    console.log('✅ Users table created/verified');

    // Add permissions + phone + is_active columns if not exist (migration)
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(50)`);
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT '{}'::jsonb`);
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar VARCHAR(255)`);
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true`);

    // ========== IT Asset Management Tables ==========
    
    // Departments table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS departments (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        code VARCHAR(50) UNIQUE,
        location VARCHAR(255),
        manager_name VARCHAR(255),
        phone VARCHAR(50),
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ Departments table created/verified');

    // Employees table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS employees (
        id SERIAL PRIMARY KEY,
        employee_code VARCHAR(50) UNIQUE,
        full_name VARCHAR(255) NOT NULL,
        department_id INTEGER REFERENCES departments(id),
        job_title VARCHAR(255),
        email VARCHAR(255),
        phone VARCHAR(50),
        extension VARCHAR(20),
        hire_date DATE,
        is_active BOOLEAN DEFAULT true,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ Employees table created/verified');

    // Device types table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS device_types (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL UNIQUE,
        name_ar VARCHAR(100),
        icon VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // Insert default device types
    const deviceTypes = [
      { name: 'Computer', name_ar: 'كمبيوتر', icon: 'computer' },
      { name: 'Laptop', name_ar: 'لابتوب', icon: 'laptop' },
      { name: 'Monitor', name_ar: 'شاشة', icon: 'monitor' },
      { name: 'Printer', name_ar: 'طابعة', icon: 'printer' },
      { name: 'Server', name_ar: 'سيرفر', icon: 'server' },
      { name: 'Core Switch', name_ar: 'سويتش كور', icon: 'switch' },
      { name: 'Switch', name_ar: 'سويتش', icon: 'switch' },
      { name: 'IP Phone', name_ar: 'هاتف IP', icon: 'phone' },
      { name: 'Camera', name_ar: 'كاميرا', icon: 'camera' },
      { name: 'Router', name_ar: 'راوتر', icon: 'router' },
      { name: 'Access Point', name_ar: 'أكسس بوينت', icon: 'wifi' },
      { name: 'UPS', name_ar: 'يو بي إس', icon: 'ups' },
      { name: 'Scanner', name_ar: 'سكانر', icon: 'scanner' },
      { name: 'Other', name_ar: 'أخرى', icon: 'other' }
    ];
    
    for (const type of deviceTypes) {
      await pool.query(`
        INSERT INTO device_types (name, name_ar, icon)
        VALUES ($1, $2, $3)
        ON CONFLICT (name) DO NOTHING
      `, [type.name, type.name_ar, type.icon]);
    }
    console.log('✅ Device types table created/verified');

    // Devices table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS devices (
        id SERIAL PRIMARY KEY,
        device_type_id INTEGER REFERENCES device_types(id),
        asset_tag VARCHAR(100) UNIQUE,
        brand VARCHAR(100),
        model VARCHAR(100),
        serial_number VARCHAR(255),
        
        -- Computer/Laptop specific
        cpu VARCHAR(100),
        ram VARCHAR(50),
        storage VARCHAR(100),
        os VARCHAR(100),
        
        -- Network device specific
        ip_address VARCHAR(50),
        mac_address VARCHAR(50),
        
        -- General
        purchase_date DATE,
        warranty_end DATE,
        purchase_price DECIMAL(10,2),
        supplier VARCHAR(255),
        
        -- Status
        status VARCHAR(50) DEFAULT 'available',
        condition VARCHAR(50) DEFAULT 'good',
        location VARCHAR(255),
        
        notes TEXT,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        
        CONSTRAINT status_check CHECK (status IN ('available', 'assigned', 'maintenance', 'retired', 'disposed'))
      );
    `);
    console.log('✅ Devices table created/verified');

    // Device assignments table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS device_assignments (
        id SERIAL PRIMARY KEY,
        device_id INTEGER REFERENCES devices(id),
        employee_id INTEGER REFERENCES employees(id),
        
        assigned_date DATE DEFAULT CURRENT_DATE,
        returned_date DATE,
        
        -- Credentials (for computers)
        windows_username VARCHAR(100),
        windows_password VARCHAR(255),
        email_account VARCHAR(255),
        email_password VARCHAR(255),
        
        assigned_by VARCHAR(255),
        notes TEXT,
        is_current BOOLEAN DEFAULT true,
        
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ Device assignments table created/verified');

    // Maintenance records table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS maintenance_records (
        id SERIAL PRIMARY KEY,
        device_id INTEGER REFERENCES devices(id),
        
        maintenance_type VARCHAR(100),
        description TEXT,
        
        start_date DATE DEFAULT CURRENT_DATE,
        end_date DATE,
        
        performed_by VARCHAR(255),
        cost DECIMAL(10,2),
        
        status VARCHAR(50) DEFAULT 'pending',
        notes TEXT,
        
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        
        CONSTRAINT maintenance_status_check CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled'))
      );
    `);
    console.log('✅ Maintenance records table created/verified');

    // ========== End IT Asset Management Tables ==========

    // Check if super admin exists
    const superAdminExists = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      ['super@itsystem.com']
    );

    // Create default super admin if not exists
    if (superAdminExists.rows.length === 0) {
      const hashedPassword = await bcrypt.hash('Super@123', 10);
      await pool.query(
        'INSERT INTO users (email, password, full_name, role) VALUES ($1, $2, $3, $4)',
        ['super@itsystem.com', hashedPassword, 'Super Administrator', 'super_admin']
      );
      console.log('✅ Super Admin created - Email: super@itsystem.com, Password: Super@123');
    }

    // Check if regular admin exists
    const adminExists = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      ['admin@itsystem.com']
    );

    if (adminExists.rows.length === 0) {
      const hashedPassword = await bcrypt.hash('admin123', 10);
      await pool.query(
        'INSERT INTO users (email, password, full_name, role) VALUES ($1, $2, $3, $4)',
        ['admin@itsystem.com', hashedPassword, 'System Administrator', 'admin']
      );
      console.log('✅ Admin created - Email: admin@itsystem.com, Password: admin123');
    }

  } catch (error) {
    console.error('❌ Error initializing database:', error);
  }
}

module.exports = initDatabase;

// Accessories table
const createAccessoriesTable = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS accessories (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      name_ar VARCHAR(100),
      category VARCHAR(50) DEFAULT 'general',
      description TEXT,
      stock_quantity INTEGER DEFAULT 0,
      min_stock_level INTEGER DEFAULT 5,
      unit_price DECIMAL(10,2) DEFAULT 0,
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  // Add stock columns if they don't exist (for existing installations)
  await pool.query(`
    DO $$ 
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='accessories' AND column_name='stock_quantity') THEN
        ALTER TABLE accessories ADD COLUMN stock_quantity INTEGER DEFAULT 0;
      END IF;
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='accessories' AND column_name='min_stock_level') THEN
        ALTER TABLE accessories ADD COLUMN min_stock_level INTEGER DEFAULT 5;
      END IF;
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='accessories' AND column_name='unit_price') THEN
        ALTER TABLE accessories ADD COLUMN unit_price DECIMAL(10,2) DEFAULT 0;
      END IF;
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='accessories' AND column_name='updated_at') THEN
        ALTER TABLE accessories ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
      END IF;
    END $$;
  `);
  
  // Insert default accessories if table is empty
  const count = await pool.query('SELECT COUNT(*) FROM accessories');
  if (parseInt(count.rows[0].count) === 0) {
    await pool.query(`
      INSERT INTO accessories (name, name_ar, category, stock_quantity, min_stock_level) VALUES
      ('Mouse', 'ماوس', 'input', 10, 5),
      ('Keyboard', 'كيبورد', 'input', 10, 5),
      ('Monitor', 'شاشة', 'display', 5, 2),
      ('Monitor Cable (HDMI)', 'كابل شاشة HDMI', 'cable', 15, 5),
      ('Monitor Cable (VGA)', 'كابل شاشة VGA', 'cable', 10, 5),
      ('Monitor Cable (DP)', 'كابل شاشة DisplayPort', 'cable', 10, 5),
      ('Power Cable', 'كابل باور', 'cable', 20, 10),
      ('Power Adapter', 'شاحن/أدابتر', 'power', 5, 2),
      ('USB Hub', 'موزع USB', 'accessory', 5, 2),
      ('Headset', 'سماعة رأس', 'audio', 10, 5),
      ('Webcam', 'كاميرا ويب', 'video', 5, 2),
      ('Laptop Bag', 'شنطة لابتوب', 'accessory', 5, 2),
      ('Docking Station', 'دوكينج ستيشن', 'accessory', 3, 1),
      ('Ethernet Cable', 'كابل إنترنت', 'cable', 30, 10),
      ('Mouse Pad', 'ماوس باد', 'accessory', 15, 5)
    `);
  }
  console.log('✅ Accessories table created/verified');
};

// Assignment Accessories table (for accessories with devices)
const createAssignmentAccessoriesTable = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS assignment_accessories (
      id SERIAL PRIMARY KEY,
      assignment_id INTEGER REFERENCES device_assignments(id) ON DELETE CASCADE,
      accessory_id INTEGER REFERENCES accessories(id) ON DELETE CASCADE,
      quantity INTEGER DEFAULT 1,
      serial_number VARCHAR(100),
      condition VARCHAR(50) DEFAULT 'good',
      notes TEXT,
      returned BOOLEAN DEFAULT false,
      returned_date TIMESTAMP,
      returned_condition VARCHAR(50),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  console.log('✅ Assignment Accessories table created/verified');
};

// Standalone Accessory Assignments table (for accessories without devices)
const createStandaloneAccessoryAssignmentsTable = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS accessory_assignments (
      id SERIAL PRIMARY KEY,
      accessory_id INTEGER REFERENCES accessories(id) ON DELETE CASCADE,
      employee_id INTEGER REFERENCES employees(id) ON DELETE CASCADE,
      quantity INTEGER DEFAULT 1,
      serial_number VARCHAR(100),
      condition VARCHAR(50) DEFAULT 'new',
      assigned_by VARCHAR(255),
      assigned_date DATE DEFAULT CURRENT_DATE,
      notes TEXT,
      is_returned BOOLEAN DEFAULT false,
      returned_date DATE,
      returned_condition VARCHAR(50),
      return_notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  console.log('✅ Standalone Accessory Assignments table created/verified');
};

// Accessory Stock Movements table (for tracking stock changes)
const createAccessoryStockMovementsTable = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS accessory_stock_movements (
      id SERIAL PRIMARY KEY,
      accessory_id INTEGER REFERENCES accessories(id) ON DELETE CASCADE,
      movement_type VARCHAR(20) NOT NULL,
      quantity INTEGER NOT NULL,
      reference_type VARCHAR(50),
      reference_id INTEGER,
      notes TEXT,
      created_by VARCHAR(255),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT movement_type_check CHECK (movement_type IN ('in', 'out', 'adjustment', 'return'))
    )
  `);
  console.log('✅ Accessory Stock Movements table created/verified');
};

// Initialize accessories tables
const initAccessories = async () => {
  await createAccessoriesTable();
  await createAssignmentAccessoriesTable();
  await createStandaloneAccessoryAssignmentsTable();
  await createAccessoryStockMovementsTable();
};

module.exports = initDatabase;
module.exports.initAccessories = initAccessories;

// ==================== IT Management Tables ====================

// Subscriptions table
const createSubscriptionsTable = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS subscriptions (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      provider VARCHAR(255),
      subscription_type VARCHAR(100),
      cost DECIMAL(10,2),
      billing_cycle VARCHAR(50) DEFAULT 'monthly',
      start_date DATE,
      end_date DATE,
      auto_renew BOOLEAN DEFAULT false,
      login_url VARCHAR(500),
      username VARCHAR(255),
      password_encrypted TEXT,
      notes TEXT,
      status VARCHAR(50) DEFAULT 'active',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  console.log('✅ Subscriptions table created/verified');
};

// Servers table
const createServersTable = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS servers (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      hostname VARCHAR(255),
      public_ip VARCHAR(45),
      private_ip VARCHAR(45),
      ssh_port INTEGER DEFAULT 22,
      server_type VARCHAR(100),
      provider VARCHAR(255),
      location VARCHAR(255),
      os VARCHAR(255),
      cpu VARCHAR(255),
      ram VARCHAR(100),
      storage VARCHAR(255),
      username VARCHAR(255),
      password_encrypted TEXT,
      ssh_key TEXT,
      notes TEXT,
      status VARCHAR(50) DEFAULT 'active',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  console.log('✅ Servers table created/verified');
};

// Network IPs table
const createNetworkIPsTable = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS network_ips (
      id SERIAL PRIMARY KEY,
      ip_address VARCHAR(45) NOT NULL UNIQUE,
      subnet_mask VARCHAR(45),
      gateway VARCHAR(45),
      vlan VARCHAR(50),
      mac_address VARCHAR(17),
      device_type VARCHAR(100),
      assigned_to VARCHAR(255),
      location VARCHAR(255),
      notes TEXT,
      status VARCHAR(50) DEFAULT 'available',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  console.log('✅ Network IPs table created/verified');
};

// Password Vault table
const createPasswordVaultTable = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS password_vault (
      id SERIAL PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      username VARCHAR(255),
      password_encrypted TEXT NOT NULL,
      url VARCHAR(500),
      category VARCHAR(100),
      service_type VARCHAR(100),
      notes TEXT,
      tags TEXT,
      is_favorite BOOLEAN DEFAULT false,
      last_used TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  console.log('✅ Password Vault table created/verified');
};

// Email Accounts table
const createEmailAccountsTable = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS email_accounts (
      id SERIAL PRIMARY KEY,
      email_address VARCHAR(255) NOT NULL UNIQUE,
      employee_id INTEGER REFERENCES employees(id) ON DELETE SET NULL,
      email_type VARCHAR(50) DEFAULT 'work',
      password_encrypted TEXT,
      server_incoming VARCHAR(255),
      server_outgoing VARCHAR(255),
      quota_mb INTEGER,
      quota_used_mb INTEGER DEFAULT 0,
      notes TEXT,
      status VARCHAR(50) DEFAULT 'active',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  console.log('✅ Email Accounts table created/verified');
};

// IT Access Logs table
const createITAccessLogsTable = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS it_access_logs (
      id SERIAL PRIMARY KEY,
      user_id INTEGER,
      action_type VARCHAR(100),
      resource_type VARCHAR(100),
      resource_id INTEGER,
      details TEXT,
      ip_address VARCHAR(45),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  console.log('✅ IT Access Logs table created/verified');
};

// Initialize IT Management tables
const initITManagement = async () => {
  await createSubscriptionsTable();
  await createServersTable();
  await createNetworkIPsTable();
  await createPasswordVaultTable();
  await createEmailAccountsTable();
  await createITAccessLogsTable();
};

module.exports.initITManagement = initITManagement;
