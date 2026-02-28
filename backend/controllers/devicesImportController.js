const pool = require('../config/database');
const XLSX = require('xlsx');
const multer = require('multer');

// Configure multer for file uploads (memory storage)
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    if (
      file.mimetype.includes('spreadsheetml') ||
      file.mimetype.includes('ms-excel') ||
      file.mimetype === 'text/csv' ||
      file.originalname.match(/\.(xlsx|xls|csv)$/)
    ) {
      cb(null, true);
    } else {
      cb(new Error('يجب أن يكون الملف Excel أو CSV'), false);
    }
  }
}).single('file');

exports.uploadMiddleware = upload;

// ───────────────────────────────
// GET /devices/import/template
// ───────────────────────────────
exports.getTemplate = async (req, res) => {
  try {
    const types = await pool.query('SELECT id, name FROM device_types ORDER BY name');

    const wb = XLSX.utils.book_new();

    // Main template sheet
    const headers = [
      [
        'رقم الأصل (Asset Tag)',
        'الماركة (Brand) *',
        'الموديل (Model) *',
        'الرقم التسلسلي (Serial)',
        'نوع الجهاز (Device Type) *',
        'الحالة (Status)',
        'الموقع (Location)',
        'المعالج (CPU)',
        'الذاكرة (RAM)',
        'التخزين (Storage)',
        'نظام التشغيل (OS)',
        'عنوان IP',
        'عنوان MAC',
        'تاريخ الشراء (YYYY-MM-DD)',
        'انتهاء الضمان (YYYY-MM-DD)',
        'سعر الشراء',
        'المورد (Supplier)',
        'ملاحظات'
      ],
      [
        'PC-001', 'Dell', 'OptiPlex 7090', 'SN123456', 'Computer',
        'active', 'Floor 2', 'Intel Core i7', '16GB', '512GB SSD',
        'Windows 11', '192.168.1.10', 'AA:BB:CC:DD:EE:FF',
        '2023-01-15', '2026-01-15', '2500', 'Al-Jazeera Trading', ''
      ],
      [
        'LT-002', 'HP', 'EliteBook 840', 'SN789012', 'Laptop',
        'active', 'HR Office', 'Intel Core i5', '8GB', '256GB SSD',
        'Windows 10', '192.168.1.20', '', '2022-06-01', '2025-06-01',
        '1800', '', 'للمدير المالي'
      ]
    ];

    const ws = XLSX.utils.aoa_to_sheet(headers);
    ws['!cols'] = [
      { wch: 18 }, { wch: 12 }, { wch: 18 }, { wch: 18 }, { wch: 16 },
      { wch: 12 }, { wch: 16 }, { wch: 18 }, { wch: 10 }, { wch: 14 },
      { wch: 14 }, { wch: 16 }, { wch: 18 }, { wch: 18 }, { wch: 18 },
      { wch: 12 }, { wch: 20 }, { wch: 25 }
    ];
    XLSX.utils.book_append_sheet(wb, ws, 'الأجهزة');

    // Device types reference sheet
    const typeData = [
      ['رقم النوع', 'اسم النوع'],
      ...types.rows.map(t => [t.id, t.name])
    ];
    const typeWs = XLSX.utils.aoa_to_sheet(typeData);
    typeWs['!cols'] = [{ wch: 12 }, { wch: 25 }];
    XLSX.utils.book_append_sheet(wb, typeWs, 'أنواع الأجهزة');

    // Status reference
    const statusData = [
      ['كود الحالة', 'الوصف'],
      ['active', 'نشط / يعمل'],
      ['inactive', 'غير نشط'],
      ['maintenance', 'تحت الصيانة'],
      ['retired', 'مسحوب من الخدمة']
    ];
    const statusWs = XLSX.utils.aoa_to_sheet(statusData);
    statusWs['!cols'] = [{ wch: 14 }, { wch: 22 }];
    XLSX.utils.book_append_sheet(wb, statusWs, 'حالات الجهاز');

    // Instructions
    const instructions = [
      ['تعليمات الاستيراد'],
      [''],
      ['الحقول المميزة بـ * مطلوبة: الماركة، الموديل، نوع الجهاز'],
      ['يمكن كتابة اسم نوع الجهاز أو رقمه (راجع ورقة أنواع الأجهزة)'],
      ['تنسيق التاريخ: YYYY-MM-DD (مثال: 2024-01-15)'],
      ['رقم الأصل (Asset Tag) يجب أن يكون فريداً إذا تم إدخاله'],
      ['إذا كان Asset Tag موجود مسبقاً سيتم تحديث الجهاز'],
      ['سيتم تجاهل الصفوف الفارغة تلقائياً'],
    ];
    const instrWs = XLSX.utils.aoa_to_sheet(instructions);
    instrWs['!cols'] = [{ wch: 65 }];
    XLSX.utils.book_append_sheet(wb, instrWs, 'التعليمات');

    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=devices_import_template.xlsx');
    res.send(buffer);
  } catch (error) {
    console.error('Error generating template:', error);
    res.status(500).json({ error: 'حدث خطأ في إنشاء القالب' });
  }
};

// ───────────────────────────────
// POST /devices/import/preview
// ───────────────────────────────
exports.previewImport = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'يرجى رفع ملف' });

    const workbook = XLSX.read(req.file.buffer, { type: 'buffer', cellDates: true });
    const sheetName = workbook.SheetNames[0];
    const data = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1 });

    if (data.length < 2) return res.status(400).json({ error: 'الملف فارغ أو لا يحتوي على بيانات' });

    // Build device_type lookup (name → id)
    const types = await pool.query('SELECT id, name FROM device_types');
    const typeMap = {};
    types.rows.forEach(t => {
      typeMap[t.name.toLowerCase()] = t.id;
      typeMap[t.id.toString()] = t.id;
    });

    // Existing asset tags
    const existingTags = await pool.query('SELECT asset_tag FROM devices WHERE asset_tag IS NOT NULL');
    const existingTagSet = new Set(existingTags.rows.map(d => d.asset_tag?.toLowerCase()));

    const results = { valid: [], invalid: [], updates: [], total: 0 };

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (!row || row.length === 0 || !row.some(cell => cell !== null && cell !== undefined && cell !== '')) continue;

      results.total++;

      const device = {
        row: i + 1,
        asset_tag: row[0]?.toString()?.trim() || null,
        brand: row[1]?.toString()?.trim() || null,
        model: row[2]?.toString()?.trim() || null,
        serial_number: row[3]?.toString()?.trim() || null,
        device_type_name: row[4]?.toString()?.trim() || null,
        device_type_id: null,
        status: row[5]?.toString()?.trim()?.toLowerCase() || 'active',
        location: row[6]?.toString()?.trim() || null,
        cpu: row[7]?.toString()?.trim() || null,
        ram: row[8]?.toString()?.trim() || null,
        storage: row[9]?.toString()?.trim() || null,
        os: row[10]?.toString()?.trim() || null,
        ip_address: row[11]?.toString()?.trim() || null,
        mac_address: row[12]?.toString()?.trim() || null,
        purchase_date: null,
        warranty_end: null,
        purchase_price: null,
        supplier: row[16]?.toString()?.trim() || null,
        notes: row[17]?.toString()?.trim() || null,
        errors: []
      };

      // Parse dates
      device.purchase_date = parseDate(row[13]);
      device.warranty_end = parseDate(row[14]);
      if (row[13] && !device.purchase_date) device.errors.push('تنسيق تاريخ الشراء غير صحيح (YYYY-MM-DD)');
      if (row[14] && !device.warranty_end) device.errors.push('تنسيق تاريخ انتهاء الضمان غير صحيح (YYYY-MM-DD)');

      // Parse price
      if (row[15]) {
        const price = parseFloat(row[15].toString().replace(/[^0-9.]/g, ''));
        device.purchase_price = isNaN(price) ? null : price;
      }

      // Validate required
      if (!device.brand) device.errors.push('الماركة مطلوبة');
      if (!device.model) device.errors.push('الموديل مطلوب');

      // Map device type
      if (!device.device_type_name) {
        device.errors.push('نوع الجهاز مطلوب');
      } else {
        const typeId = typeMap[device.device_type_name.toLowerCase()];
        if (typeId) {
          device.device_type_id = typeId;
        } else {
          device.errors.push(`نوع الجهاز "${device.device_type_name}" غير موجود - راجع ورقة أنواع الأجهزة`);
        }
      }

      // Validate status
      const validStatuses = ['active', 'inactive', 'maintenance', 'retired'];
      if (device.status && !validStatuses.includes(device.status)) {
        device.errors.push(`الحالة "${device.status}" غير صحيحة - القيم المقبولة: ${validStatuses.join(', ')}`);
      }

      const isUpdate = device.asset_tag && existingTagSet.has(device.asset_tag.toLowerCase());

      if (device.errors.length > 0) {
        results.invalid.push(device);
      } else if (isUpdate) {
        device.isUpdate = true;
        results.updates.push(device);
      } else {
        results.valid.push(device);
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
    console.error('Error previewing device import:', error);
    res.status(500).json({ error: 'حدث خطأ في معالجة الملف' });
  }
};

// ───────────────────────────────
// POST /devices/import/execute
// ───────────────────────────────
exports.executeImport = async (req, res) => {
  const client = await pool.connect();
  try {
    if (!req.file) return res.status(400).json({ error: 'يرجى رفع ملف' });

    const workbook = XLSX.read(req.file.buffer, { type: 'buffer', cellDates: true });
    const sheetName = workbook.SheetNames[0];
    const data = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1 });

    // Build type lookup
    const types = await client.query('SELECT id, name FROM device_types');
    const typeMap = {};
    types.rows.forEach(t => {
      typeMap[t.name.toLowerCase()] = t.id;
      typeMap[t.id.toString()] = t.id;
    });

    // Existing asset tags → id map
    const existing = await client.query('SELECT id, asset_tag FROM devices WHERE asset_tag IS NOT NULL');
    const existingMap = {};
    existing.rows.forEach(d => {
      if (d.asset_tag) existingMap[d.asset_tag.toLowerCase()] = d.id;
    });

    await client.query('BEGIN');

    const results = { inserted: 0, updated: 0, skipped: 0, errors: [] };

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (!row || row.length === 0 || !row.some(cell => cell !== null && cell !== undefined && cell !== '')) continue;

      try {
        const asset_tag    = row[0]?.toString()?.trim() || null;
        const brand        = row[1]?.toString()?.trim() || null;
        const model        = row[2]?.toString()?.trim() || null;
        const serial_number = row[3]?.toString()?.trim() || null;
        const typeName     = row[4]?.toString()?.trim() || null;
        const status       = row[5]?.toString()?.trim()?.toLowerCase() || 'active';
        const location     = row[6]?.toString()?.trim() || null;
        const cpu          = row[7]?.toString()?.trim() || null;
        const ram          = row[8]?.toString()?.trim() || null;
        const storage      = row[9]?.toString()?.trim() || null;
        const os           = row[10]?.toString()?.trim() || null;
        const ip_address   = row[11]?.toString()?.trim() || null;
        const mac_address  = row[12]?.toString()?.trim() || null;
        const purchase_date  = parseDate(row[13]);
        const warranty_end   = parseDate(row[14]);
        const purchase_price = row[15] ? parseFloat(row[15].toString().replace(/[^0-9.]/g, '')) || null : null;
        const supplier     = row[16]?.toString()?.trim() || null;
        const notes        = row[17]?.toString()?.trim() || null;

        if (!brand || !model) { results.skipped++; continue; }

        const device_type_id = typeName ? (typeMap[typeName.toLowerCase()] || null) : null;
        if (!device_type_id) { results.skipped++; continue; }

        const existingId = asset_tag ? existingMap[asset_tag.toLowerCase()] : null;

        if (existingId) {
          await client.query(
            `UPDATE devices SET
               brand=$1, model=$2, serial_number=$3, device_type_id=$4, status=$5,
               location=$6, cpu=$7, ram=$8, storage=$9, os=$10,
               ip_address=$11, mac_address=$12, purchase_date=$13, warranty_end=$14,
               purchase_price=$15, supplier=$16, notes=$17, updated_at=CURRENT_TIMESTAMP
             WHERE id=$18`,
            [brand, model, serial_number, device_type_id, status,
             location, cpu, ram, storage, os,
             ip_address, mac_address, purchase_date, warranty_end,
             purchase_price, supplier, notes, existingId]
          );
          results.updated++;
        } else {
          await client.query(
            `INSERT INTO devices
               (asset_tag, brand, model, serial_number, device_type_id, status,
                location, cpu, ram, storage, os, ip_address, mac_address,
                purchase_date, warranty_end, purchase_price, supplier, notes)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)`,
            [asset_tag, brand, model, serial_number, device_type_id, status,
             location, cpu, ram, storage, os, ip_address, mac_address,
             purchase_date, warranty_end, purchase_price, supplier, notes]
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
      message: `تم إضافة ${results.inserted} جهاز جديد وتحديث ${results.updated} جهاز`,
      results
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error executing device import:', error);
    res.status(500).json({ error: 'حدث خطأ في استيراد البيانات' });
  } finally {
    client.release();
  }
};

// ─── Helper ───────────────────────
function parseDate(value) {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString().split('T')[0];
  const s = value.toString().trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  return null;
}
