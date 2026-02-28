const pool = require('./database');

const initLicenses = async () => {
  try {
    // License pool table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS licenses (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        vendor VARCHAR(100) NOT NULL,
        version VARCHAR(100),
        type VARCHAR(50) NOT NULL DEFAULT 'software',
        key_type VARCHAR(50) DEFAULT 'volume',
        license_key TEXT,
        total_quantity INTEGER NOT NULL DEFAULT 1,
        purchase_date DATE,
        expiry_date DATE,
        cost_per_unit DECIMAL(10,2),
        currency VARCHAR(10) DEFAULT 'EGP',
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT license_type_check CHECK (type IN ('windows','office','server','antivirus','cad','erp','other')),
        CONSTRAINT key_type_check CHECK (key_type IN ('oem','volume','subscription','perpetual'))
      );
    `);

    // Per-assignment license keys & mapping
    await pool.query(`
      CREATE TABLE IF NOT EXISTS license_assignments (
        id SERIAL PRIMARY KEY,
        license_id INTEGER NOT NULL REFERENCES licenses(id) ON DELETE CASCADE,
        device_id INTEGER REFERENCES devices(id) ON DELETE SET NULL,
        employee_id INTEGER REFERENCES employees(id) ON DELETE SET NULL,
        license_key TEXT,
        assigned_date DATE DEFAULT CURRENT_DATE,
        returned_date DATE,
        is_current BOOLEAN DEFAULT true,
        assigned_by VARCHAR(255),
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log('✅ Licenses tables created/verified');
  } catch (error) {
    console.error('❌ Error initializing licenses tables:', error);
  }
};

module.exports = initLicenses;
