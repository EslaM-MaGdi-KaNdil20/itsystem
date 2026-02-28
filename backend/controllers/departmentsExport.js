const pool = require('../config/database');
const ExcelJS = require('exceljs');

// Export departments to Excel
exports.exportToExcel = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT d.*, 
        (SELECT COUNT(*) FROM employees WHERE department_id = d.id AND is_active = true) as employee_count
      FROM departments d
      WHERE d.is_active = true
      ORDER BY d.name ASC
    `);
    const departments = result.rows;

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'IT Inventory System';
    workbook.created = new Date();
    
    const worksheet = workbook.addWorksheet('الأقسام', {
      properties: { tabColor: { argb: 'F59E0B' } },
      views: [{ rightToLeft: true }]
    });

    worksheet.columns = [
      { header: 'اسم القسم', key: 'name', width: 30 },
      { header: 'الوصف', key: 'description', width: 50 },
      { header: 'عدد الموظفين', key: 'employee_count', width: 15 }
    ];

    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFF' }, size: 12 };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'F59E0B' }
    };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
    headerRow.height = 25;

    departments.forEach((dept, index) => {
      const row = worksheet.addRow({
        name: dept.name || '-',
        description: dept.description || '-',
        employee_count: dept.employee_count || 0
      });

      if (index % 2 === 0) {
        row.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'F3F4F6' }
        };
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

    const date = new Date().toISOString().split('T')[0];
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=departments_${date}.xlsx`);

    await workbook.xlsx.write(res);
    res.end();

  } catch (error) {
    console.error('Error exporting departments to Excel:', error);
    res.status(500).json({ error: 'حدث خطأ في تصدير الملف' });
  }
};
