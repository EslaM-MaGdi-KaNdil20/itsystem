const pool = require('../config/database');
const XLSX = require('xlsx');
const multer = require('multer');

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv'
    ];
    if (allowedTypes.includes(file.mimetype) || file.originalname.match(/\.(xlsx|xls|csv)$/)) {
      cb(null, true);
    } else {
      cb(new Error('يجب أن يكون الملف Excel أو CSV'), false);
    }
  }
}).single('file');

exports.uploadMiddleware = upload;

// Get import template
exports.getTemplate = async (req, res) => {
  try {
    const wb = XLSX.utils.book_new();
    
    // Main sheet with headers and examples
    const headers = [
      ['كود القسم', 'اسم القسم *', 'الموقع', 'اسم المدير', 'رقم الهاتف'],
      ['IT', 'تقنية المعلومات', 'المبنى الرئيسي - الطابق 2', 'أحمد محمد', '0501234567'],
      ['HR', 'الموارد البشرية', 'المبنى الرئيسي - الطابق 1', 'سارة خالد', '0509876543'],
      ['FIN', 'المالية', 'المبنى الرئيسي - الطابق 3', 'محمد علي', '0505555555']
    ];
    
    const ws = XLSX.utils.aoa_to_sheet(headers);
    ws['!cols'] = [
      { wch: 15 },
      { wch: 25 },
      { wch: 30 },
      { wch: 20 },
      { wch: 15 }
    ];
    
    XLSX.utils.book_append_sheet(wb, ws, 'الأقسام');
    
    // Instructions sheet
    const instructions = [
      ['تعليمات الاستيراد'],
      [''],
      ['1. الحقل المميز بـ * مطلوب (اسم القسم)'],
      ['2. كود القسم اختياري لكن يجب أن يكون فريد إذا تم إدخاله'],
      ['3. إذا كان القسم موجود (بنفس الكود) سيتم تحديثه'],
      ['4. سيتم تجاهل الصفوف الفارغة'],
      ['5. يمكن إضافة أقسام متعددة في ملف واحد']
    ];
    const instrWs = XLSX.utils.aoa_to_sheet(instructions);
    instrWs['!cols'] = [{ wch: 60 }];
    XLSX.utils.book_append_sheet(wb, instrWs, 'التعليمات');
    
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=departments_import_template.xlsx');
    res.send(buffer);
  } catch (error) {
    console.error('Error generating template:', error);
    res.status(500).json({ error: 'حدث خطأ في إنشاء القالب' });
  }
};

// Preview import
exports.previewImport = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'يرجى رفع ملف' });
    }
    
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    
    if (data.length < 2) {
      return res.status(400).json({ error: 'الملف فارغ أو لا يحتوي على بيانات' });
    }
    
    // Get existing department codes
    const existing = await pool.query('SELECT code FROM departments WHERE is_active = true AND code IS NOT NULL');
    const existingCodes = new Set(existing.rows.map(d => d.code?.toLowerCase()));
    
    const results = {
      valid: [],
      invalid: [],
      updates: [],
      total: 0
    };
    
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (!row || row.length === 0 || !row.some(cell => cell)) continue;
      
      results.total++;
      
      const dept = {
        row: i + 1,
        code: row[0]?.toString()?.trim() || null,
        name: row[1]?.toString()?.trim() || null,
        location: row[2]?.toString()?.trim() || null,
        manager_name: row[3]?.toString()?.trim() || null,
        phone: row[4]?.toString()?.trim() || null,
        errors: []
      };
      
      if (!dept.name) {
        dept.errors.push('اسم القسم مطلوب');
      }
      
      const isUpdate = dept.code && existingCodes.has(dept.code.toLowerCase());
      
      if (dept.errors.length > 0) {
        results.invalid.push(dept);
      } else if (isUpdate) {
        dept.isUpdate = true;
        results.updates.push(dept);
      } else {
        results.valid.push(dept);
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
    
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    
    // Get existing departments
    const existing = await client.query('SELECT id, code FROM departments WHERE is_active = true');
    const existingMap = {};
    existing.rows.forEach(d => {
      if (d.code) {
        existingMap[d.code.toLowerCase()] = d.id;
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
        const code = row[0]?.toString()?.trim() || null;
        const name = row[1]?.toString()?.trim() || null;
        const location = row[2]?.toString()?.trim() || null;
        const manager_name = row[3]?.toString()?.trim() || null;
        const phone = row[4]?.toString()?.trim() || null;
        
        if (!name) {
          results.skipped++;
          continue;
        }
        
        const existingId = code ? existingMap[code.toLowerCase()] : null;
        
        if (existingId) {
          await client.query(
            `UPDATE departments 
             SET name = $1, location = $2, manager_name = $3, phone = $4, updated_at = CURRENT_TIMESTAMP
             WHERE id = $5`,
            [name, location, manager_name, phone, existingId]
          );
          results.updated++;
        } else {
          await client.query(
            `INSERT INTO departments (code, name, location, manager_name, phone)
             VALUES ($1, $2, $3, $4, $5)`,
            [code, name, location, manager_name, phone]
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
      message: `تم استيراد ${results.inserted} قسم جديد وتحديث ${results.updated} قسم`,
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
