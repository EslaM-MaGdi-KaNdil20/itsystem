const pool = require('../config/database');
const { logActivity, ACTIONS, ENTITIES } = require('./activityLogController');

// Get device types
// ── Public device info (no auth) ─────────────────────────────────────────────
exports.getPublicInfo = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(`
      SELECT d.id, d.brand, d.model, d.asset_tag, d.serial_number,
             d.status, d.purchase_date, d.warranty_end, d.location, d.notes,
             dt.name_ar AS device_type_ar, dt.icon
      FROM devices d
      JOIN device_types dt ON d.device_type_id = dt.id
      WHERE d.id = $1 AND d.is_active = true
    `, [id]);

    if (!result.rows.length) return res.status(404).json({ error: 'الجهاز غير موجود' });

    const assignment = await pool.query(`
      SELECT da.assigned_date, da.windows_username,
             e.full_name AS employee_name, e.job_title,
             dep.name AS department_name
      FROM device_assignments da
      JOIN employees e ON da.employee_id = e.id
      LEFT JOIN departments dep ON e.department_id = dep.id
      WHERE da.device_id = $1 AND da.is_current = true
    `, [id]);

    const licenses = await pool.query(`
      SELECT l.name, l.vendor, l.type, l.key_type,
             la.license_key, la.assigned_date
      FROM license_assignments la
      JOIN licenses l ON la.license_id = l.id
      WHERE la.device_id = $1 AND la.is_current = true
      ORDER BY l.type, l.name
    `, [id]);

    const maintenance = await pool.query(`
      SELECT maintenance_type AS type, description, status, start_date, end_date
      FROM maintenance_records
      WHERE device_id = $1
      ORDER BY start_date DESC
      LIMIT 5
    `, [id]);

    res.json({
      ...result.rows[0],
      current_assignment: assignment.rows[0] || null,
      licenses: licenses.rows,
      recent_maintenance: maintenance.rows
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'حدث خطأ' });
  }
};

exports.getDeviceTypes = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM device_types ORDER BY id ASC');
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching device types:', error);
    res.status(500).json({ error: 'حدث خطأ في جلب أنواع الأجهزة' });
  }
};

// Get all devices
exports.getAll = async (req, res) => {
  try {
    const { device_type_id, status } = req.query;
    
    let query = `
      SELECT d.*, dt.name as device_type, dt.name_ar as device_type_ar, dt.icon,
        (SELECT e.full_name FROM device_assignments da 
         JOIN employees e ON da.employee_id = e.id 
         WHERE da.device_id = d.id AND da.is_current = true LIMIT 1) as assigned_to
      FROM devices d
      JOIN device_types dt ON d.device_type_id = dt.id
      WHERE d.is_active = true
    `;
    
    const params = [];
    let paramIndex = 1;
    
    if (device_type_id) {
      query += ` AND d.device_type_id = $${paramIndex}`;
      params.push(device_type_id);
      paramIndex++;
    }
    
    if (status) {
      query += ` AND d.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }
    
    query += ' ORDER BY d.created_at DESC';
    
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching devices:', error);
    res.status(500).json({ error: 'حدث خطأ في جلب الأجهزة' });
  }
};

// Get single device
exports.getById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(`
      SELECT d.*, dt.name as device_type, dt.name_ar as device_type_ar, dt.icon
      FROM devices d
      JOIN device_types dt ON d.device_type_id = dt.id
      WHERE d.id = $1 AND d.is_active = true
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'الجهاز غير موجود' });
    }
    
    // Get current assignment
    const assignment = await pool.query(`
      SELECT da.*, e.full_name as employee_name, e.employee_code, dep.name as department_name
      FROM device_assignments da
      JOIN employees e ON da.employee_id = e.id
      LEFT JOIN departments dep ON e.department_id = dep.id
      WHERE da.device_id = $1 AND da.is_current = true
    `, [id]);
    
    // Get assignment history
    const history = await pool.query(`
      SELECT da.*, e.full_name as employee_name
      FROM device_assignments da
      JOIN employees e ON da.employee_id = e.id
      WHERE da.device_id = $1
      ORDER BY da.assigned_date DESC
    `, [id]);
    
    // Get maintenance records
    const maintenance = await pool.query(`
      SELECT * FROM maintenance_records
      WHERE device_id = $1
      ORDER BY start_date DESC
    `, [id]);
    
    res.json({
      ...result.rows[0],
      current_assignment: assignment.rows[0] || null,
      assignment_history: history.rows,
      maintenance_records: maintenance.rows
    });
  } catch (error) {
    console.error('Error fetching device:', error);
    res.status(500).json({ error: 'حدث خطأ في جلب الجهاز' });
  }
};

// Create device
exports.create = async (req, res) => {
  try {
    const { 
      device_type_id, asset_tag, brand, model, serial_number,
      cpu, ram, storage, os, ip_address, mac_address,
      purchase_date, warranty_end, purchase_price, supplier,
      status, condition, location, notes
    } = req.body;
    
    if (!device_type_id) {
      return res.status(400).json({ error: 'نوع الجهاز مطلوب' });
    }
    
    const result = await pool.query(
      `INSERT INTO devices (
        device_type_id, asset_tag, brand, model, serial_number,
        cpu, ram, storage, os, ip_address, mac_address,
        purchase_date, warranty_end, purchase_price, supplier,
        status, condition, location, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
       RETURNING *`,
      [
        device_type_id, asset_tag, brand, model, serial_number,
        cpu, ram, storage, os, ip_address, mac_address,
        purchase_date || null, warranty_end || null, purchase_price || null, supplier,
        status || 'available', condition || 'good', location, notes
      ]
    );
    
    res.status(201).json(result.rows[0]);
    
    // Log activity
    logActivity(req, ACTIONS.CREATE, ENTITIES.DEVICE, result.rows[0].id, 
      `${brand || ''} ${model || ''} - ${asset_tag || 'بدون رقم'}`, 
      `تم إضافة جهاز جديد`);
  } catch (error) {
    console.error('Error creating device:', error);
    if (error.code === '23505') {
      return res.status(400).json({ error: 'رقم الأصل (Asset Tag) موجود مسبقاً' });
    }
    res.status(500).json({ error: 'حدث خطأ في إنشاء الجهاز' });
  }
};

// Update device
exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      device_type_id, asset_tag, brand, model, serial_number,
      cpu, ram, storage, os, ip_address, mac_address,
      purchase_date, warranty_end, purchase_price, supplier,
      status, condition, location, notes
    } = req.body;
    
    const result = await pool.query(
      `UPDATE devices SET
        device_type_id = $1, asset_tag = $2, brand = $3, model = $4, serial_number = $5,
        cpu = $6, ram = $7, storage = $8, os = $9, ip_address = $10, mac_address = $11,
        purchase_date = $12, warranty_end = $13, purchase_price = $14, supplier = $15,
        status = $16, condition = $17, location = $18, notes = $19, updated_at = CURRENT_TIMESTAMP
       WHERE id = $20 AND is_active = true
       RETURNING *`,
      [
        device_type_id, asset_tag, brand, model, serial_number,
        cpu, ram, storage, os, ip_address, mac_address,
        purchase_date || null, warranty_end || null, purchase_price || null, supplier,
        status, condition, location, notes, id
      ]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'الجهاز غير موجود' });
    }
    
    // Log activity
    logActivity(req, ACTIONS.UPDATE, ENTITIES.DEVICE, id, 
      `${brand || ''} ${model || ''} - ${asset_tag || 'بدون رقم'}`, 
      `تم تعديل بيانات الجهاز`);
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating device:', error);
    if (error.code === '23505') {
      return res.status(400).json({ error: 'رقم الأصل (Asset Tag) موجود مسبقاً' });
    }
    res.status(500).json({ error: 'حدث خطأ في تحديث الجهاز' });
  }
};

// Delete device (soft delete)
exports.delete = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if device is assigned
    const assignmentCheck = await pool.query(
      'SELECT COUNT(*) FROM device_assignments WHERE device_id = $1 AND is_current = true',
      [id]
    );
    
    if (parseInt(assignmentCheck.rows[0].count) > 0) {
      return res.status(400).json({ error: 'لا يمكن حذف الجهاز لأنه مسلم لموظف' });
    }
    
    const result = await pool.query(
      'UPDATE devices SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'الجهاز غير موجود' });
    }
    
    // Log activity
    const device = result.rows[0];
    logActivity(req, ACTIONS.DELETE, ENTITIES.DEVICE, id, 
      `${device.brand || ''} ${device.model || ''} - ${device.asset_tag || 'بدون رقم'}`, 
      `تم حذف الجهاز`);
    
    res.json({ message: 'تم حذف الجهاز بنجاح' });
  } catch (error) {
    console.error('Error deleting device:', error);
    res.status(500).json({ error: 'حدث خطأ في حذف الجهاز' });
  }
};

// Assign device to employee
exports.assignDevice = async (req, res) => {
  try {
    const { device_id, employee_id, windows_username, windows_password, email_account, email_password, assigned_by, notes } = req.body;
    
    // Check if device exists and is available
    const deviceCheck = await pool.query(
      'SELECT * FROM devices WHERE id = $1 AND is_active = true',
      [device_id]
    );
    
    if (deviceCheck.rows.length === 0) {
      return res.status(404).json({ error: 'الجهاز غير موجود' });
    }
    
    if (deviceCheck.rows[0].status === 'assigned') {
      return res.status(400).json({ error: 'الجهاز مسلم لموظف آخر' });
    }
    
    // Create assignment
    const result = await pool.query(
      `INSERT INTO device_assignments (device_id, employee_id, windows_username, windows_password, email_account, email_password, assigned_by, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [device_id, employee_id, windows_username, windows_password, email_account, email_password, assigned_by, notes]
    );
    
    // Update device status
    await pool.query(
      'UPDATE devices SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      ['assigned', device_id]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error assigning device:', error);
    res.status(500).json({ error: 'حدث خطأ في تسليم الجهاز' });
  }
};

// Return device
exports.returnDevice = async (req, res) => {
  try {
    const { assignment_id, notes } = req.body;
    
    // Get assignment
    const assignment = await pool.query(
      'SELECT * FROM device_assignments WHERE id = $1 AND is_current = true',
      [assignment_id]
    );
    
    if (assignment.rows.length === 0) {
      return res.status(404).json({ error: 'التسليم غير موجود' });
    }
    
    // Update assignment
    await pool.query(
      `UPDATE device_assignments SET is_current = false, returned_date = CURRENT_DATE, 
       notes = COALESCE(notes, '') || $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2`,
      [notes ? '\n' + notes : '', assignment_id]
    );
    
    // Update device status
    await pool.query(
      'UPDATE devices SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      ['available', assignment.rows[0].device_id]
    );
    
    res.json({ message: 'تم استرجاع الجهاز بنجاح' });
  } catch (error) {
    console.error('Error returning device:', error);
    res.status(500).json({ error: 'حدث خطأ في استرجاع الجهاز' });
  }
};

// Get device stats
exports.getStats = async (req, res) => {
  try {
    // Total devices by type
    const byType = await pool.query(`
      SELECT dt.name, dt.name_ar, COUNT(d.id) as count
      FROM device_types dt
      LEFT JOIN devices d ON dt.id = d.device_type_id AND d.is_active = true
      GROUP BY dt.id, dt.name, dt.name_ar
      ORDER BY count DESC
    `);
    
    // Devices by status
    const byStatus = await pool.query(`
      SELECT status, COUNT(*) as count
      FROM devices
      WHERE is_active = true
      GROUP BY status
    `);
    
    // Total stats
    const totals = await pool.query(`
      SELECT 
        COUNT(*) as total_devices,
        COUNT(CASE WHEN status = 'available' THEN 1 END) as available,
        COUNT(CASE WHEN status = 'assigned' THEN 1 END) as assigned,
        COUNT(CASE WHEN status = 'maintenance' THEN 1 END) as in_maintenance
      FROM devices
      WHERE is_active = true
    `);
    
    res.json({
      by_type: byType.rows,
      by_status: byStatus.rows,
      totals: totals.rows[0]
    });
  } catch (error) {
    console.error('Error fetching device stats:', error);
    res.status(500).json({ error: 'حدث خطأ في جلب الإحصائيات' });
  }
};

// Export devices to Excel
const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');
const path = require('path');

exports.exportToExcel = async (req, res) => {
  try {
    const { device_type_id, status } = req.query;
    
    let query = `
      SELECT d.*, dt.name as device_type, dt.name_ar as device_type_ar,
        (SELECT e.full_name FROM device_assignments da 
         JOIN employees e ON da.employee_id = e.id 
         WHERE da.device_id = d.id AND da.is_current = true LIMIT 1) as assigned_to
      FROM devices d
      JOIN device_types dt ON d.device_type_id = dt.id
      WHERE d.is_active = true
    `;
    
    const params = [];
    let paramIndex = 1;
    
    if (device_type_id) {
      query += ` AND d.device_type_id = $${paramIndex}`;
      params.push(device_type_id);
      paramIndex++;
    }
    
    if (status) {
      query += ` AND d.status = $${paramIndex}`;
      params.push(status);
    }
    
    query += ' ORDER BY d.created_at DESC';
    
    const result = await pool.query(query, params);
    const devices = result.rows;

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'IT Inventory System';
    workbook.created = new Date();
    
    const worksheet = workbook.addWorksheet('الأجهزة', {
      properties: { tabColor: { argb: '3B82F6' } },
      views: [{ rightToLeft: true }]
    });

    worksheet.columns = [
      { header: 'Asset Tag', key: 'asset_tag', width: 15 },
      { header: 'نوع الجهاز', key: 'device_type_ar', width: 20 },
      { header: 'الشركة المصنعة', key: 'brand', width: 20 },
      { header: 'الموديل', key: 'model', width: 25 },
      { header: 'Serial Number', key: 'serial_number', width: 25 },
      { header: 'المعالج', key: 'cpu', width: 30 },
      { header: 'الذاكرة', key: 'ram', width: 12 },
      { header: 'التخزين', key: 'storage', width: 15 },
      { header: 'نظام التشغيل', key: 'os', width: 20 },
      { header: 'الحالة', key: 'status', width: 12 },
      { header: 'مسلم لـ', key: 'assigned_to', width: 25 }
    ];

    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFF' }, size: 12 };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: '3B82F6' }
    };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
    headerRow.height = 25;

    devices.forEach((device, index) => {
      const statusText = {
        'available': 'متاح',
        'assigned': 'مسلم',
        'maintenance': 'صيانة'
      }[device.status] || device.status;

      const row = worksheet.addRow({
        asset_tag: device.asset_tag || '-',
        device_type_ar: device.device_type_ar || device.device_type,
        brand: device.brand || '-',
        model: device.model || '-',
        serial_number: device.serial_number || '-',
        cpu: device.cpu || '-',
        ram: device.ram || '-',
        storage: device.storage || '-',
        os: device.os || '-',
        status: statusText,
        assigned_to: device.assigned_to || '-'
      });

      if (index % 2 === 0) {
        row.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'F3F4F6' }
        };
      }

      if (device.status === 'assigned') {
        row.getCell('status').font = { color: { argb: '16A34A' }, bold: true };
      } else if (device.status === 'maintenance') {
        row.getCell('status').font = { color: { argb: 'DC2626' }, bold: true };
      }

      row.alignment = { vertical: 'middle', horizontal: 'center' };
    });

    worksheet.eachRow((row) => {
      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin', color: { argb: 'D1D5DB' } },
          left: { style: 'thin', color: { argb: 'D1D5DB' } },
          bottom: { style: 'thin', color: { argb: 'D1D5DB' } },
          right: { style: 'thin', color: { argb: 'D1D5DB' } }
        };
      });
    });

    worksheet.addRow([]);
    const totalRow = worksheet.addRow({
      asset_tag: 'الإجمالي',
      device_type_ar: `${devices.length} جهاز`,
      status: `متاح: ${devices.filter(d => d.status === 'available').length} | مسلم: ${devices.filter(d => d.status === 'assigned').length}`
    });
    totalRow.font = { bold: true, size: 12 };
    totalRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'E5E7EB' }
    };

    const date = new Date().toISOString().split('T')[0];
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=devices_${date}.xlsx`);

    await workbook.xlsx.write(res);
    res.end();

  } catch (error) {
    console.error('Error exporting devices to Excel:', error);
    res.status(500).json({ error: 'حدث خطأ في تصدير الملف' });
  }
};

// Export devices to PDF
exports.exportToPDF = async (req, res) => {
  try {
    const { device_type_id, status, title } = req.query;
    const reportTitle = title || 'تقرير الأجهزة';
    
    let query = `
      SELECT d.*, dt.name_ar as device_type_ar,
        (SELECT e.full_name FROM device_assignments da 
         JOIN employees e ON da.employee_id = e.id 
         WHERE da.device_id = d.id AND da.is_current = true LIMIT 1) as assigned_to
      FROM devices d
      JOIN device_types dt ON d.device_type_id = dt.id
      WHERE d.is_active = true
    `;
    
    const params = [];
    let paramIndex = 1;
    
    if (device_type_id) {
      query += ` AND d.device_type_id = $${paramIndex}`;
      params.push(device_type_id);
      paramIndex++;
    }
    
    if (status) {
      query += ` AND d.status = $${paramIndex}`;
      params.push(status);
    }
    
    query += ' ORDER BY d.created_at DESC';
    
    const result = await pool.query(query, params);
    const devices = result.rows;

    const doc = new PDFDocument({ size: 'A4', margin: 50, bufferPages: true });
    const fontPath = path.join(__dirname, '../fonts/Tajawal-Regular.ttf');
    const fontBoldPath = path.join(__dirname, '../fonts/Tajawal-Bold.ttf');

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=devices_${new Date().toISOString().split('T')[0]}.pdf`);

    doc.pipe(res);

    try {
      doc.registerFont('Arabic', fontPath);
      doc.registerFont('ArabicBold', fontBoldPath);
    } catch (fontError) {
      console.warn('Arabic font not found, using default');
    }

    // Header
    doc.font('ArabicBold').fontSize(20).fillColor('#1e40af')
       .text(reportTitle, { align: 'center' });
    doc.moveDown(0.5);
    doc.font('Arabic').fontSize(10).fillColor('#6b7280')
       .text(`تاريخ التقرير: ${new Date().toLocaleDateString('ar-SA')}`, { align: 'center' });
    doc.moveDown(1);

    // Summary
    const stats = {
      total: devices.length,
      available: devices.filter(d => d.status === 'available').length,
      assigned: devices.filter(d => d.status === 'assigned').length,
      maintenance: devices.filter(d => d.status === 'maintenance').length
    };

    doc.fontSize(12).fillColor('#374151');
    doc.text(`إجمالي الأجهزة: ${stats.total} | متاح: ${stats.available} | مسلم: ${stats.assigned} | صيانة: ${stats.maintenance}`, 
      { align: 'right' });
    doc.moveDown(1);

    // Table
    devices.forEach((device, index) => {
      if (doc.y > 700) {
        doc.addPage();
      }

      const statusText = {
        'available': 'متاح',
        'assigned': 'مسلم',
        'maintenance': 'صيانة'
      }[device.status] || device.status;

      doc.fontSize(10).fillColor('#1f2937');
      doc.text(`${device.asset_tag || 'N/A'} - ${device.device_type_ar} - ${device.brand} ${device.model}`, { align: 'right' });
      doc.fontSize(8).fillColor('#6b7280');
      doc.text(`الحالة: ${statusText}${device.assigned_to ? ' | مسلم لـ: ' + device.assigned_to : ''}`, { align: 'right' });
      doc.moveDown(0.5);
    });

    doc.end();

  } catch (error) {
    console.error('Error exporting devices to PDF:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'حدث خطأ في تصدير الملف' });
    }
  }
};
