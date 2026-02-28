const pool = require('../config/database');
const { logActivity, ACTIONS, ENTITIES } = require('./activityLogController');

// Get all accessories
const getAll = async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM accessories WHERE is_active = true ORDER BY category, name_ar'
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'حدث خطأ في جلب البيانات' });
  }
};

// Get accessories by assignment
const getByAssignment = async (req, res) => {
  try {
    const { assignmentId } = req.params;
    const result = await pool.query(`
      SELECT aa.*, a.name, a.name_ar, a.category
      FROM assignment_accessories aa
      JOIN accessories a ON aa.accessory_id = a.id
      WHERE aa.assignment_id = $1
      ORDER BY a.category, a.name_ar
    `, [assignmentId]);
    res.json(result.rows);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'حدث خطأ في جلب البيانات' });
  }
};

// Add accessory to assignment
const addToAssignment = async (req, res) => {
  try {
    const { assignment_id, accessory_id, quantity, serial_number, condition, notes } = req.body;
    
    const result = await pool.query(`
      INSERT INTO assignment_accessories (assignment_id, accessory_id, quantity, serial_number, condition, notes)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [assignment_id, accessory_id, quantity || 1, serial_number, condition || 'good', notes]);
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'حدث خطأ في إضافة الملحق' });
  }
};

// Add multiple accessories to assignment
const addMultipleToAssignment = async (req, res) => {
  try {
    const { assignment_id, accessories } = req.body;
    
    const results = [];
    for (const acc of accessories) {
      const result = await pool.query(`
        INSERT INTO assignment_accessories (assignment_id, accessory_id, quantity, serial_number, condition, notes)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `, [assignment_id, acc.accessory_id, acc.quantity || 1, acc.serial_number, acc.condition || 'good', acc.notes]);
      results.push(result.rows[0]);
    }
    
    res.status(201).json(results);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'حدث خطأ في إضافة الملحقات' });
  }
};

// Mark accessory as returned
const markReturned = async (req, res) => {
  try {
    const { id } = req.params;
    const { returned_condition, notes } = req.body;
    
    const result = await pool.query(`
      UPDATE assignment_accessories 
      SET returned = true, returned_date = CURRENT_TIMESTAMP, returned_condition = $1, notes = COALESCE(notes || ' | ', '') || $2
      WHERE id = $3
      RETURNING *
    `, [returned_condition || 'good', notes || '', id]);
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'حدث خطأ في تحديث الملحق' });
  }
};

// Create new accessory type
const create = async (req, res) => {
  try {
    const { name, name_ar, category, description } = req.body;
    
    const result = await pool.query(`
      INSERT INTO accessories (name, name_ar, category, description)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `, [name, name_ar, category || 'general', description]);
    
    // Log activity
    logActivity(req, ACTIONS.CREATE, ENTITIES.ACCESSORY, result.rows[0].id, 
      name_ar || name, `تم إضافة نوع ملحق جديد: ${name_ar || name}`);
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'حدث خطأ في إضافة الملحق' });
  }
};

// Update accessory type
const update = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, name_ar, category, description, is_active } = req.body;
    
    const result = await pool.query(`
      UPDATE accessories 
      SET name = $1, name_ar = $2, category = $3, description = $4, is_active = $5
      WHERE id = $6
      RETURNING *
    `, [name, name_ar, category, description, is_active, id]);
    
    // Log activity
    logActivity(req, ACTIONS.UPDATE, ENTITIES.ACCESSORY, id, 
      name_ar || name, `تم تحديث نوع الملحق: ${name_ar || name}`);
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'حدث خطأ في تحديث الملحق' });
  }
};

// Delete accessory from assignment
const removeFromAssignment = async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM assignment_accessories WHERE id = $1', [id]);
    res.json({ message: 'تم الحذف بنجاح' });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'حدث خطأ في الحذف' });
  }
};

module.exports = {
  getAll,
  getByAssignment,
  addToAssignment,
  addMultipleToAssignment,
  markReturned,
  create,
  update,
  removeFromAssignment
};
