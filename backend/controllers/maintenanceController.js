const pool = require('../config/database');
const { logActivity, ACTIONS, ENTITIES } = require('./activityLogController');

// Get all maintenance records
exports.getAll = async (req, res) => {
  try {
    const { device_id, status, start_date, end_date } = req.query;
    
    let query = `
      SELECT m.*, d.asset_tag, d.brand, d.model, d.serial_number, dt.name as device_type, dt.name_ar as device_type_ar
      FROM maintenance_records m
      JOIN devices d ON m.device_id = d.id
      JOIN device_types dt ON d.device_type_id = dt.id
      WHERE 1=1
    `;
    
    const params = [];
    let paramIndex = 1;
    
    if (device_id) {
      query += ` AND m.device_id = $${paramIndex}`;
      params.push(device_id);
      paramIndex++;
    }
    
    if (status) {
      query += ` AND m.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }
    
    if (start_date) {
      query += ` AND m.start_date >= $${paramIndex}`;
      params.push(start_date);
      paramIndex++;
    }
    
    if (end_date) {
      query += ` AND m.start_date <= $${paramIndex}`;
      params.push(end_date);
      paramIndex++;
    }
    
    query += ' ORDER BY m.created_at DESC';
    
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching maintenance records:', error);
    res.status(500).json({ error: 'حدث خطأ في جلب سجلات الصيانة' });
  }
};

// Get single maintenance record
exports.getById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(`
      SELECT m.*, d.asset_tag, d.brand, d.model, d.serial_number, dt.name as device_type, dt.name_ar as device_type_ar
      FROM maintenance_records m
      JOIN devices d ON m.device_id = d.id
      JOIN device_types dt ON d.device_type_id = dt.id
      WHERE m.id = $1
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'سجل الصيانة غير موجود' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching maintenance record:', error);
    res.status(500).json({ error: 'حدث خطأ في جلب سجل الصيانة' });
  }
};

// Create maintenance record
exports.create = async (req, res) => {
  try {
    const { device_id, maintenance_type, description, start_date, performed_by, cost, notes } = req.body;
    
    if (!device_id) {
      return res.status(400).json({ error: 'الجهاز مطلوب' });
    }
    
    // Update device status to maintenance
    await pool.query(
      'UPDATE devices SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      ['maintenance', device_id]
    );
    
    const result = await pool.query(
      `INSERT INTO maintenance_records (device_id, maintenance_type, description, start_date, performed_by, cost, notes, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'in_progress')
       RETURNING *`,
      [device_id, maintenance_type, description, start_date || new Date(), performed_by, cost, notes]
    );
    
    res.status(201).json(result.rows[0]);
    
    // Log activity
    const deviceInfo = await pool.query('SELECT asset_tag, brand, model FROM devices WHERE id = $1', [device_id]);
    const deviceName = deviceInfo.rows[0] ? `${deviceInfo.rows[0].brand} ${deviceInfo.rows[0].model} - ${deviceInfo.rows[0].asset_tag}` : `جهاز #${device_id}`;
    logActivity(req, ACTIONS.CREATE, ENTITIES.MAINTENANCE, result.rows[0].id, 
      deviceName, 
      `تم إنشاء طلب صيانة: ${maintenance_type || 'صيانة'} - ${description || ''}`);
  } catch (error) {
    console.error('Error creating maintenance record:', error);
    res.status(500).json({ error: 'حدث خطأ في إنشاء سجل الصيانة' });
  }
};

// Update maintenance record
exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const { maintenance_type, description, start_date, end_date, performed_by, cost, status, notes } = req.body;
    
    const result = await pool.query(
      `UPDATE maintenance_records SET
        maintenance_type = $1, description = $2, start_date = $3, end_date = $4,
        performed_by = $5, cost = $6, status = $7, notes = $8, updated_at = CURRENT_TIMESTAMP
       WHERE id = $9
       RETURNING *`,
      [maintenance_type, description, start_date, end_date || null, performed_by, cost, status, notes, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'سجل الصيانة غير موجود' });
    }
    
    // If completed, update device status back to available
    if (status === 'completed') {
      const maintenance = result.rows[0];
      
      // Check if device has current assignment
      const assignmentCheck = await pool.query(
        'SELECT COUNT(*) FROM device_assignments WHERE device_id = $1 AND is_current = true',
        [maintenance.device_id]
      );
      
      const newStatus = parseInt(assignmentCheck.rows[0].count) > 0 ? 'assigned' : 'available';
      
      await pool.query(
        'UPDATE devices SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [newStatus, maintenance.device_id]
      );
    }
    
    // Log activity
    const deviceInfo = await pool.query('SELECT asset_tag, brand, model FROM devices WHERE id = $1', [result.rows[0].device_id]);
    const deviceName = deviceInfo.rows[0] ? `${deviceInfo.rows[0].brand} ${deviceInfo.rows[0].model} - ${deviceInfo.rows[0].asset_tag}` : `جهاز #${result.rows[0].device_id}`;
    logActivity(req, ACTIONS.UPDATE, ENTITIES.MAINTENANCE, id, 
      deviceName, 
      status === 'completed' ? `تم إنهاء الصيانة: ${maintenance_type || 'صيانة'}` : `تم تحديث طلب صيانة: ${maintenance_type || 'صيانة'}`);
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating maintenance record:', error);
    res.status(500).json({ error: 'حدث خطأ في تحديث سجل الصيانة' });
  }
};

// Delete maintenance record
exports.delete = async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(
      'DELETE FROM maintenance_records WHERE id = $1 RETURNING *',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'سجل الصيانة غير موجود' });
    }
    
    // Log activity
    const deviceInfo = await pool.query('SELECT asset_tag, brand, model FROM devices WHERE id = $1', [result.rows[0].device_id]);
    const deviceName = deviceInfo.rows[0] ? `${deviceInfo.rows[0].brand} ${deviceInfo.rows[0].model} - ${deviceInfo.rows[0].asset_tag}` : `جهاز #${result.rows[0].device_id}`;
    logActivity(req, ACTIONS.DELETE, ENTITIES.MAINTENANCE, id, 
      deviceName, 
      `تم حذف سجل صيانة`);
    
    res.json({ message: 'تم حذف سجل الصيانة بنجاح' });
  } catch (error) {
    console.error('Error deleting maintenance record:', error);
    res.status(500).json({ error: 'حدث خطأ في حذف سجل الصيانة' });
  }
};

// Get maintenance stats
exports.getStats = async (req, res) => {
  try {
    const { month, year } = req.query;
    
    let dateFilter = '';
    const params = [];
    
    if (month && year) {
      dateFilter = 'AND EXTRACT(MONTH FROM m.start_date) = $1 AND EXTRACT(YEAR FROM m.start_date) = $2';
      params.push(month, year);
    } else if (year) {
      dateFilter = 'AND EXTRACT(YEAR FROM m.start_date) = $1';
      params.push(year);
    }
    
    // By status
    const byStatus = await pool.query(`
      SELECT status, COUNT(*) as count
      FROM maintenance_records m
      WHERE 1=1 ${dateFilter}
      GROUP BY status
    `, params);
    
    // By type
    const byType = await pool.query(`
      SELECT maintenance_type, COUNT(*) as count, SUM(COALESCE(cost, 0)) as total_cost
      FROM maintenance_records m
      WHERE 1=1 ${dateFilter}
      GROUP BY maintenance_type
    `, params);
    
    // By device type
    const byDeviceType = await pool.query(`
      SELECT dt.name, dt.name_ar, COUNT(m.id) as count
      FROM maintenance_records m
      JOIN devices d ON m.device_id = d.id
      JOIN device_types dt ON d.device_type_id = dt.id
      WHERE 1=1 ${dateFilter}
      GROUP BY dt.id, dt.name, dt.name_ar
    `, params);
    
    // Total stats
    const totals = await pool.query(`
      SELECT 
        COUNT(*) as total_records,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
        COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as in_progress,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
        SUM(COALESCE(cost, 0)) as total_cost
      FROM maintenance_records m
      WHERE 1=1 ${dateFilter}
    `, params);
    
    res.json({
      by_status: byStatus.rows,
      by_type: byType.rows,
      by_device_type: byDeviceType.rows,
      totals: totals.rows[0]
    });
  } catch (error) {
    console.error('Error fetching maintenance stats:', error);
    res.status(500).json({ error: 'حدث خطأ في جلب إحصائيات الصيانة' });
  }
};

// Get monthly report
exports.getMonthlyReport = async (req, res) => {
  try {
    const { month, year } = req.query;
    
    if (!month || !year) {
      return res.status(400).json({ error: 'الشهر والسنة مطلوبان' });
    }
    
    const records = await pool.query(`
      SELECT m.*, d.asset_tag, d.brand, d.model, dt.name_ar as device_type
      FROM maintenance_records m
      JOIN devices d ON m.device_id = d.id
      JOIN device_types dt ON d.device_type_id = dt.id
      WHERE EXTRACT(MONTH FROM m.start_date) = $1 AND EXTRACT(YEAR FROM m.start_date) = $2
      ORDER BY m.start_date ASC
    `, [month, year]);
    
    const stats = await pool.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
        SUM(COALESCE(cost, 0)) as total_cost
      FROM maintenance_records
      WHERE EXTRACT(MONTH FROM start_date) = $1 AND EXTRACT(YEAR FROM start_date) = $2
    `, [month, year]);
    
    res.json({
      records: records.rows,
      stats: stats.rows[0]
    });
  } catch (error) {
    console.error('Error fetching monthly report:', error);
    res.status(500).json({ error: 'حدث خطأ في جلب التقرير الشهري' });
  }
};
