const pool = require('../config/database');
const XLSX = require('xlsx');
const multer = require('multer');
const path = require('path');

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // xlsx
      'application/vnd.ms-excel', // xls
      'text/csv'
    ];
    if (allowedTypes.includes(file.mimetype) || file.originalname.match(/\.(xlsx|xls|csv)$/)) {
      cb(null, true);
    } else {
      cb(new Error('يجب أن يكون الملف Excel أو CSV'), false);
    }
  }
}).single('file');

// Middleware export
exports.uploadMiddleware = upload;

// Get import template
exports.getTemplate = async (req, res) => {
  try {
    // Get departments for reference
    const depts = await pool.query('SELECT id, name FROM departments ORDER BY name');
    
    // Create workbook with template
    const wb = XLSX.utils.book_new();
    
    // Main sheet with headers
    const headers = [
      ['كود الموظف', 'الاسم الكامل *', 'القسم', 'المسمى الوظيفي', 'البريد الإلكتروني', 'رقم الهاتف', 'التحويلة', 'تاريخ التعيين', 'ملاحظات'],
      ['EMP001', 'محمد أحمد', 'تقنية المعلومات', 'مهندس برمجيات', 'mohammed@company.com', '0501234567', '101', '2024-01-15', 'موظف جديد'],
      ['EMP002', 'سارة خالد', 'الموارد البشرية', 'مدير موارد بشرية', 'sara@company.com', '0509876543', '102', '2023-06-01', '']
    ];
    
    const ws = XLSX.utils.aoa_to_sheet(headers);
    
    // Set column widths
    ws['!cols'] = [
      { wch: 15 }, // كود الموظف
      { wch: 25 }, // الاسم الكامل
      { wch: 20 }, // القسم
      { wch: 20 }, // المسمى الوظيفي
      { wch: 30 }, // البريد الإلكتروني
      { wch: 15 }, // رقم الهاتف
      { wch: 10 }, // التحويلة
      { wch: 15 }, // تاريخ التعيين
      { wch: 25 }, // ملاحظات
    ];
    
    XLSX.utils.book_append_sheet(wb, ws, 'الموظفين');
    
    // Departments reference sheet
    const deptData = [['رقم القسم', 'اسم القسم'], ...depts.rows.map(d => [d.id, d.name])];
    const deptWs = XLSX.utils.aoa_to_sheet(deptData);
    deptWs['!cols'] = [{ wch: 12 }, { wch: 25 }];
    XLSX.utils.book_append_sheet(wb, deptWs, 'الأقسام');
    
    // Instructions sheet
    const instructions = [
      ['تعليمات الاستيراد'],
      [''],
      ['1. الحقل المميز بـ * مطلوب (الاسم الكامل)'],
      ['2. يمكن كتابة اسم القسم أو رقمه (راجع ورقة الأقسام)'],
      ['3. تنسيق التاريخ: YYYY-MM-DD (مثال: 2024-01-15)'],
      ['4. كود الموظف يجب أن يكون فريد'],
      ['5. البريد الإلكتروني اختياري لكن يجب أن يكون صحيح الصيغة'],
      ['6. سيتم تجاهل الصفوف الفارغة'],
      ['7. إذا كان الموظف موجود (بنفس الكود) سيتم تحديثه'],
    ];
    const instrWs = XLSX.utils.aoa_to_sheet(instructions);
    instrWs['!cols'] = [{ wch: 60 }];
    XLSX.utils.book_append_sheet(wb, instrWs, 'التعليمات');
    
    // Generate buffer
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=employees_import_template.xlsx');
    res.send(buffer);
  } catch (error) {
    console.error('Error generating template:', error);
    res.status(500).json({ error: 'حدث خطأ في إنشاء القالب' });
  }
};

// Preview import (validate without saving)
exports.previewImport = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'يرجى رفع ملف' });
    }
    
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer', cellDates: true });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    
    if (data.length < 2) {
      return res.status(400).json({ error: 'الملف فارغ أو لا يحتوي على بيانات' });
    }
    
    // Get departments for mapping
    const depts = await pool.query('SELECT id, name FROM departments');
    const deptMap = {};
    depts.rows.forEach(d => {
      deptMap[d.name.toLowerCase()] = d.id;
      deptMap[d.id.toString()] = d.id;
    });
    
    // Get existing employee codes
    const existingCodes = await pool.query('SELECT employee_code FROM employees WHERE is_active = true');
    const existingCodeSet = new Set(existingCodes.rows.map(e => e.employee_code?.toLowerCase()));
    
    const results = {
      valid: [],
      invalid: [],
      updates: [],
      total: 0
    };
    
    // Process rows (skip header)
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (!row || row.length === 0 || !row.some(cell => cell)) continue;
      
      results.total++;
      
      const employee = {
        row: i + 1,
        employee_code: row[0]?.toString()?.trim() || null,
        full_name: row[1]?.toString()?.trim() || null,
        department: row[2]?.toString()?.trim() || null,
        department_id: null,
        job_title: row[3]?.toString()?.trim() || null,
        email: row[4]?.toString()?.trim() || null,
        phone: row[5]?.toString()?.trim() || null,
        extension: row[6]?.toString()?.trim() || null,
        hire_date: null,
        notes: row[8]?.toString()?.trim() || null,
        errors: []
      };
      
      // Parse date
      if (row[7]) {
        if (row[7] instanceof Date) {
          employee.hire_date = row[7].toISOString().split('T')[0];
        } else {
          const dateStr = row[7].toString().trim();
          const dateMatch = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
          if (dateMatch) {
            employee.hire_date = dateStr;
          } else {
            employee.errors.push('تنسيق التاريخ غير صحيح (استخدم YYYY-MM-DD)');
          }
        }
      }
      
      // Validate required fields
      if (!employee.full_name) {
        employee.errors.push('الاسم الكامل مطلوب');
      }
      
      // Map department
      if (employee.department) {
        const deptId = deptMap[employee.department.toLowerCase()];
        if (deptId) {
          employee.department_id = deptId;
        } else {
          employee.errors.push(`القسم "${employee.department}" غير موجود`);
        }
      }
      
      // Validate email format
      if (employee.email && !employee.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
        employee.errors.push('صيغة البريد الإلكتروني غير صحيحة');
      }
      
      // Check if update or new
      const isUpdate = employee.employee_code && existingCodeSet.has(employee.employee_code.toLowerCase());
      
      if (employee.errors.length > 0) {
        results.invalid.push(employee);
      } else if (isUpdate) {
        employee.isUpdate = true;
        results.updates.push(employee);
      } else {
        results.valid.push(employee);
      }
    }
    
    res.json({
      summary: {
        total: results.total,
        valid: results.valid.length,
        updates: results.updates.length,
        invalid: results.invalid.length
      },
      valid: results.valid,
      updates: results.updates,
      invalid: results.invalid
    });
  } catch (error) {
    console.error('Error previewing import:', error);
    res.status(500).json({ error: 'حدث خطأ في معالجة الملف' });
  }
};

// Execute import
exports.executeImport = async (req, res) => {
  const client = await pool.connect();
  
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'يرجى رفع ملف' });
    }
    
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer', cellDates: true });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    
    // Get departments for mapping
    const depts = await client.query('SELECT id, name FROM departments');
    const deptMap = {};
    depts.rows.forEach(d => {
      deptMap[d.name.toLowerCase()] = d.id;
      deptMap[d.id.toString()] = d.id;
    });
    
    // Get existing employees
    const existing = await client.query('SELECT id, employee_code FROM employees WHERE is_active = true');
    const existingMap = {};
    existing.rows.forEach(e => {
      if (e.employee_code) {
        existingMap[e.employee_code.toLowerCase()] = e.id;
      }
    });
    
    await client.query('BEGIN');
    
    const results = {
      inserted: 0,
      updated: 0,
      skipped: 0,
      errors: []
    };
    
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (!row || row.length === 0 || !row.some(cell => cell)) continue;
      
      try {
        const employee_code = row[0]?.toString()?.trim() || null;
        const full_name = row[1]?.toString()?.trim() || null;
        const department = row[2]?.toString()?.trim() || null;
        const job_title = row[3]?.toString()?.trim() || null;
        const email = row[4]?.toString()?.trim() || null;
        const phone = row[5]?.toString()?.trim() || null;
        const extension = row[6]?.toString()?.trim() || null;
        let hire_date = null;
        const notes = row[8]?.toString()?.trim() || null;
        
        // Parse date
        if (row[7]) {
          if (row[7] instanceof Date) {
            hire_date = row[7].toISOString().split('T')[0];
          } else {
            const dateStr = row[7].toString().trim();
            if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
              hire_date = dateStr;
            }
          }
        }
        
        if (!full_name) {
          results.skipped++;
          continue;
        }
        
        // Get department ID
        let department_id = null;
        if (department) {
          department_id = deptMap[department.toLowerCase()] || null;
        }
        
        // Check if update or insert
        const existingId = employee_code ? existingMap[employee_code.toLowerCase()] : null;
        
        if (existingId) {
          // Update
          await client.query(
            `UPDATE employees 
             SET full_name = $1, department_id = $2, job_title = $3, email = $4, 
                 phone = $5, extension = $6, hire_date = $7, notes = $8, updated_at = CURRENT_TIMESTAMP
             WHERE id = $9`,
            [full_name, department_id, job_title, email, phone, extension, hire_date, notes, existingId]
          );
          results.updated++;
        } else {
          // Insert
          await client.query(
            `INSERT INTO employees (employee_code, full_name, department_id, job_title, email, phone, extension, hire_date, notes)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
            [employee_code, full_name, department_id, job_title, email, phone, extension, hire_date, notes]
          );
          results.inserted++;
        }
      } catch (err) {
        results.errors.push({ row: i + 1, error: err.message });
      }
    }
    
    await client.query('COMMIT');
    
    res.json({
      success: true,
      message: `تم استيراد ${results.inserted} موظف جديد وتحديث ${results.updated} موظف`,
      results
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error executing import:', error);
    res.status(500).json({ error: 'حدث خطأ في استيراد البيانات' });
  } finally {
    client.release();
  }
};
