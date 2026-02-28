const pool = require('../config/database');
const { logActivity, ACTIONS, ENTITIES } = require('./activityLogController');

// Add stock movement (IN or OUT)
const addStockMovement = async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { product_id, movement_type, quantity, reason, notes } = req.body;
    const user_id = req.user?.id; // من الـ auth middleware
    
    if (!['in', 'out'].includes(movement_type)) {
      return res.status(400).json({ success: false, message: 'نوع الحركة غير صحيح' });
    }
    
    if (quantity <= 0) {
      return res.status(400).json({ success: false, message: 'الكمية يجب أن تكون أكبر من صفر' });
    }
    
    await client.query('BEGIN');
    
    // Check product exists and get current stock
    const productResult = await client.query(
      'SELECT id, current_stock, name FROM products WHERE id = $1',
      [product_id]
    );
    
    if (productResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'المنتج غير موجود' });
    }
    
    const product = productResult.rows[0];
    let newStock = product.current_stock;
    
    // Calculate new stock
    if (movement_type === 'in') {
      newStock += quantity;
    } else {
      if (product.current_stock < quantity) {
        await client.query('ROLLBACK');
        return res.status(400).json({ 
          success: false, 
          message: `الكمية المتوفرة (${product.current_stock}) غير كافية` 
        });
      }
      newStock -= quantity;
    }
    
    // Insert stock movement
    const movementResult = await client.query(
      `INSERT INTO stock_movements (product_id, movement_type, quantity, reason, notes, user_id)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [product_id, movement_type, quantity, reason, notes, user_id]
    );
    
    // Update product stock
    await client.query(
      'UPDATE products SET current_stock = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [newStock, product_id]
    );
    
    await client.query('COMMIT');
    
    // Log activity
    const actionType = movement_type === 'in' ? 'إضافة للمخزون' : 'صرف من المخزون';
    logActivity(req, ACTIONS.UPDATE, ENTITIES.PRODUCT, product_id, 
      product.name, `${actionType}: ${product.name} (الكمية: ${quantity}، المخزون الجديد: ${newStock})`);
    
    res.json({
      success: true,
      message: movement_type === 'in' ? 'تم إضافة الكمية بنجاح' : 'تم صرف الكمية بنجاح',
      data: {
        ...movementResult.rows[0],
        product_name: product.name,
        old_stock: product.current_stock,
        new_stock: newStock
      }
    });
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error adding stock movement:', error);
    res.status(500).json({ success: false, message: 'حدث خطأ في تسجيل الحركة' });
  } finally {
    client.release();
  }
};

// Get all stock movements
const getStockMovements = async (req, res) => {
  try {
    const { product_id, movement_type, start_date, end_date } = req.query;
    
    let query = `
      SELECT sm.*, p.name as product_name, p.code as product_code, u.full_name as user_name
      FROM stock_movements sm
      LEFT JOIN products p ON sm.product_id = p.id
      LEFT JOIN users u ON sm.user_id = u.id
      WHERE 1=1
    `;
    
    const params = [];
    
    if (product_id) {
      query += ` AND sm.product_id = $${params.length + 1}`;
      params.push(product_id);
    }
    
    if (movement_type) {
      query += ` AND sm.movement_type = $${params.length + 1}`;
      params.push(movement_type);
    }
    
    if (start_date) {
      query += ` AND sm.created_at >= $${params.length + 1}`;
      params.push(start_date);
    }
    
    if (end_date) {
      query += ` AND sm.created_at <= $${params.length + 1}`;
      params.push(end_date);
    }
    
    query += ' ORDER BY sm.created_at DESC LIMIT 100';
    
    const result = await pool.query(query, params);
    
    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching stock movements:', error);
    res.status(500).json({ success: false, message: 'حدث خطأ في جلب الحركات' });
  }
};

// Get inventory summary
const getInventorySummary = async (req, res) => {
  try {
    const summary = await pool.query(`
      SELECT 
        COUNT(*) as total_products,
        SUM(current_stock) as total_items,
        SUM(current_stock * unit_price) as total_value,
        COUNT(CASE WHEN current_stock <= min_stock_alert THEN 1 END) as low_stock_count
      FROM products
      WHERE is_active = true
    `);
    
    const recentMovements = await pool.query(`
      SELECT COUNT(*) as count, movement_type
      FROM stock_movements
      WHERE created_at >= NOW() - INTERVAL '30 days'
      GROUP BY movement_type
    `);
    
    const movements = {
      in: 0,
      out: 0
    };
    
    recentMovements.rows.forEach(row => {
      movements[row.movement_type] = parseInt(row.count);
    });
    
    res.json({
      success: true,
      data: {
        ...summary.rows[0],
        movements_last_30_days: movements
      }
    });
  } catch (error) {
    console.error('Error fetching inventory summary:', error);
    res.status(500).json({ success: false, message: 'حدث خطأ في جلب الملخص' });
  }
};

module.exports = {
  addStockMovement,
  getStockMovements,
  getInventorySummary
};
