const pool = require('../config/database');
const path = require('path');
const fs = require('fs');

// Get all guides
exports.getAll = async (req, res) => {
  try {
    const { category, search } = req.query;
    
    let query = `
      SELECT g.*, 
             COUNT(s.id) as steps_count
      FROM user_guides g
      LEFT JOIN guide_steps s ON g.id = s.guide_id
      WHERE 1=1
    `;
    
    const params = [];
    let paramIndex = 1;
    
    if (category) {
      query += ` AND g.category = $${paramIndex}`;
      params.push(category);
      paramIndex++;
    }
    
    if (search) {
      query += ` AND (g.title ILIKE $${paramIndex} OR g.description ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }
    
    query += ' GROUP BY g.id ORDER BY g.created_at DESC';
    
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching guides:', error);
    res.status(500).json({ error: 'حدث خطأ في جلب الأدلة' });
  }
};

// Get guide by ID with steps
exports.getById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const guideResult = await pool.query('SELECT * FROM user_guides WHERE id = $1', [id]);
    if (guideResult.rows.length === 0) {
      return res.status(404).json({ error: 'الدليل غير موجود' });
    }
    
    const stepsResult = await pool.query(
      'SELECT * FROM guide_steps WHERE guide_id = $1 ORDER BY step_number',
      [id]
    );
    
    res.json({
      ...guideResult.rows[0],
      steps: stepsResult.rows
    });
  } catch (error) {
    console.error('Error fetching guide:', error);
    res.status(500).json({ error: 'حدث خطأ في جلب الدليل' });
  }
};

// Create new guide
exports.create = async (req, res) => {
  try {
    const { title, category, description, created_by } = req.body;
    
    const result = await pool.query(
      `INSERT INTO user_guides (title, category, description, created_by) 
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [title, category, description, created_by]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating guide:', error);
    res.status(500).json({ error: 'حدث خطأ في إنشاء الدليل' });
  }
};

// Update guide
exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, category, description } = req.body;
    
    const result = await pool.query(
      `UPDATE user_guides 
       SET title = $1, category = $2, description = $3, updated_at = CURRENT_TIMESTAMP
       WHERE id = $4 RETURNING *`,
      [title, category, description, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'الدليل غير موجود' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating guide:', error);
    res.status(500).json({ error: 'حدث خطأ في تحديث الدليل' });
  }
};

// Delete guide
exports.delete = async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query('DELETE FROM user_guides WHERE id = $1 RETURNING *', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'الدليل غير موجود' });
    }
    
    res.json({ message: 'تم حذف الدليل بنجاح' });
  } catch (error) {
    console.error('Error deleting guide:', error);
    res.status(500).json({ error: 'حدث خطأ في حذف الدليل' });
  }
};

// Add step to guide
exports.addStep = async (req, res) => {
  try {
    const { guide_id, step_number, title, description, image_path, notes } = req.body;
    
    const result = await pool.query(
      `INSERT INTO guide_steps (guide_id, step_number, title, description, image_path, notes)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [guide_id, step_number, title, description, image_path, notes]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error adding step:', error);
    res.status(500).json({ error: 'حدث خطأ في إضافة الخطوة' });
  }
};

// Update step
exports.updateStep = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, image_path, notes } = req.body;
    
    const result = await pool.query(
      `UPDATE guide_steps 
       SET title = $1, description = $2, image_path = $3, notes = $4
       WHERE id = $5 RETURNING *`,
      [title, description, image_path, notes, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'الخطوة غير موجودة' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating step:', error);
    res.status(500).json({ error: 'حدث خطأ في تحديث الخطوة' });
  }
};

// Delete step
exports.deleteStep = async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query('DELETE FROM guide_steps WHERE id = $1 RETURNING *', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'الخطوة غير موجودة' });
    }
    
    res.json({ message: 'تم حذف الخطوة بنجاح' });
  } catch (error) {
    console.error('Error deleting step:', error);
    res.status(500).json({ error: 'حدث خطأ في حذف الخطوة' });
  }
};

// Get statistics
exports.getStats = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        COUNT(*) as total_guides,
        COUNT(DISTINCT category) as categories_count,
        category,
        COUNT(*) as count
      FROM user_guides
      GROUP BY category
    `);
    
    const totalResult = await pool.query('SELECT COUNT(*) as total FROM user_guides');
    
    res.json({
      total: totalResult.rows[0].total,
      by_category: result.rows
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'حدث خطأ في جلب الإحصائيات' });
  }
};
