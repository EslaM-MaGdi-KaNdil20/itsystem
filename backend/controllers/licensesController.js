const pool = require('../config/database');
const { logActivity, ACTIONS } = require('./activityLogController');

// ─── helpers ──────────────────────────────────────────────────────────────────
const assignedCount = `
  (SELECT COUNT(*) FROM license_assignments la
   WHERE la.license_id = l.id AND la.is_current = true)::int
`;

// ══════════════════════════════════════════════════════════════════════════════
// LICENSES (pool)
// ══════════════════════════════════════════════════════════════════════════════

exports.getAll = async (req, res) => {
  try {
    const { type, expiring } = req.query;
    let where = 'WHERE 1=1';
    const params = [];
    if (type) { params.push(type); where += ` AND l.type = $${params.length}`; }
    if (expiring === 'soon') {
      where += ` AND l.expiry_date IS NOT NULL AND l.expiry_date <= CURRENT_DATE + INTERVAL '60 days'`;
    }

    const result = await pool.query(`
      SELECT l.*,
        ${assignedCount} AS assigned_count,
        (l.total_quantity - ${assignedCount}) AS available_count
      FROM licenses l
      ${where}
      ORDER BY l.type, l.name
    `, params);

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'حدث خطأ في جلب الليسنز' });
  }
};

exports.getById = async (req, res) => {
  try {
    const { id } = req.params;
    const lic = await pool.query(`
      SELECT l.*,
        ${assignedCount} AS assigned_count,
        (l.total_quantity - ${assignedCount}) AS available_count
      FROM licenses l WHERE l.id = $1
    `, [id]);

    if (!lic.rows.length) return res.status(404).json({ error: 'الليسنز غير موجود' });

    const assignments = await pool.query(`
      SELECT la.*,
        e.full_name  AS employee_name,
        e.job_title  AS employee_title,
        d.name       AS department_name,
        dev.asset_tag, dev.brand, dev.model, dev.serial_number
      FROM license_assignments la
      LEFT JOIN employees  e   ON la.employee_id = e.id
      LEFT JOIN departments d  ON e.department_id = d.id
      LEFT JOIN devices    dev ON la.device_id = dev.id
      WHERE la.license_id = $1
      ORDER BY la.is_current DESC, la.assigned_date DESC
    `, [id]);

    res.json({ ...lic.rows[0], assignments: assignments.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'حدث خطأ' });
  }
};

exports.create = async (req, res) => {
  try {
    const {
      name, vendor, version, type, key_type, license_key,
      total_quantity, purchase_date, expiry_date,
      cost_per_unit, currency, notes
    } = req.body;

    const result = await pool.query(`
      INSERT INTO licenses
        (name, vendor, version, type, key_type, license_key,
         total_quantity, purchase_date, expiry_date, cost_per_unit, currency, notes)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
      RETURNING *
    `, [name, vendor, version || null, type || 'other', key_type || 'volume',
        license_key || null, total_quantity || 1,
        purchase_date || null, expiry_date || null,
        cost_per_unit || null, currency || 'EGP', notes || null]);

    logActivity(req, ACTIONS.CREATE, 'license', result.rows[0].id, name,
      `تم إضافة ليسنز: ${name}`);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'حدث خطأ في إنشاء الليسنز' });
  }
};

exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name, vendor, version, type, key_type, license_key,
      total_quantity, purchase_date, expiry_date,
      cost_per_unit, currency, notes
    } = req.body;

    const result = await pool.query(`
      UPDATE licenses SET
        name=$1, vendor=$2, version=$3, type=$4, key_type=$5, license_key=$6,
        total_quantity=$7, purchase_date=$8, expiry_date=$9,
        cost_per_unit=$10, currency=$11, notes=$12, updated_at=NOW()
      WHERE id=$13 RETURNING *
    `, [name, vendor, version || null, type, key_type,
        license_key || null, total_quantity,
        purchase_date || null, expiry_date || null,
        cost_per_unit || null, currency || 'EGP', notes || null, id]);

    if (!result.rows.length) return res.status(404).json({ error: 'الليسنز غير موجود' });
    logActivity(req, ACTIONS.UPDATE, 'license', id, name, `تم تعديل ليسنز: ${name}`);
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'حدث خطأ في التعديل' });
  }
};

exports.deleteLicense = async (req, res) => {
  try {
    const { id } = req.params;
    const lic = await pool.query('SELECT name FROM licenses WHERE id=$1', [id]);
    if (!lic.rows.length) return res.status(404).json({ error: 'الليسنز غير موجود' });
    await pool.query('DELETE FROM licenses WHERE id=$1', [id]);
    logActivity(req, ACTIONS.DELETE, 'license', id, lic.rows[0].name,
      `تم حذف ليسنز: ${lic.rows[0].name}`);
    res.json({ message: 'تم الحذف' });
  } catch (err) {
    res.status(500).json({ error: 'حدث خطأ في الحذف' });
  }
};

// ══════════════════════════════════════════════════════════════════════════════
// ASSIGNMENTS
// ══════════════════════════════════════════════════════════════════════════════

exports.assign = async (req, res) => {
  try {
    const { license_id, device_id, employee_id, license_key, assigned_date, assigned_by, notes } = req.body;

    // Check availability
    const lic = await pool.query(`
      SELECT l.name, l.total_quantity, ${assignedCount} AS assigned_count
      FROM licenses l WHERE l.id = $1
    `, [license_id]);
    if (!lic.rows.length) return res.status(404).json({ error: 'الليسنز غير موجود' });

    const { name, total_quantity, assigned_count } = lic.rows[0];
    if (assigned_count >= total_quantity) {
      return res.status(400).json({ error: `لا توجد نسخ متاحة من "${name}" — المخزون نفد` });
    }

    const result = await pool.query(`
      INSERT INTO license_assignments
        (license_id, device_id, employee_id, license_key, assigned_date, assigned_by, notes)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [license_id, device_id || null, employee_id || null,
        license_key || null, assigned_date || new Date().toISOString().split('T')[0],
        assigned_by || null, notes || null]);

    logActivity(req, ACTIONS.CREATE, 'license_assignment', result.rows[0].id, name,
      `تم تعيين ليسنز "${name}"`);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'حدث خطأ في التعيين' });
  }
};

exports.revokeAssignment = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(`
      UPDATE license_assignments
      SET is_current=false, returned_date=CURRENT_DATE, updated_at=NOW()
      WHERE id=$1 RETURNING *
    `, [id]);
    if (!result.rows.length) return res.status(404).json({ error: 'التعيين غير موجود' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'حدث خطأ' });
  }
};

exports.deleteAssignment = async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM license_assignments WHERE id=$1', [id]);
    res.json({ message: 'تم الحذف' });
  } catch (err) {
    res.status(500).json({ error: 'حدث خطأ في الحذف' });
  }
};

// ── Stats for dashboard ───────────────────────────────────────────────────────
exports.getStats = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        COUNT(*)::int AS total_licenses,
        SUM(l.total_quantity)::int AS total_seats,
        SUM(${assignedCount})::int AS assigned_seats,
        SUM(l.total_quantity - ${assignedCount})::int AS available_seats,
        COUNT(*) FILTER (WHERE l.expiry_date IS NOT NULL AND l.expiry_date <= CURRENT_DATE + INTERVAL '60 days')::int AS expiring_soon,
        COUNT(*) FILTER (WHERE l.expiry_date IS NOT NULL AND l.expiry_date < CURRENT_DATE)::int AS expired
      FROM licenses l
    `);
    const byType = await pool.query(`
      SELECT l.type,
        COUNT(*)::int AS count,
        SUM(l.total_quantity)::int AS seats,
        SUM(${assignedCount})::int AS assigned
      FROM licenses l GROUP BY l.type ORDER BY seats DESC
    `);
    res.json({ ...result.rows[0], by_type: byType.rows });
  } catch (err) {
    res.status(500).json({ error: 'حدث خطأ في الإحصائيات' });
  }
};

// ── Employee licenses (for employee detail page) ──────────────────────────────
exports.getEmployeeLicenses = async (req, res) => {
  try {
    const { employee_id } = req.params;
    const result = await pool.query(`
      SELECT la.*, l.name, l.vendor, l.type, l.version,
        dev.asset_tag, dev.brand, dev.model
      FROM license_assignments la
      JOIN licenses l ON la.license_id = l.id
      LEFT JOIN devices dev ON la.device_id = dev.id
      WHERE la.employee_id = $1 AND la.is_current = true
      ORDER BY l.type, l.name
    `, [employee_id]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'حدث خطأ' });
  }
};
