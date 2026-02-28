const pool = require('./database');

async function initInventory() {
  try {
    // Create categories table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS categories (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ Categories table created');

    // Create products table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS products (
        id SERIAL PRIMARY KEY,
        code VARCHAR(100) UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
        unit VARCHAR(50) DEFAULT 'قطعة',
        unit_price DECIMAL(10, 2) DEFAULT 0,
        current_stock INTEGER DEFAULT 0,
        min_stock_alert INTEGER DEFAULT 10,
        image_url TEXT,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ Products table created');

    // Create stock_movements table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS stock_movements (
        id SERIAL PRIMARY KEY,
        product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
        movement_type VARCHAR(20) NOT NULL CHECK (movement_type IN ('in', 'out')),
        quantity INTEGER NOT NULL,
        reason VARCHAR(255),
        notes TEXT,
        user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ Stock movements table created');

    // Insert default categories
    const categoriesCheck = await pool.query('SELECT COUNT(*) FROM categories');
    if (parseInt(categoriesCheck.rows[0].count) === 0) {
      await pool.query(`
        INSERT INTO categories (name, description) VALUES
        ('إلكترونيات', 'أجهزة إلكترونية ومعدات'),
        ('قطع غيار', 'قطع غيار وملحقات'),
        ('أدوات مكتبية', 'لوازم وأدوات مكتبية'),
        ('معدات شبكات', 'معدات الشبكات والاتصالات'),
        ('متنوعة', 'منتجات متنوعة أخرى')
      `);
      console.log('✅ Default categories inserted');
    }

    // Insert sample products
    const productsCheck = await pool.query('SELECT COUNT(*) FROM products');
    if (parseInt(productsCheck.rows[0].count) === 0) {
      await pool.query(`
        INSERT INTO products (code, name, description, category_id, unit, unit_price, current_stock, min_stock_alert) VALUES
        ('PROD001', 'لابتوب HP ProBook 450', 'لابتوب HP للأعمال - معالج i5 - رام 8 جيجا', 1, 'قطعة', 3500.00, 15, 5),
        ('PROD002', 'ماوس لاسلكي Logitech', 'ماوس لاسلكي بتقنية بلوتوث', 1, 'قطعة', 25.00, 50, 10),
        ('PROD003', 'كيبورد ميكانيكي', 'كيبورد ميكانيكي RGB للألعاب', 1, 'قطعة', 75.00, 30, 8),
        ('PROD004', 'كابل شبكة Cat6', 'كابل شبكة Cat6 - 10 متر', 4, 'قطعة', 5.00, 200, 50),
        ('PROD005', 'راوتر WiFi 6', 'راوتر واي فاي الجيل السادس', 4, 'قطعة', 120.00, 20, 5)
      `);
      console.log('✅ Sample products inserted');
    }

  } catch (error) {
    console.error('❌ Error initializing inventory:', error);
  }
}

module.exports = initInventory;
