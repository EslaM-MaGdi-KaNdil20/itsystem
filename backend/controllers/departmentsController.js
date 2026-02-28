const pool = require('../config/database');
const { logActivity, ACTIONS, ENTITIES } = require('./activityLogController');

// Get all departments
exports.getAll = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT d.*, 
        (SELECT COUNT(*) FROM employees e WHERE e.department_id = d.id AND e.is_active = true) as employee_count
      FROM departments d
      WHERE d.is_active = true
      ORDER BY d.name ASC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching departments:', error);
    res.status(500).json({ error: 'حدث خطأ في جلب الأقسام' });
  }
};

// Get single department
exports.getById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'SELECT * FROM departments WHERE id = $1 AND is_active = true',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'القسم غير موجود' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching department:', error);
    res.status(500).json({ error: 'حدث خطأ في جلب القسم' });
  }
};

// Create department
exports.create = async (req, res) => {
  try {
    const { name, code, location, manager_name, phone } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'اسم القسم مطلوب' });
    }
    
    const result = await pool.query(
      `INSERT INTO departments (name, code, location, manager_name, phone)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [name, code, location, manager_name, phone]
    );
    
    // Log activity
    logActivity(req, ACTIONS.CREATE, ENTITIES.DEPARTMENT, result.rows[0].id, 
      name, `تم إضافة قسم جديد: ${name}`);
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating department:', error);
    if (error.code === '23505') {
      return res.status(400).json({ error: 'كود القسم موجود مسبقاً' });
    }
    res.status(500).json({ error: 'حدث خطأ في إنشاء القسم' });
  }
};

// Update department
exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, code, location, manager_name, phone } = req.body;
    
    const result = await pool.query(
      `UPDATE departments 
       SET name = $1, code = $2, location = $3, manager_name = $4, phone = $5, updated_at = CURRENT_TIMESTAMP
       WHERE id = $6 AND is_active = true
       RETURNING *`,
      [name, code, location, manager_name, phone, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'القسم غير موجود' });
    }
    
    // Log activity
    logActivity(req, ACTIONS.UPDATE, ENTITIES.DEPARTMENT, id, 
      name, `تم تحديث بيانات القسم: ${name}`);
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating department:', error);
    if (error.code === '23505') {
      return res.status(400).json({ error: 'كود القسم موجود مسبقاً' });
    }
    res.status(500).json({ error: 'حدث خطأ في تحديث القسم' });
  }
};

// Delete department (soft delete)
exports.delete = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get department name before deletion
    const dept = await pool.query('SELECT name FROM departments WHERE id = $1', [id]);
    
    // Check if department has employees
    const empCheck = await pool.query(
      'SELECT COUNT(*) FROM employees WHERE department_id = $1 AND is_active = true',
      [id]
    );
    
    if (parseInt(empCheck.rows[0].count) > 0) {
      return res.status(400).json({ error: 'لا يمكن حذف القسم لأنه يحتوي على موظفين' });
    }
    
    const result = await pool.query(
      'UPDATE departments SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'القسم غير موجود' });
    }
    
    // Log activity
    const deptName = dept.rows[0]?.name || `قسم #${id}`;
    logActivity(req, ACTIONS.DELETE, ENTITIES.DEPARTMENT, id, 
      deptName, `تم حذف القسم: ${deptName}`);
    
    res.json({ message: 'تم حذف القسم بنجاح' });
  } catch (error) {
    console.error('Error deleting department:', error);
    res.status(500).json({ error: 'حدث خطأ في حذف القسم' });
  }
};
