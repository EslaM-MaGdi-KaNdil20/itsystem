const pool = require('../config/database');
const { logActivity, ACTIONS, ENTITIES } = require('./activityLogController');

// Get all employees
exports.getAll = async (req, res) => {
  try {
    const { department_id } = req.query;
    
    let query = `
      SELECT e.*, d.name as department_name,
        (SELECT COUNT(*) FROM device_assignments da WHERE da.employee_id = e.id AND da.is_current = true) as device_count
      FROM employees e
      LEFT JOIN departments d ON e.department_id = d.id
      WHERE e.is_active = true
    `;
    
    const params = [];
    if (department_id) {
      query += ' AND e.department_id = $1';
      params.push(department_id);
    }
    
    query += ' ORDER BY e.full_name ASC';
    
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching employees:', error);
    res.status(500).json({ error: 'حدث خطأ في جلب الموظفين' });
  }
};

// Get single employee
exports.getById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(`
      SELECT e.*, d.name as department_name
      FROM employees e
      LEFT JOIN departments d ON e.department_id = d.id
      WHERE e.id = $1 AND e.is_active = true
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'الموظف غير موجود' });
    }
    
    // Get assigned devices
    const devices = await pool.query(`
      SELECT da.*, d.asset_tag, d.brand, d.model, d.serial_number, dt.name as device_type, dt.name_ar as device_type_ar
      FROM device_assignments da
      JOIN devices d ON da.device_id = d.id
      JOIN device_types dt ON d.device_type_id = dt.id
      WHERE da.employee_id = $1 AND da.is_current = true
    `, [id]);
    
    res.json({
      ...result.rows[0],
      assigned_devices: devices.rows
    });
  } catch (error) {
    console.error('Error fetching employee:', error);
    res.status(500).json({ error: 'حدث خطأ في جلب الموظف' });
  }
};

// Create employee
exports.create = async (req, res) => {
  try {
    const { 
      employee_code, full_name, department_id, job_title, 
      email, phone, extension, hire_date, notes 
    } = req.body;
    
    if (!full_name) {
      return res.status(400).json({ error: 'اسم الموظف مطلوب' });
    }
    
    const result = await pool.query(
      `INSERT INTO employees (employee_code, full_name, department_id, job_title, email, phone, extension, hire_date, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [employee_code, full_name, department_id || null, job_title, email, phone, extension, hire_date || null, notes]
    );
    
    res.status(201).json(result.rows[0]);
    
    // Log activity
    logActivity(req, ACTIONS.CREATE, ENTITIES.EMPLOYEE, result.rows[0].id, 
      full_name, 
      `تم إضافة موظف جديد: ${full_name}`);
  } catch (error) {
    console.error('Error creating employee:', error);
    if (error.code === '23505') {
      return res.status(400).json({ error: 'كود الموظف موجود مسبقاً' });
    }
    res.status(500).json({ error: 'حدث خطأ في إنشاء الموظف' });
  }
};

// Update employee
exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      employee_code, full_name, department_id, job_title, 
      email, phone, extension, hire_date, notes 
    } = req.body;
    
    const result = await pool.query(
      `UPDATE employees 
       SET employee_code = $1, full_name = $2, department_id = $3, job_title = $4, 
           email = $5, phone = $6, extension = $7, hire_date = $8, notes = $9,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $10 AND is_active = true
       RETURNING *`,
      [employee_code, full_name, department_id || null, job_title, email, phone, extension, hire_date || null, notes, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'الموظف غير موجود' });
    }
    
    // Log activity
    logActivity(req, ACTIONS.UPDATE, ENTITIES.EMPLOYEE, id, 
      full_name, 
      `تم تعديل بيانات الموظف: ${full_name}`);
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating employee:', error);
    if (error.code === '23505') {
      return res.status(400).json({ error: 'كود الموظف موجود مسبقاً' });
    }
    res.status(500).json({ error: 'حدث خطأ في تحديث الموظف' });
  }
};

// Delete employee (soft delete)
exports.delete = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if employee has assigned devices
    const deviceCheck = await pool.query(
      'SELECT COUNT(*) FROM device_assignments WHERE employee_id = $1 AND is_current = true',
      [id]
    );
    
    if (parseInt(deviceCheck.rows[0].count) > 0) {
      return res.status(400).json({ error: 'لا يمكن حذف الموظف لأن لديه أجهزة مسلمة' });
    }
    
    const result = await pool.query(
      'UPDATE employees SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'الموظف غير موجود' });
    }
    
    // Log activity
    const employee = result.rows[0];
    logActivity(req, ACTIONS.DELETE, ENTITIES.EMPLOYEE, id, 
      employee.full_name, 
      `تم حذف الموظف: ${employee.full_name}`);
    
    res.json({ message: 'تم حذف الموظف بنجاح' });
  } catch (error) {
    console.error('Error deleting employee:', error);
    res.status(500).json({ error: 'حدث خطأ في حذف الموظف' });
  }
};

// Get employee profile (full details)
exports.getProfile = async (req, res) => {
  const { id } = req.params;
  try {
    // Employee details + department
    const empResult = await pool.query(`
      SELECT e.*, d.name as department_name
      FROM employees e
      LEFT JOIN departments d ON e.department_id = d.id
      WHERE e.id = $1
    `, [id]);

    if (empResult.rows.length === 0) {
      return res.status(404).json({ error: 'الموظف غير موجود' });
    }

    // Assigned devices
    const devicesResult = await pool.query(`
      SELECT
        da.id as assignment_id,
        da.assigned_date, da.returned_date, da.is_current,
        da.windows_username, da.notes as assignment_notes,
        d.id as device_id, d.brand, d.model, d.asset_tag, d.serial_number,
        d.os, d.status, d.condition,
        dt.name as device_type
      FROM device_assignments da
      JOIN devices d ON da.device_id = d.id
      LEFT JOIN device_types dt ON d.device_type_id = dt.id
      WHERE da.employee_id = $1
      ORDER BY da.assigned_date DESC
    `, [id]);

    // Support tickets (if tickets table has requester_id or similar)
    let ticketsResult = { rows: [] };
    try {
      ticketsResult = await pool.query(`
        SELECT id, title, status, priority, created_at, category
        FROM tickets
        WHERE requester_id = $1
        ORDER BY created_at DESC
        LIMIT 10
      `, [id]);
    } catch(_) {}

    // Tasks assigned to employee's user account
    let tasksResult = { rows: [] };
    try {
      tasksResult = await pool.query(`
        SELECT t.id, t.title, t.status, t.priority, t.due_date, t.created_at,
          u.full_name as assigned_to_name
        FROM tasks t
        LEFT JOIN users u ON t.assigned_to = u.id
        WHERE t.related_type = 'employee' AND t.related_id = $1
        ORDER BY t.created_at DESC
        LIMIT 10
      `, [id]);
    } catch(_) {}

    // Maintenance on their devices
    const maintenanceResult = await pool.query(`
      SELECT COUNT(mr.id)::int as maintenance_count
      FROM maintenance_records mr
      JOIN device_assignments da ON mr.device_id = da.device_id
      WHERE da.employee_id = $1
    `, [id]);

    res.json({
      employee: empResult.rows[0],
      devices: devicesResult.rows,
      tickets: ticketsResult.rows,
      tasks: tasksResult.rows,
      maintenance_count: maintenanceResult.rows[0]?.maintenance_count || 0,
    });
  } catch (error) {
    console.error('Error fetching employee profile:', error);
    res.status(500).json({ error: 'حدث خطأ في جلب بيانات الموظف' });
  }
};


// Get employee profile with devices, tasks, tickets
exports.getProfile = async (req, res) => {
  const { id } = req.params;
  try {
    // Employee info
    const empResult = await pool.query(`
      SELECT e.*, d.name as department_name
      FROM employees e
      LEFT JOIN departments d ON e.department_id = d.id
      WHERE e.id = $1
    `, [id]);

    if (empResult.rows.length === 0) {
      return res.status(404).json({ error: 'الموظف غير موجود' });
    }

    // Devices (all assignments)
    const devicesResult = await pool.query(`
      SELECT
        da.id as assignment_id, da.assigned_date, da.returned_date, da.is_current,
        da.windows_username, da.email_account,
        d.id, d.brand, d.model, d.asset_tag, d.serial_number, d.os,
        d.status, d.ip_address,
        dt.name as device_type
      FROM device_assignments da
      JOIN devices d ON da.device_id = d.id
      LEFT JOIN device_types dt ON d.device_type_id = dt.id
      WHERE da.employee_id = $1
      ORDER BY da.is_current DESC, da.assigned_date DESC
    `, [id]);

    // Tasks assigned to user linked to this employee (via users.email = employees.email)
    const tasksResult = await pool.query(`
      SELECT t.id, t.title, t.status, t.priority, t.due_date
      FROM tasks t
      JOIN users u ON t.assigned_to = u.id
      JOIN employees e ON e.email = u.email
      WHERE e.id = $1
      ORDER BY t.created_at DESC
      LIMIT 20
    `, [id]);

    // Tickets submitted by email
    const ticketsResult = await pool.query(`
      SELECT t.id, t.title, t.status, t.priority, t.created_at, t.category
      FROM tickets t
      JOIN employees e ON LOWER(e.email) = LOWER(t.requester_email)
      WHERE e.id = $1
      ORDER BY t.created_at DESC
      LIMIT 20
    `, [id]).catch(() => ({ rows: [] }));

    // Count maintenance for employee's devices
    const mCount = await pool.query(`
      SELECT COUNT(mr.id) as count
      FROM maintenance_records mr
      JOIN device_assignments da ON mr.device_id = da.device_id
      WHERE da.employee_id = $1
    `, [id]);

    res.json({
      employee: empResult.rows[0],
      devices: devicesResult.rows,
      tasks: tasksResult.rows,
      tickets: ticketsResult.rows,
      maintenance_count: parseInt(mCount.rows[0]?.count || 0),
    });
  } catch (error) {
    console.error('Error fetching employee profile:', error);
    res.status(500).json({ error: 'حدث خطأ في جلب ملف الموظف' });
  }
};
