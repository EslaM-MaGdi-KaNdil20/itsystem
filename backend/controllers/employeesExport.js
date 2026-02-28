const pool = require('../config/database');
const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');
const path = require('path');

// Export employees to Excel
exports.exportToExcel = async (req, res) => {
  try {
    const { department_id } = req.query;
    
    let query = `
      SELECT e.*, d.name as department_name
      FROM employees e
      LEFT JOIN departments d ON e.department_id = d.id
      WHERE e.is_active = true
    `;
    
    const params = [];
    
    if (department_id) {
      query += ` AND e.department_id = $1`;
      params.push(department_id);
    }
    
    query += ' ORDER BY e.full_name ASC';
    
    const result = await pool.query(query, params);
    const employees = result.rows;

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'IT Inventory System';
    workbook.created = new Date();
    
    const worksheet = workbook.addWorksheet('الموظفين', {
      properties: { tabColor: { argb: '10B981' } },
      views: [{ rightToLeft: true }]
    });

    worksheet.columns = [
      { header: 'الرقم الوظيفي', key: 'employee_code', width: 15 },
      { header: 'الاسم الكامل', key: 'full_name', width: 30 },
      { header: 'القسم', key: 'department_name', width: 25 },
      { header: 'المسمى الوظيفي', key: 'job_title', width: 25 },
      { header: 'البريد الإلكتروني', key: 'email', width: 30 },
      { header: 'رقم الهاتف', key: 'phone', width: 15 },
      { header: 'رقم الموبايل', key: 'mobile', width: 15 },
      { header: 'تاريخ التعيين', key: 'hire_date', width: 15 }
    ];

    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFF' }, size: 12 };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: '10B981' }
    };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
    headerRow.height = 25;

    employees.forEach((emp, index) => {
      const row = worksheet.addRow({
        employee_code: emp.employee_code || '-',
        full_name: emp.full_name || '-',
        department_name: emp.department_name || 'بدون قسم',
        job_title: emp.job_title || '-',
        email: emp.email || '-',
        phone: emp.phone || '-',
        mobile: emp.mobile || '-',
        hire_date: emp.hire_date ? new Date(emp.hire_date).toLocaleDateString('ar-SA') : '-'
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

    worksheet.addRow([]);
    const totalRow = worksheet.addRow({
      employee_code: 'الإجمالي',
      full_name: `${employees.length} موظف`
    });
    totalRow.font = { bold: true, size: 12 };
    totalRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'E5E7EB' }
    };

    const date = new Date().toISOString().split('T')[0];
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=employees_${date}.xlsx`);

    await workbook.xlsx.write(res);
    res.end();

  } catch (error) {
    console.error('Error exporting employees to Excel:', error);
    res.status(500).json({ error: 'حدث خطأ في تصدير الملف' });
  }
};

// Export employees to PDF
exports.exportToPDF = async (req, res) => {
  try {
    const { department_id, title } = req.query;
    const reportTitle = title || 'تقرير الموظفين';
    
    let query = `
      SELECT e.*, d.name as department_name
      FROM employees e
      LEFT JOIN departments d ON e.department_id = d.id
      WHERE e.is_active = true
    `;
    
    const params = [];
    
    if (department_id) {
      query += ` AND e.department_id = $1`;
      params.push(department_id);
    }
    
    query += ' ORDER BY e.full_name ASC';
    
    const result = await pool.query(query, params);
    const employees = result.rows;

    const doc = new PDFDocument({ size: 'A4', margin: 50, bufferPages: true });
    const fontPath = path.join(__dirname, '../fonts/Tajawal-Regular.ttf');
    const fontBoldPath = path.join(__dirname, '../fonts/Tajawal-Bold.ttf');

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=employees_${new Date().toISOString().split('T')[0]}.pdf`);

    doc.pipe(res);

    try {
      doc.registerFont('Arabic', fontPath);
      doc.registerFont('ArabicBold', fontBoldPath);
    } catch (fontError) {
      console.warn('Arabic font not found, using default');
    }

    doc.font('ArabicBold').fontSize(20).fillColor('#10b981')
       .text(reportTitle, { align: 'center' });
    doc.moveDown(0.5);
    doc.font('Arabic').fontSize(10).fillColor('#6b7280')
       .text(`تاريخ التقرير: ${new Date().toLocaleDateString('ar-SA')}`, { align: 'center' });
    doc.moveDown(1);

    doc.fontSize(12).fillColor('#374151');
    doc.text(`إجمالي الموظفين: ${employees.length}`, { align: 'right' });
    doc.moveDown(1);

    employees.forEach((emp, index) => {
      if (doc.y > 700) {
        doc.addPage();
      }

      doc.fontSize(10).fillColor('#1f2937');
      doc.text(`${emp.full_name} - ${emp.department_name || 'بدون قسم'}`, { align: 'right' });
      doc.fontSize(8).fillColor('#6b7280');
      doc.text(`${emp.job_title || '-'} | ${emp.email || '-'}`, { align: 'right' });
      doc.moveDown(0.5);
    });

    doc.end();

  } catch (error) {
    console.error('Error exporting employees to PDF:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'حدث خطأ في تصدير الملف' });
    }
  }
};
