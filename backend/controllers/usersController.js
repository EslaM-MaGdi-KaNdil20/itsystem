const pool = require('../config/database');
const bcrypt = require('bcrypt');

// Default empty permissions — all false
const DEFAULT_PERMISSIONS = {
  dashboard: false,
  devices_view: false,         devices_manage: false,
  assignments_view: false,     assignments_manage: false,
  maintenance_view: false,     maintenance_manage: false,
  departments_view: false,     departments_manage: false,
  employees_view: false,       employees_manage: false,
  products_view: false,        products_manage: false,
  categories_view: false,      categories_manage: false,
  accessories_view: false,     accessories_manage: false,
  licenses_view: false,        licenses_manage: false,
  tickets_view: false,         tickets_manage: false,
  it_subscriptions_view: false, it_subscriptions_manage: false,
  it_servers_view: false,      it_servers_manage: false,
  it_password_vault_view: false, it_password_vault_manage: false,
  it_network_ips_view: false,  it_network_ips_manage: false,
  it_email_accounts_view: false, it_email_accounts_manage: false,
  it_user_guides_view: false,  it_user_guides_manage: false,
  email_broadcast: false,
  activity_logs: false,
  settings: false,
  user_management: false,
};

exports.DEFAULT_PERMISSIONS = DEFAULT_PERMISSIONS;

// GET all users (except passwords)
exports.getAll = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, email, full_name, role, phone, avatar, is_active, permissions, created_at, updated_at
       FROM users ORDER BY id ASC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'حدث خطأ في جلب المستخدمين' });
  }
};

// GET single user
exports.getOne = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, email, full_name, role, phone, avatar, is_active, permissions, created_at, updated_at
       FROM users WHERE id = $1`,
      [req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'المستخدم غير موجود' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'حدث خطأ' });
  }
};

// POST create user
exports.create = async (req, res) => {
  try {
    const { email, password, full_name, role = 'user', phone, permissions } = req.body;
    if (!email || !password || !full_name) {
      return res.status(400).json({ error: 'الاسم والإيميل وكلمة المرور مطلوبة' });
    }

    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length) return res.status(409).json({ error: 'الإيميل مستخدم بالفعل' });

    const hashed = await bcrypt.hash(password, 10);
    const perms = permissions || DEFAULT_PERMISSIONS;

    const result = await pool.query(
      `INSERT INTO users (email, password, full_name, role, phone, permissions, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, true)
       RETURNING id, email, full_name, role, phone, is_active, permissions, created_at`,
      [email, hashed, full_name, role, phone || null, JSON.stringify(perms)]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'حدث خطأ في إنشاء المستخدم' });
  }
};

// PUT update user info (no password)
exports.update = async (req, res) => {
  try {
    const { full_name, email, role, phone, is_active } = req.body;
    const { id } = req.params;

    // Prevent demoting super_admin
    const existing = await pool.query('SELECT role FROM users WHERE id = $1', [id]);
    if (!existing.rows.length) return res.status(404).json({ error: 'المستخدم غير موجود' });
    if (existing.rows[0].role === 'super_admin' && role && role !== 'super_admin') {
      return res.status(403).json({ error: 'لا يمكن تغيير صلاحيات السوبر ادمن' });
    }

    const result = await pool.query(
      `UPDATE users SET
         full_name = COALESCE($1, full_name),
         email     = COALESCE($2, email),
         role      = COALESCE($3, role),
         phone     = COALESCE($4, phone),
         is_active = COALESCE($5, is_active),
         updated_at = CURRENT_TIMESTAMP
       WHERE id = $6
       RETURNING id, email, full_name, role, phone, is_active, permissions, created_at, updated_at`,
      [full_name, email, role, phone, is_active, id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'حدث خطأ في تحديث المستخدم' });
  }
};

// PUT update permissions only
exports.updatePermissions = async (req, res) => {
  try {
    const { id } = req.params;
    const { permissions } = req.body;

    const existing = await pool.query('SELECT role FROM users WHERE id = $1', [id]);
    if (!existing.rows.length) return res.status(404).json({ error: 'المستخدم غير موجود' });
    if (existing.rows[0].role === 'super_admin') {
      return res.status(403).json({ error: 'السوبر ادمن لديه كل الصلاحيات دائماً' });
    }

    const result = await pool.query(
      `UPDATE users SET permissions = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING id, email, full_name, role, permissions`,
      [JSON.stringify(permissions), id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'حدث خطأ في تحديث الصلاحيات' });
  }
};

// PUT change password
exports.changePassword = async (req, res) => {
  try {
    const { id } = req.params;
    const { password } = req.body;
    if (!password || password.length < 6) {
      return res.status(400).json({ error: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' });
    }
    const hashed = await bcrypt.hash(password, 10);
    await pool.query(
      'UPDATE users SET password = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [hashed, id]
    );
    res.json({ success: true, message: 'تم تغيير كلمة المرور' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'حدث خطأ في تغيير كلمة المرور' });
  }
};

// DELETE user
exports.remove = async (req, res) => {
  try {
    const { id } = req.params;
    // Prevent deleting own account or super_admin
    if (parseInt(id) === req.user?.id) {
      return res.status(403).json({ error: 'لا يمكنك حذف حسابك الخاص' });
    }
    const existing = await pool.query('SELECT role FROM users WHERE id = $1', [id]);
    if (!existing.rows.length) return res.status(404).json({ error: 'المستخدم غير موجود' });
    if (existing.rows[0].role === 'super_admin') {
      return res.status(403).json({ error: 'لا يمكن حذف حساب السوبر ادمن' });
    }
    await pool.query('DELETE FROM users WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'حدث خطأ في حذف المستخدم' });
  }
};
