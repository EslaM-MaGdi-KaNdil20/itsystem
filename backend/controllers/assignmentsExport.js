const pool = require('../config/database');
const ExcelJS = require('exceljs');

// Export device assignments to Excel
exports.exportToExcel = async (req, res) => {
  try {
    const { is_current } = req.query;
    
    let query = `
      SELECT da.*, e.full_name as employee_name, e.employee_code,
        d.name as department_name,
        dv.asset_tag, dt.name_ar as device_type_ar
      FROM device_assignments da
      JOIN employees e ON da.employee_id = e.id
      LEFT JOIN departments d ON e.department_id = d.id
      LEFT JOIN devices dv ON da.device_id = dv.id
      LEFT JOIN device_types dt ON dv.device_type_id = dt.id
      WHERE 1=1
    `;
    
    const params = [];
    
    if (is_current === 'true') {
      query += ` AND da.is_current = true`;
    }
    
    query += ' ORDER BY da.assigned_date DESC';
    
    const result = await pool.query(query, params);
    const assignments = result.rows;

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'IT Inventory System';
    workbook.created = new Date();
    
    const worksheet = workbook.addWorksheet('التسليمات', {
      properties: { tabColor: { argb: 'EC4899' } },
      views: [{ rightToLeft: true }]
    });

    worksheet.columns = [
      { header: 'Asset Tag', key: 'asset_tag', width: 15 },
      { header: 'نوع الجهاز', key: 'device_type_ar', width: 20 },
      { header: 'اسم الموظف', key: 'employee_name', width: 30 },
      { header: 'القسم', key: 'department_name', width: 25 },
      { header: 'تاريخ التسليم', key: 'assigned_date', width: 15 },
      { header: 'تاريخ الإرجاع', key: 'returned_date', width: 15 },
      { header: 'Windows User', key: 'windows_username', width: 20 },
      { header: 'Email', key: 'email_account', width: 30 },
      { header: 'الحالة', key: 'is_current', width: 12 }
    ];

    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFF' }, size: 12 };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'EC4899' }
    };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
    headerRow.height = 25;

    assignments.forEach((assignment, index) => {
      const row = worksheet.addRow({
        asset_tag: assignment.asset_tag || '-',
        device_type_ar: assignment.device_type_ar || '-',
        employee_name: assignment.employee_name || '-',
        department_name: assignment.department_name || '-',
        assigned_date: assignment.assigned_date ? new Date(assignment.assigned_date).toLocaleDateString('ar-SA') : '-',
        returned_date: assignment.returned_date ? new Date(assignment.returned_date).toLocaleDateString('ar-SA') : '-',
        windows_username: assignment.windows_username || '-',
        email_account: assignment.email_account || '-',
        is_current: assignment.is_current ? 'نشط' : 'منتهي'
      });

      if (index % 2 === 0) {
        row.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'F3F4F6' }
        };
      }

      if (assignment.is_current) {
        row.getCell('is_current').font = { color: { argb: '16A34A' }, bold: true };
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
      device_type_ar: `${assignments.length} تسليم`,
      is_current: `نشط: ${assignments.filter(a => a.is_current).length}`
    });
    totalRow.font = { bold: true, size: 12 };
    totalRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'E5E7EB' }
    };

    const date = new Date().toISOString().split('T')[0];
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=assignments_${date}.xlsx`);

    await workbook.xlsx.write(res);
    res.end();

  } catch (error) {
    console.error('Error exporting assignments to Excel:', error);
    res.status(500).json({ error: 'حدث خطأ في تصدير الملف' });
  }
};
