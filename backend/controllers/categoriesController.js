const pool = require('../config/database');
const { logActivity, ACTIONS } = require('./activityLogController');

// Get all categories
const getAllCategories = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT c.*, COUNT(p.id) as products_count
      FROM categories c
      LEFT JOIN products p ON c.id = p.category_id AND p.is_active = true
      GROUP BY c.id
      ORDER BY c.name ASC
    `);
    
    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ success: false, message: 'حدث خطأ في جلب الفئات' });
  }
};

// Create category
const createCategory = async (req, res) => {
  try {
    const { name, description } = req.body;
    
    // Check if category exists
    const exists = await pool.query('SELECT id FROM categories WHERE name = $1', [name]);
    if (exists.rows.length > 0) {
      return res.status(400).json({ success: false, message: 'هذه الفئة موجودة بالفعل' });
    }
    
    const result = await pool.query(
      'INSERT INTO categories (name, description) VALUES ($1, $2) RETURNING *',
      [name, description]
    );
    
    // Log activity
    logActivity(req, ACTIONS.CREATE, 'category', result.rows[0].id, 
      name, `تم إضافة فئة جديدة: ${name}`);
    
    res.json({
      success: true,
      message: 'تم إضافة الفئة بنجاح',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error creating category:', error);
    res.status(500).json({ success: false, message: 'حدث خطأ في إضافة الفئة' });
  }
};

// Update category
const updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;
    
    const result = await pool.query(
      'UPDATE categories SET name = $1, description = $2 WHERE id = $3 RETURNING *',
      [name, description, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'الفئة غير موجودة' });
    }
    
    // Log activity
    logActivity(req, ACTIONS.UPDATE, 'category', id, 
      name, `تم تحديث الفئة: ${name}`);
    
    res.json({
      success: true,
      message: 'تم تحديث الفئة بنجاح',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating category:', error);
    res.status(500).json({ success: false, message: 'حدث خطأ في تحديث الفئة' });
  }
};

// Delete category
const deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get category name
    const cat = await pool.query('SELECT name FROM categories WHERE id = $1', [id]);
    
    // Check if category has products
    const products = await pool.query(
      'SELECT COUNT(*) FROM products WHERE category_id = $1 AND is_active = true',
      [id]
    );
    
    if (parseInt(products.rows[0].count) > 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'لا يمكن حذف الفئة لأنها تحتوي على منتجات' 
      });
    }
    
    const result = await pool.query(
      'DELETE FROM categories WHERE id = $1 RETURNING *',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'الفئة غير موجودة' });
    }
    
    // Log activity
    const catName = cat.rows[0]?.name || `فئة #${id}`;
    logActivity(req, ACTIONS.DELETE, 'category', id, 
      catName, `تم حذف الفئة: ${catName}`);
    
    res.json({
      success: true,
      message: 'تم حذف الفئة بنجاح'
    });
  } catch (error) {
    console.error('Error deleting category:', error);
    res.status(500).json({ success: false, message: 'حدث خطأ في حذف الفئة' });
  }
};

module.exports = {
  getAllCategories,
  createCategory,
  updateCategory,
  deleteCategory
};
