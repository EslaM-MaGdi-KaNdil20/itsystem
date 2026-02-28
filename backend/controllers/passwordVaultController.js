const pool = require('../config/database');
const { logActivity, ACTIONS, ENTITIES } = require('./activityLogController');

// Get all passwords
exports.getAllPasswords = async (req, res) => {
  try {
    const { category, service_type } = req.query;
    
    let query = 'SELECT * FROM password_vault WHERE 1=1';
    const params = [];
    
    if (category) {
      params.push(category);
      query += ` AND category = $${params.length}`;
    }
    if (service_type) {
      params.push(service_type);
      query += ` AND service_type = $${params.length}`;
    }
    
    query += ' ORDER BY title ASC';
    
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching passwords:', error);
    res.status(500).json({ error: 'حدث خطأ في جلب كلمات المرور' });
  }
};

// Get password by ID
exports.getPasswordById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM password_vault WHERE id = $1', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'كلمة المرور غير موجودة' });
    }
    
    // Update last_used
    await pool.query('UPDATE password_vault SET last_used = CURRENT_TIMESTAMP WHERE id = $1', [id]);
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching password:', error);
    res.status(500).json({ error: 'حدث خطأ في جلب كلمة المرور' });
  }
};

// Create password
exports.createPassword = async (req, res) => {
  try {
    const {
      title, username, password_encrypted, url, category, service_type, notes, tags, is_favorite
    } = req.body;
    
    const result = await pool.query(`
      INSERT INTO password_vault (
        title, username, password_encrypted, url, category, service_type, notes, tags, is_favorite
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `, [
      title, username, password_encrypted, url, category, service_type, notes, tags, is_favorite || false
    ]);
    
    res.status(201).json({
      message: 'تم إضافة كلمة المرور بنجاح',
      password: result.rows[0]
    });
    
    // Log activity (don't log the password itself)
    logActivity(req, ACTIONS.CREATE, ENTITIES.PASSWORD, result.rows[0].id, 
      title, `تم إضافة بيانات اعتماد جديدة: ${title}`);
  } catch (error) {
    console.error('Error creating password:', error);
    res.status(500).json({ error: 'حدث خطأ في إضافة كلمة المرور' });
  }
};

// Update password
exports.updatePassword = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title, username, password_encrypted, url, category, service_type, notes, tags, is_favorite
    } = req.body;
    
    const result = await pool.query(`
      UPDATE password_vault SET
        title = COALESCE($1, title),
        username = COALESCE($2, username),
        password_encrypted = COALESCE($3, password_encrypted),
        url = COALESCE($4, url),
        category = COALESCE($5, category),
        service_type = COALESCE($6, service_type),
        notes = COALESCE($7, notes),
        tags = COALESCE($8, tags),
        is_favorite = COALESCE($9, is_favorite),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $10
      RETURNING *
    `, [title, username, password_encrypted, url, category, service_type, notes, tags, is_favorite, id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'كلمة المرور غير موجودة' });
    }
    
    // Log activity
    logActivity(req, ACTIONS.UPDATE, ENTITIES.PASSWORD, id, 
      result.rows[0].title, `تم تحديث بيانات الاعتماد: ${result.rows[0].title}`);
    
    res.json({ message: 'تم تحديث كلمة المرور بنجاح', password: result.rows[0] });
  } catch (error) {
    console.error('Error updating password:', error);
    res.status(500).json({ error: 'حدث خطأ في تحديث كلمة المرور' });
  }
};

// Delete password
exports.deletePassword = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get title before delete
    const pwd = await pool.query('SELECT title FROM password_vault WHERE id = $1', [id]);
    const pwdTitle = pwd.rows[0]?.title || `كلمة مرور #${id}`;
    
    await pool.query('DELETE FROM password_vault WHERE id = $1', [id]);
    
    // Log activity
    logActivity(req, ACTIONS.DELETE, ENTITIES.PASSWORD, id, 
      pwdTitle, `تم حذف بيانات الاعتماد: ${pwdTitle}`);
    
    res.json({ message: 'تم حذف كلمة المرور بنجاح' });
  } catch (error) {
    console.error('Error deleting password:', error);
    res.status(500).json({ error: 'حدث خطأ في حذف كلمة المرور' });
  }
};

// Get password stats
exports.getPasswordStats = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        COUNT(*) as total_passwords,
        COUNT(*) FILTER (WHERE is_favorite = true) as favorites,
        COUNT(DISTINCT category) as categories_count,
        COUNT(DISTINCT service_type) as service_types_count
      FROM password_vault
    `);
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching password stats:', error);
    res.status(500).json({ error: 'حدث خطأ في جلب الإحصائيات' });
  }
};

// Get categories
exports.getCategories = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT category, COUNT(*) as count
      FROM password_vault
      WHERE category IS NOT NULL
      GROUP BY category
      ORDER BY category
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ error: 'حدث خطأ في جلب التصنيفات' });
  }
};

// Toggle favorite
exports.toggleFavorite = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(`
      UPDATE password_vault SET is_favorite = NOT is_favorite, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'كلمة المرور غير موجودة' });
    }
    
    res.json({ message: 'تم تحديث المفضلة', password: result.rows[0] });
  } catch (error) {
    console.error('Error toggling favorite:', error);
    res.status(500).json({ error: 'حدث خطأ' });
  }
};
