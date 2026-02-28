const pool = require('../config/database');
const { logActivity, ACTIONS, ENTITIES } = require('./activityLogController');

// Get all accessories with stock info
exports.getAllWithStock = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT a.*,
        COALESCE(a.stock_quantity, 0) as stock_quantity,
        COALESCE(a.min_stock_level, 5) as min_stock_level,
        COALESCE((
          SELECT COUNT(*) FROM accessory_assignments aa 
          WHERE aa.accessory_id = a.id AND aa.is_returned = false
        ), 0) as assigned_count,
        COALESCE((
          SELECT COUNT(*) FROM assignment_accessories aac 
          WHERE aac.accessory_id = a.id AND aac.returned = false
        ), 0) as with_devices_count
      FROM accessories a
      WHERE a.is_active = true
      ORDER BY a.category, a.name_ar
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching accessories stock:', error);
    res.status(500).json({ error: 'حدث خطأ في جلب بيانات المخزون' });
  }
};

// Update stock quantity
exports.updateStock = async (req, res) => {
  try {
    const { id } = req.params;
    const { quantity, type, notes, created_by } = req.body;
    
    // Get current stock
    const current = await pool.query('SELECT stock_quantity, name_ar FROM accessories WHERE id = $1', [id]);
    if (current.rows.length === 0) {
      return res.status(404).json({ error: 'الملحق غير موجود' });
    }
    
    let newQuantity;
    const currentQty = current.rows[0].stock_quantity || 0;
    
    if (type === 'add') {
      newQuantity = currentQty + parseInt(quantity);
    } else if (type === 'subtract') {
      newQuantity = currentQty - parseInt(quantity);
      if (newQuantity < 0) {
        return res.status(400).json({ error: 'لا يمكن أن يكون المخزون بالسالب' });
      }
    } else if (type === 'set') {
      newQuantity = parseInt(quantity);
    } else {
      return res.status(400).json({ error: 'نوع العملية غير صحيح' });
    }
    
    // Update stock
    await pool.query(
      'UPDATE accessories SET stock_quantity = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [newQuantity, id]
    );
    
    // Record movement
    await pool.query(`
      INSERT INTO accessory_stock_movements (accessory_id, movement_type, quantity, notes, created_by)
      VALUES ($1, $2, $3, $4, $5)
    `, [id, type === 'add' ? 'in' : (type === 'subtract' ? 'out' : 'adjustment'), quantity, notes, created_by]);
    
    res.json({ 
      message: 'تم تحديث المخزون بنجاح',
      accessory: current.rows[0].name_ar,
      old_quantity: currentQty,
      new_quantity: newQuantity
    });
    
    // Log activity
    logActivity(req, ACTIONS.UPDATE, ENTITIES.ACCESSORY, id, 
      current.rows[0].name_ar, `تم تحديث مخزون ${current.rows[0].name_ar}: ${currentQty} → ${newQuantity}`);
  } catch (error) {
    console.error('Error updating stock:', error);
    res.status(500).json({ error: 'حدث خطأ في تحديث المخزون' });
  }
};

// Assign accessory to employee (standalone - without device)
exports.assignToEmployee = async (req, res) => {
  try {
    const { accessory_id, employee_id, quantity, serial_number, condition, assigned_by, notes } = req.body;
    
    // Check stock availability
    const accessory = await pool.query(
      'SELECT stock_quantity, name_ar FROM accessories WHERE id = $1',
      [accessory_id]
    );
    
    if (accessory.rows.length === 0) {
      return res.status(404).json({ error: 'الملحق غير موجود' });
    }
    
    const qty = quantity || 1;
    if (accessory.rows[0].stock_quantity < qty) {
      return res.status(400).json({ 
        error: `المخزون غير كافي. المتاح: ${accessory.rows[0].stock_quantity}` 
      });
    }
    
    // Create assignment
    const result = await pool.query(`
      INSERT INTO accessory_assignments 
        (accessory_id, employee_id, quantity, serial_number, condition, assigned_by, notes)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [accessory_id, employee_id, qty, serial_number, condition || 'new', assigned_by, notes]);
    
    // Reduce stock
    await pool.query(
      'UPDATE accessories SET stock_quantity = stock_quantity - $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [qty, accessory_id]
    );
    
    // Record movement
    await pool.query(`
      INSERT INTO accessory_stock_movements 
        (accessory_id, movement_type, quantity, reference_type, reference_id, notes, created_by)
      VALUES ($1, 'out', $2, 'assignment', $3, $4, $5)
    `, [accessory_id, qty, result.rows[0].id, `تسليم لموظف`, assigned_by]);
    
    res.status(201).json({ 
      message: 'تم تسليم الملحق بنجاح',
      assignment: result.rows[0]
    });
    
    // Log activity - assign accessory
    logActivity(req, ACTIONS.CREATE, ENTITIES.ACCESSORY, accessory_id, 
      accessory.rows[0].name_ar, `تم تسليم ملحق: ${accessory.rows[0].name_ar} (الكمية: ${qty})`);
  } catch (error) {
    console.error('Error assigning accessory:', error);
    res.status(500).json({ error: 'حدث خطأ في تسليم الملحق' });
  }
};

// Get all standalone accessory assignments
exports.getAssignments = async (req, res) => {
  try {
    const { status } = req.query; // 'active', 'returned', 'all'
    
    let whereClause = '';
    if (status === 'active') {
      whereClause = 'WHERE aa.is_returned = false';
    } else if (status === 'returned') {
      whereClause = 'WHERE aa.is_returned = true';
    }
    
    const result = await pool.query(`
      SELECT 
        aa.*,
        a.name as accessory_name,
        a.name_ar as accessory_name_ar,
        a.category as accessory_category,
        e.full_name as employee_name,
        e.employee_code,
        d.name as department_name
      FROM accessory_assignments aa
      JOIN accessories a ON aa.accessory_id = a.id
      JOIN employees e ON aa.employee_id = e.id
      LEFT JOIN departments d ON e.department_id = d.id
      ${whereClause}
      ORDER BY aa.created_at DESC
    `);
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching accessory assignments:', error);
    res.status(500).json({ error: 'حدث خطأ في جلب بيانات التسليم' });
  }
};

// Get assignments by employee
exports.getByEmployee = async (req, res) => {
  try {
    const { employeeId } = req.params;
    
    const result = await pool.query(`
      SELECT 
        aa.*,
        a.name as accessory_name,
        a.name_ar as accessory_name_ar,
        a.category as accessory_category
      FROM accessory_assignments aa
      JOIN accessories a ON aa.accessory_id = a.id
      WHERE aa.employee_id = $1 AND aa.is_returned = false
      ORDER BY aa.assigned_date DESC
    `, [employeeId]);
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching employee accessories:', error);
    res.status(500).json({ error: 'حدث خطأ في جلب ملحقات الموظف' });
  }
};

// Return accessory
exports.returnAccessory = async (req, res) => {
  try {
    const { id } = req.params;
    const { returned_condition, return_notes } = req.body;
    
    // Get assignment
    const assignment = await pool.query(
      'SELECT * FROM accessory_assignments WHERE id = $1',
      [id]
    );
    
    if (assignment.rows.length === 0) {
      return res.status(404).json({ error: 'التسليم غير موجود' });
    }
    
    if (assignment.rows[0].is_returned) {
      return res.status(400).json({ error: 'تم استرجاع هذا الملحق مسبقاً' });
    }
    
    const { accessory_id, quantity } = assignment.rows[0];
    
    // Update assignment
    await pool.query(`
      UPDATE accessory_assignments 
      SET is_returned = true, 
          returned_date = CURRENT_DATE, 
          returned_condition = $1,
          return_notes = $2,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
    `, [returned_condition || 'good', return_notes, id]);
    
    // Return to stock (only if condition is good)
    if (returned_condition !== 'damaged' && returned_condition !== 'lost') {
      await pool.query(
        'UPDATE accessories SET stock_quantity = stock_quantity + $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [quantity, accessory_id]
      );
      
      // Record movement
      await pool.query(`
        INSERT INTO accessory_stock_movements 
          (accessory_id, movement_type, quantity, reference_type, reference_id, notes)
        VALUES ($1, 'return', $2, 'assignment', $3, $4)
      `, [accessory_id, quantity, id, `استرجاع - حالة: ${returned_condition || 'جيد'}`]);
    }
    
    // Log activity - return accessory
    logActivity(req, ACTIONS.UPDATE, ENTITIES.ACCESSORY, accessory_id, 
      'ملحق', `تم استرجاع ملحق (الكمية: ${quantity}، الحالة: ${returned_condition || 'جيد'})`);
    
    res.json({ message: 'تم استرجاع الملحق بنجاح' });
  } catch (error) {
    console.error('Error returning accessory:', error);
    res.status(500).json({ error: 'حدث خطأ في استرجاع الملحق' });
  }
};

// Get stock movements history
exports.getStockMovements = async (req, res) => {
  try {
    const { accessory_id } = req.query;
    
    let query = `
      SELECT 
        sm.*,
        a.name_ar as accessory_name
      FROM accessory_stock_movements sm
      JOIN accessories a ON sm.accessory_id = a.id
    `;
    
    if (accessory_id) {
      query += ` WHERE sm.accessory_id = $1`;
    }
    
    query += ` ORDER BY sm.created_at DESC LIMIT 100`;
    
    const result = await pool.query(query, accessory_id ? [accessory_id] : []);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching stock movements:', error);
    res.status(500).json({ error: 'حدث خطأ في جلب سجل الحركات' });
  }
};

// Get stock summary/dashboard
exports.getStockSummary = async (req, res) => {
  try {
    const summary = await pool.query(`
      SELECT 
        COUNT(*) as total_types,
        SUM(stock_quantity) as total_in_stock,
        SUM(CASE WHEN stock_quantity <= min_stock_level THEN 1 ELSE 0 END) as low_stock_count,
        SUM(CASE WHEN stock_quantity = 0 THEN 1 ELSE 0 END) as out_of_stock_count
      FROM accessories
      WHERE is_active = true
    `);
    
    const activeAssignments = await pool.query(`
      SELECT COUNT(*) as count FROM accessory_assignments WHERE is_returned = false
    `);
    
    const lowStockItems = await pool.query(`
      SELECT id, name_ar, stock_quantity, min_stock_level
      FROM accessories
      WHERE is_active = true AND stock_quantity <= min_stock_level
      ORDER BY stock_quantity ASC
      LIMIT 10
    `);
    
    res.json({
      ...summary.rows[0],
      active_assignments: activeAssignments.rows[0].count,
      low_stock_items: lowStockItems.rows
    });
  } catch (error) {
    console.error('Error fetching stock summary:', error);
    res.status(500).json({ error: 'حدث خطأ في جلب ملخص المخزون' });
  }
};

// Create new accessory type
exports.createAccessory = async (req, res) => {
  try {
    const { name, name_ar, category, description, stock_quantity, min_stock_level, unit_price } = req.body;
    
    if (!name || !name_ar) {
      return res.status(400).json({ error: 'الاسم بالعربي والإنجليزي مطلوب' });
    }
    
    const result = await pool.query(`
      INSERT INTO accessories (name, name_ar, category, description, stock_quantity, min_stock_level, unit_price)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [name, name_ar, category || 'general', description, stock_quantity || 0, min_stock_level || 5, unit_price || 0]);
    
    res.status(201).json({ 
      message: 'تم إضافة الملحق بنجاح',
      accessory: result.rows[0]
    });
  } catch (error) {
    console.error('Error creating accessory:', error);
    if (error.code === '23505') {
      return res.status(400).json({ error: 'هذا الملحق موجود مسبقاً' });
    }
    res.status(500).json({ error: 'حدث خطأ في إضافة الملحق' });
  }
};

// Update accessory type
exports.updateAccessory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, name_ar, category, description, min_stock_level, unit_price } = req.body;
    
    const result = await pool.query(`
      UPDATE accessories 
      SET name = COALESCE($1, name),
          name_ar = COALESCE($2, name_ar),
          category = COALESCE($3, category),
          description = COALESCE($4, description),
          min_stock_level = COALESCE($5, min_stock_level),
          unit_price = COALESCE($6, unit_price),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $7
      RETURNING *
    `, [name, name_ar, category, description, min_stock_level, unit_price, id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'الملحق غير موجود' });
    }
    
    res.json({ 
      message: 'تم تحديث الملحق بنجاح',
      accessory: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating accessory:', error);
    res.status(500).json({ error: 'حدث خطأ في تحديث الملحق' });
  }
};

// Delete accessory type (soft delete)
exports.deleteAccessory = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if accessory has active assignments
    const activeAssignments = await pool.query(`
      SELECT COUNT(*) FROM accessory_assignments 
      WHERE accessory_id = $1 AND is_returned = false
    `, [id]);
    
    if (parseInt(activeAssignments.rows[0].count) > 0) {
      return res.status(400).json({ 
        error: 'لا يمكن حذف هذا الملحق لوجود تسليمات نشطة' 
      });
    }
    
    // Soft delete
    await pool.query(
      'UPDATE accessories SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
      [id]
    );
    
    res.json({ message: 'تم حذف الملحق بنجاح' });
  } catch (error) {
    console.error('Error deleting accessory:', error);
    res.status(500).json({ error: 'حدث خطأ في حذف الملحق' });
  }
};


// Export to Excel
exports.exportToExcel = async (req, res) => {
  try {
    const ExcelJS = require('exceljs');
    
    // Get all accessories with stock
    const result = await pool.query(`
      SELECT id, name, name_ar, category, stock_quantity, min_stock_level, unit_price, is_active, created_at
      FROM accessories 
      WHERE is_active = true
      ORDER BY category, name_ar
    `);
    
    const accessories = result.rows;
    
    // Get assignments
    const assignmentsResult = await pool.query(`
      SELECT aa.*, a.name_ar as accessory_name, e.full_name as employee_name, d.name as department_name
      FROM accessory_assignments aa
      JOIN accessories a ON aa.accessory_id = a.id
      JOIN employees e ON aa.employee_id = e.id
      LEFT JOIN departments d ON e.department_id = d.id
      WHERE aa.is_returned = false
      ORDER BY aa.assigned_date DESC
    `);
    
    const assignments = assignmentsResult.rows;

    // Create workbook
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'IT Inventory System';
    workbook.created = new Date();

    // Sheet 1 - Accessories Stock
    const stockSheet = workbook.addWorksheet('مخزون الملحقات', {
      views: [{ rightToLeft: true }]
    });

    stockSheet.columns = [
      { header: 'الاسم', key: 'name_ar', width: 25 },
      { header: 'الاسم (EN)', key: 'name', width: 20 },
      { header: 'التصنيف', key: 'category', width: 15 },
      { header: 'الكمية', key: 'stock_quantity', width: 12 },
      { header: 'الحد الأدنى', key: 'min_stock_level', width: 12 },
      { header: 'السعر', key: 'unit_price', width: 12 },
      { header: 'الحالة', key: 'status', width: 12 }
    ];

    // Style header
    stockSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFF' } };
    stockSheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '3B82F6' } };
    stockSheet.getRow(1).alignment = { horizontal: 'center', vertical: 'middle' };

    // Category names mapping
    const categoryNames = {
      'input': 'Input Devices',
      'display': 'Displays',
      'cable': 'Cables',
      'power': 'Power',
      'audio': 'Audio',
      'video': 'Video',
      'accessory': 'Accessories',
      'general': 'General'
    };

    // Add data
    accessories.forEach(acc => {
      const status = acc.stock_quantity === 0 ? 'Out of Stock' : 
                     acc.stock_quantity <= acc.min_stock_level ? 'Low' : 'Available';
      
      const row = stockSheet.addRow({
        name_ar: acc.name_ar,
        name: acc.name,
        category: categoryNames[acc.category] || acc.category,
        stock_quantity: acc.stock_quantity,
        min_stock_level: acc.min_stock_level,
        unit_price: acc.unit_price,
        status: status
      });

      // Color based on status
      if (acc.stock_quantity === 0) {
        row.getCell('status').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FEE2E2' } };
        row.getCell('status').font = { color: { argb: 'DC2626' } };
      } else if (acc.stock_quantity <= acc.min_stock_level) {
        row.getCell('status').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FEF3C7' } };
        row.getCell('status').font = { color: { argb: 'D97706' } };
      } else {
        row.getCell('status').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'D1FAE5' } };
        row.getCell('status').font = { color: { argb: '059669' } };
      }
    });

    // Sheet 2 - Assignments
    const assignSheet = workbook.addWorksheet('التسليمات', {
      views: [{ rightToLeft: true }]
    });

    assignSheet.columns = [
      { header: 'الملحق', key: 'accessory_name', width: 25 },
      { header: 'الموظف', key: 'employee_name', width: 25 },
      { header: 'القسم', key: 'department_name', width: 20 },
      { header: 'الكمية', key: 'quantity', width: 10 },
      { header: 'تاريخ التسليم', key: 'assigned_date', width: 15 },
      { header: 'ملاحظات', key: 'notes', width: 30 }
    ];

    assignSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFF' } };
    assignSheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '10B981' } };
    assignSheet.getRow(1).alignment = { horizontal: 'center', vertical: 'middle' };

    assignments.forEach(assign => {
      assignSheet.addRow({
        accessory_name: assign.accessory_name,
        employee_name: assign.employee_name,
        department_name: assign.department_name || '-',
        quantity: assign.quantity,
        assigned_date: new Date(assign.assigned_date).toLocaleDateString('ar-EG'),
        notes: assign.notes || '-'
      });
    });

    // Set response headers
    const date = new Date().toISOString().split('T')[0];
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=accessories_report_${date}.xlsx`);

    await workbook.xlsx.write(res);
    res.end();

  } catch (error) {
    console.error('Error exporting to Excel:', error);
    res.status(500).json({ error: 'حدث خطأ أثناء تصدير الملف' });
  }
};

// Export to PDF
exports.exportToPDF = async (req, res) => {
  try {
    const PDFDocument = require('pdfkit');
    
    // Get all accessories with stock
    const result = await pool.query(`
      SELECT a.*,
        COALESCE(a.stock_quantity, 0) as stock_quantity,
        COALESCE(a.min_stock_level, 5) as min_stock_level,
        COALESCE((
          SELECT COUNT(*) FROM accessory_assignments aa 
          WHERE aa.accessory_id = a.id AND aa.is_returned = false
        ), 0) as assigned_count,
        COALESCE((
          SELECT COUNT(*) FROM assignment_accessories aac 
          WHERE aac.accessory_id = a.id AND aac.returned = false
        ), 0) as with_devices_count
      FROM accessories a
      WHERE a.is_active = true
      ORDER BY a.category, a.name_ar
    `);
    
    const accessories = result.rows;

    // Get assignments for second page
    const assignmentsResult = await pool.query(`
      SELECT aa.*, a.name_ar as accessory_name, a.name as accessory_name_en,
             e.full_name as employee_name, d.name as department_name
      FROM accessory_assignments aa
      JOIN accessories a ON aa.accessory_id = a.id
      JOIN employees e ON aa.employee_id = e.id
      LEFT JOIN departments d ON e.department_id = d.id
      WHERE aa.is_returned = false
      ORDER BY aa.assigned_date DESC
    `);
    
    const assignments = assignmentsResult.rows;

    // Create PDF document
    const doc = new PDFDocument({ 
      size: 'A4', 
      margin: 50,
      bufferPages: true,
      info: {
        Title: 'Accessories Stock Report',
        Author: 'IT Inventory System',
        Creator: 'IT Inventory System'
      }
    });

    const date = new Date().toISOString().split('T')[0];
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=accessories_report_${date}.pdf`);
    
    doc.pipe(res);

    // Helper function to reverse Arabic text for PDF
    const reverseArabic = (text) => {
      if (!text) return '';
      return text.toString().split('').reverse().join('');
    };

    // Colors
    const primaryColor = '#3B82F6';
    const darkColor = '#1E293B';
    const grayColor = '#64748B';
    const lightGray = '#F1F5F9';
    const dangerColor = '#DC2626';
    const warningColor = '#D97706';
    const successColor = '#059669';

    // Page dimensions
    const pageWidth = doc.page.width;
    const pageHeight = doc.page.height;
    const margin = 50;
    const contentWidth = pageWidth - (margin * 2);

    // Category names (English for PDF compatibility)
    const categoryNames = {
      'input': 'Input Devices',
      'display': 'Displays',
      'cable': 'Cables',
      'power': 'Power',
      'audio': 'Audio',
      'video': 'Video',
      'accessory': 'Accessories',
      'general': 'General'
    };

    // Track page number
    let pageNum = 1;

    // Function to add header
    const addHeader = (title) => {
      doc.rect(0, 0, pageWidth, 80).fill(primaryColor);
      
      // Title
      doc.fillColor('#FFFFFF')
         .fontSize(22)
         .font('Helvetica-Bold')
         .text(title, margin, 25, { align: 'center', width: contentWidth });
      
      // Date
      doc.fontSize(11)
         .font('Helvetica')
         .text(new Date().toLocaleDateString('en-US', { 
           year: 'numeric', 
           month: 'long', 
           day: 'numeric' 
         }), margin, 50, { align: 'center', width: contentWidth });
      
      doc.y = 100;
    };

    // Function to add footer
    const addFooter = (currentPage, totalPages) => {
      const footerY = pageHeight - 40;
      
      doc.strokeColor(primaryColor)
         .lineWidth(1)
         .moveTo(margin, footerY - 10)
         .lineTo(pageWidth - margin, footerY - 10)
         .stroke();
      
      doc.fillColor(grayColor)
         .fontSize(10)
         .font('Helvetica')
         .text(`Page ${currentPage} of ${totalPages}`, margin, footerY, { align: 'center', width: contentWidth });
      
      doc.text('IT Inventory System', pageWidth - margin - 150, footerY, { width: 150, align: 'right' });
    };

    // =============== PAGE 1: STOCK OVERVIEW ===============
    addHeader('Accessories Stock Report');

    // Calculate statistics
    const totalItems = accessories.length;
    const totalStock = accessories.reduce((sum, a) => sum + (parseInt(a.stock_quantity) || 0), 0);
    const lowStock = accessories.filter(a => a.stock_quantity > 0 && a.stock_quantity <= a.min_stock_level).length;
    const outOfStock = accessories.filter(a => a.stock_quantity === 0).length;
    const totalAssigned = accessories.reduce((sum, a) => sum + parseInt(a.assigned_count) + parseInt(a.with_devices_count), 0);
    const totalValue = accessories.reduce((sum, a) => sum + ((parseInt(a.stock_quantity) || 0) * (parseFloat(a.unit_price) || 0)), 0);

    // Summary boxes (5 boxes)
    const boxWidth = (contentWidth - 40) / 5;
    const boxHeight = 55;
    const boxY = doc.y + 10;

    // Box 1 - Total Items
    doc.rect(margin, boxY, boxWidth, boxHeight).fill(lightGray);
    doc.fillColor(darkColor).fontSize(20).font('Helvetica-Bold')
       .text(totalItems.toString(), margin, boxY + 10, { width: boxWidth, align: 'center' });
    doc.fillColor(grayColor).fontSize(8).font('Helvetica')
       .text('Total Items', margin, boxY + 35, { width: boxWidth, align: 'center' });

    // Box 2 - Total Stock
    doc.rect(margin + boxWidth + 10, boxY, boxWidth, boxHeight).fill('#DCFCE7');
    doc.fillColor(successColor).fontSize(20).font('Helvetica-Bold')
       .text(totalStock.toString(), margin + boxWidth + 10, boxY + 10, { width: boxWidth, align: 'center' });
    doc.fillColor(successColor).fontSize(8).font('Helvetica')
       .text('In Stock', margin + boxWidth + 10, boxY + 35, { width: boxWidth, align: 'center' });

    // Box 3 - Assigned
    doc.rect(margin + (boxWidth + 10) * 2, boxY, boxWidth, boxHeight).fill('#DBEAFE');
    doc.fillColor('#1D4ED8').fontSize(20).font('Helvetica-Bold')
       .text(totalAssigned.toString(), margin + (boxWidth + 10) * 2, boxY + 10, { width: boxWidth, align: 'center' });
    doc.fillColor('#1D4ED8').fontSize(8).font('Helvetica')
       .text('Assigned', margin + (boxWidth + 10) * 2, boxY + 35, { width: boxWidth, align: 'center' });

    // Box 4 - Low Stock
    doc.rect(margin + (boxWidth + 10) * 3, boxY, boxWidth, boxHeight).fill('#FEF3C7');
    doc.fillColor(warningColor).fontSize(20).font('Helvetica-Bold')
       .text(lowStock.toString(), margin + (boxWidth + 10) * 3, boxY + 10, { width: boxWidth, align: 'center' });
    doc.fillColor(warningColor).fontSize(8).font('Helvetica')
       .text('Low Stock', margin + (boxWidth + 10) * 3, boxY + 35, { width: boxWidth, align: 'center' });

    // Box 5 - Out of Stock
    doc.rect(margin + (boxWidth + 10) * 4, boxY, boxWidth, boxHeight).fill('#FEE2E2');
    doc.fillColor(dangerColor).fontSize(20).font('Helvetica-Bold')
       .text(outOfStock.toString(), margin + (boxWidth + 10) * 4, boxY + 10, { width: boxWidth, align: 'center' });
    doc.fillColor(dangerColor).fontSize(8).font('Helvetica')
       .text('Out of Stock', margin + (boxWidth + 10) * 4, boxY + 35, { width: boxWidth, align: 'center' });

    doc.y = boxY + boxHeight + 20;

    // Total Value box
    doc.rect(margin, doc.y, contentWidth, 30).fill('#F0F9FF');
    doc.fillColor('#1E40AF').fontSize(12).font('Helvetica-Bold')
       .text(`Total Inventory Value: ${totalValue.toLocaleString('en-US')} EGP`, margin, doc.y + 8, { width: contentWidth, align: 'center' });
    
    doc.y += 45;

    // Table header
    const tableTop = doc.y;
    const colWidths = [120, 85, 55, 55, 55, 65, 60];
    
    doc.rect(margin, tableTop, contentWidth, 25).fill(primaryColor);
    doc.fillColor('#FFFFFF').fontSize(9).font('Helvetica-Bold');
    
    const headers = ['Accessory Name', 'Category', 'Stock', 'Assigned', 'Min', 'Price', 'Status'];
    let xPos = margin + 3;
    headers.forEach((header, i) => {
      doc.text(header, xPos, tableTop + 8, { width: colWidths[i], align: 'center' });
      xPos += colWidths[i];
    });

    doc.y = tableTop + 25;
    const maxY = pageHeight - 80;

    // Table rows
    accessories.forEach((acc, index) => {
      if (doc.y + 22 > maxY) {
        doc.addPage();
        addHeader('Accessories Stock Report (Continued)');
        doc.y = 100;
        
        // Re-add table header
        doc.rect(margin, doc.y, contentWidth, 25).fill(primaryColor);
        doc.fillColor('#FFFFFF').fontSize(9).font('Helvetica-Bold');
        let xPos = margin + 3;
        headers.forEach((header, i) => {
          doc.text(header, xPos, doc.y + 8, { width: colWidths[i], align: 'center' });
          xPos += colWidths[i];
        });
        doc.y += 25;
      }

      const rowY = doc.y;
      const bgColor = index % 2 === 0 ? '#FFFFFF' : '#F8FAFC';
      
      doc.rect(margin, rowY, contentWidth, 22).fill(bgColor);
      
      const totalAssignedForItem = parseInt(acc.assigned_count) + parseInt(acc.with_devices_count);
      const status = acc.stock_quantity === 0 ? 'Out' : 
                     acc.stock_quantity <= acc.min_stock_level ? 'Low' : 'OK';
      const statusColor = acc.stock_quantity === 0 ? dangerColor : 
                          acc.stock_quantity <= acc.min_stock_level ? warningColor : successColor;

      doc.font('Helvetica').fontSize(8);
      
      xPos = margin + 3;
      doc.fillColor(darkColor).text(acc.name || acc.name_ar, xPos, rowY + 7, { width: colWidths[0], align: 'left' });
      xPos += colWidths[0];
      doc.text(categoryNames[acc.category] || acc.category, xPos, rowY + 7, { width: colWidths[1], align: 'center' });
      xPos += colWidths[1];
      doc.text(acc.stock_quantity.toString(), xPos, rowY + 7, { width: colWidths[2], align: 'center' });
      xPos += colWidths[2];
      doc.text(totalAssignedForItem.toString(), xPos, rowY + 7, { width: colWidths[3], align: 'center' });
      xPos += colWidths[3];
      doc.text(acc.min_stock_level.toString(), xPos, rowY + 7, { width: colWidths[4], align: 'center' });
      xPos += colWidths[4];
      doc.text((parseFloat(acc.unit_price) || 0).toLocaleString(), xPos, rowY + 7, { width: colWidths[5], align: 'center' });
      xPos += colWidths[5];
      doc.fillColor(statusColor).font('Helvetica-Bold').text(status, xPos, rowY + 7, { width: colWidths[6], align: 'center' });

      doc.y = rowY + 22;
    });

    // =============== PAGE 2: ASSIGNMENTS ===============
    if (assignments.length > 0) {
      doc.addPage();
      addHeader('Active Assignments');

      doc.y = 100;

      // Assignment statistics
      const statBoxWidth = (contentWidth - 20) / 3;
      const statBoxY = doc.y + 10;

      doc.rect(margin, statBoxY, statBoxWidth, 45).fill(lightGray);
      doc.fillColor(darkColor).fontSize(18).font('Helvetica-Bold')
         .text(assignments.length.toString(), margin, statBoxY + 8, { width: statBoxWidth, align: 'center' });
      doc.fillColor(grayColor).fontSize(9).font('Helvetica')
         .text('Total Assignments', margin, statBoxY + 28, { width: statBoxWidth, align: 'center' });

      const uniqueEmployees = new Set(assignments.map(a => a.employee_id)).size;
      doc.rect(margin + statBoxWidth + 10, statBoxY, statBoxWidth, 45).fill('#DBEAFE');
      doc.fillColor('#1D4ED8').fontSize(18).font('Helvetica-Bold')
         .text(uniqueEmployees.toString(), margin + statBoxWidth + 10, statBoxY + 8, { width: statBoxWidth, align: 'center' });
      doc.fillColor('#1D4ED8').fontSize(9).font('Helvetica')
         .text('Employees', margin + statBoxWidth + 10, statBoxY + 28, { width: statBoxWidth, align: 'center' });

      const totalQty = assignments.reduce((sum, a) => sum + (parseInt(a.quantity) || 1), 0);
      doc.rect(margin + (statBoxWidth + 10) * 2, statBoxY, statBoxWidth, 45).fill('#DCFCE7');
      doc.fillColor(successColor).fontSize(18).font('Helvetica-Bold')
         .text(totalQty.toString(), margin + (statBoxWidth + 10) * 2, statBoxY + 8, { width: statBoxWidth, align: 'center' });
      doc.fillColor(successColor).fontSize(9).font('Helvetica')
         .text('Total Items Assigned', margin + (statBoxWidth + 10) * 2, statBoxY + 28, { width: statBoxWidth, align: 'center' });

      doc.y = statBoxY + 60;

      // Assignments table
      const assignTableTop = doc.y;
      const assignColWidths = [100, 100, 80, 50, 80, 85];
      
      doc.rect(margin, assignTableTop, contentWidth, 25).fill('#10B981');
      doc.fillColor('#FFFFFF').fontSize(9).font('Helvetica-Bold');
      
      const assignHeaders = ['Accessory', 'Employee', 'Department', 'Qty', 'Date', 'Condition'];
      xPos = margin + 3;
      assignHeaders.forEach((header, i) => {
        doc.text(header, xPos, assignTableTop + 8, { width: assignColWidths[i], align: 'center' });
        xPos += assignColWidths[i];
      });

      doc.y = assignTableTop + 25;

      assignments.forEach((assign, index) => {
        if (doc.y + 22 > maxY) {
          doc.addPage();
          addHeader('Active Assignments (Continued)');
          doc.y = 100;
          
          doc.rect(margin, doc.y, contentWidth, 25).fill('#10B981');
          doc.fillColor('#FFFFFF').fontSize(9).font('Helvetica-Bold');
          let xPos = margin + 3;
          assignHeaders.forEach((header, i) => {
            doc.text(header, xPos, doc.y + 8, { width: assignColWidths[i], align: 'center' });
            xPos += assignColWidths[i];
          });
          doc.y += 25;
        }

        const rowY = doc.y;
        const bgColor = index % 2 === 0 ? '#FFFFFF' : '#F8FAFC';
        
        doc.rect(margin, rowY, contentWidth, 22).fill(bgColor);
        
        const conditionText = assign.condition === 'new' ? 'New' : 
                              assign.condition === 'good' ? 'Good' : 
                              assign.condition === 'fair' ? 'Fair' : assign.condition || '-';

        doc.font('Helvetica').fontSize(8).fillColor(darkColor);
        
        xPos = margin + 3;
        doc.text(assign.accessory_name_en || assign.accessory_name, xPos, rowY + 7, { width: assignColWidths[0], align: 'left' });
        xPos += assignColWidths[0];
        doc.text(assign.employee_name, xPos, rowY + 7, { width: assignColWidths[1], align: 'left' });
        xPos += assignColWidths[1];
        doc.text(assign.department_name || '-', xPos, rowY + 7, { width: assignColWidths[2], align: 'center' });
        xPos += assignColWidths[2];
        doc.text((assign.quantity || 1).toString(), xPos, rowY + 7, { width: assignColWidths[3], align: 'center' });
        xPos += assignColWidths[3];
        doc.text(new Date(assign.assigned_date).toLocaleDateString('en-US'), xPos, rowY + 7, { width: assignColWidths[4], align: 'center' });
        xPos += assignColWidths[4];
        doc.text(conditionText, xPos, rowY + 7, { width: assignColWidths[5], align: 'center' });

        doc.y = rowY + 22;
      });
    }

    // Add footers to all pages
    const pages = doc.bufferedPageRange();
    for (let i = 0; i < pages.count; i++) {
      doc.switchToPage(i);
      addFooter(i + 1, pages.count);
    }

    doc.end();

  } catch (error) {
    console.error('Error exporting to PDF:', error);
    res.status(500).json({ error: 'حدث خطأ أثناء تصدير الملف' });
  }
};
