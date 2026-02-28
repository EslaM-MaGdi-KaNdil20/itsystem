const pool = require('../config/database');
const nodemailer = require('nodemailer');

// Email transporter (same config as emailService)
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.EMAIL_PORT) || 587,
  secure: parseInt(process.env.EMAIL_PORT) === 465,
  auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASSWORD },
  connectionTimeout: 10000,
  greetingTimeout: 10000,
  socketTimeout: 10000,
});

// ─── helper: send assignment email & bell notification ─────────────────────
async function notifyAssignee(task, assigneeUser, assignerUser) {
  // 1. Bell notification
  try {
    await pool.query(
      `INSERT INTO notifications (type, title, message, link, ref_id, user_id)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        'task_assigned',
        `📋 مهمة جديدة: ${task.title}`,
        `تم تعيين مهمة "${task.title}" لك بواسطة ${assignerUser?.full_name || 'النظام'}`,
        '/tasks',
        task.id,
        assigneeUser.id
      ]
    );
  } catch (e) {
    console.error('Notification insert error:', e.message);
  }

  // 2. Email notification
  if (!assigneeUser.email) return;
  try {
    const priorityLabel = { low: '🟢 منخفضة', medium: '🟡 متوسطة', high: '🟠 عالية', urgent: '🔴 عاجلة' };
    await transporter.sendMail({
      from: `"IT System" <${process.env.EMAIL_USER}>`,
      to: assigneeUser.email,
      subject: `📋 مهمة جديدة بانتظارك: ${task.title}`,
      html: `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head><meta charset="UTF-8">
      <style>
        body { font-family: 'Segoe UI', sans-serif; background:#f4f4f4; padding:20px; direction:rtl; }
        .container { max-width:600px; margin:0 auto; background:#fff; border-radius:12px; overflow:hidden; box-shadow:0 2px 12px rgba(0,0,0,.12); }
        .header { background:linear-gradient(135deg,#6366f1,#4f46e5); color:#fff; padding:28px 30px; }
        .header h1 { margin:0; font-size:22px; }
        .header p { margin:6px 0 0; opacity:.85; font-size:14px; }
        .body { padding:28px 30px; }
        .field { margin-bottom:14px; }
        .label { font-size:12px; color:#6b7280; margin-bottom:2px; }
        .value { font-size:15px; font-weight:600; color:#111; }
        .badge { display:inline-block; padding:3px 10px; border-radius:20px; font-size:13px; font-weight:600; }
        .footer { background:#f9fafb; padding:16px 30px; font-size:12px; color:#9ca3af; text-align:center; border-top:1px solid #e5e7eb; }
        .btn { display:inline-block; background:#4f46e5; color:#fff; text-decoration:none; padding:10px 24px; border-radius:8px; font-weight:600; margin-top:18px; }
      </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📋 تم تعيين مهمة لك</h1>
            <p>مرحباً ${assigneeUser.full_name}، لديك مهمة جديدة بانتظارك</p>
          </div>
          <div class="body">
            <div class="field">
              <div class="label">عنوان المهمة</div>
              <div class="value">${task.title}</div>
            </div>
            ${task.description ? `<div class="field"><div class="label">التفاصيل</div><div class="value" style="font-weight:400">${task.description}</div></div>` : ''}
            <div class="field">
              <div class="label">الأولوية</div>
              <div class="value">${priorityLabel[task.priority] || task.priority}</div>
            </div>
            ${task.due_date ? `<div class="field"><div class="label">تاريخ الاستحقاق</div><div class="value">${new Date(task.due_date).toLocaleDateString('ar-EG')}</div></div>` : ''}
            <div class="field">
              <div class="label">تم التعيين بواسطة</div>
              <div class="value">${assignerUser?.full_name || 'النظام'}</div>
            </div>
            <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/tasks" class="btn">عرض المهمة</a>
          </div>
          <div class="footer">IT Asset Management System</div>
        </div>
      </body>
      </html>`
    });
  } catch (e) {
    console.error('Task email error:', e.message);
  }
}

// ─── GET /api/tasks ────────────────────────────────────────────────────────
exports.getAll = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT t.*,
        u1.full_name AS assigned_to_name, u1.email AS assigned_to_email, u1.avatar AS assigned_to_avatar,
        u2.full_name AS created_by_name
      FROM tasks t
      LEFT JOIN users u1 ON t.assigned_to = u1.id
      LEFT JOIN users u2 ON t.created_by = u2.id
      ORDER BY t.status, t.position, t.created_at DESC
    `);
    res.json(result.rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'حدث خطأ' });
  }
};

// ─── GET /api/tasks/:id ───────────────────────────────────────────────────
exports.getById = async (req, res) => {
  try {
    const task = await pool.query(`
      SELECT t.*,
        u1.full_name AS assigned_to_name, u1.email AS assigned_to_email, u1.avatar AS assigned_to_avatar,
        u2.full_name AS created_by_name
      FROM tasks t
      LEFT JOIN users u1 ON t.assigned_to = u1.id
      LEFT JOIN users u2 ON t.created_by = u2.id
      WHERE t.id = $1
    `, [req.params.id]);

    if (!task.rows.length) return res.status(404).json({ error: 'المهمة غير موجودة' });

    const comments = await pool.query(`
      SELECT tc.*, u.full_name AS user_name, u.avatar
      FROM task_comments tc
      LEFT JOIN users u ON tc.user_id = u.id
      WHERE tc.task_id = $1
      ORDER BY tc.created_at ASC
    `, [req.params.id]);

    res.json({ ...task.rows[0], comments: comments.rows });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'حدث خطأ' });
  }
};

// ─── POST /api/tasks ──────────────────────────────────────────────────────
exports.create = async (req, res) => {
  try {
    const { title, description, status = 'todo', priority = 'medium', assigned_to, due_date, related_type, related_id } = req.body;
    if (!title) return res.status(400).json({ error: 'عنوان المهمة مطلوب' });

    const created_by = req.user?.id || null;

    // Get max position in that column
    const posResult = await pool.query(`SELECT COALESCE(MAX(position), -1) + 1 AS pos FROM tasks WHERE status = $1`, [status]);
    const position = posResult.rows[0].pos;

    const result = await pool.query(`
      INSERT INTO tasks (title, description, status, priority, position, assigned_to, created_by, due_date, related_type, related_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `, [title, description, status, priority, position, assigned_to || null, created_by, due_date || null, related_type || null, related_id || null]);

    const newTask = result.rows[0];

    // Notify assignee if assigned
    if (assigned_to) {
      const assignee = await pool.query('SELECT id, full_name, email FROM users WHERE id = $1', [assigned_to]);
      const assigner = req.user ? await pool.query('SELECT full_name FROM users WHERE id = $1', [req.user.id]) : { rows: [{ full_name: 'النظام' }] };
      if (assignee.rows.length) {
        await notifyAssignee(newTask, assignee.rows[0], assigner.rows[0]);
      }
    }

    res.status(201).json(newTask);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'حدث خطأ في إنشاء المهمة' });
  }
};

// ─── PUT /api/tasks/:id ───────────────────────────────────────────────────
exports.update = async (req, res) => {
  try {
    const { title, description, status, priority, due_date, related_type, related_id } = req.body;
    const { id } = req.params;

    const current = await pool.query('SELECT * FROM tasks WHERE id = $1', [id]);
    if (!current.rows.length) return res.status(404).json({ error: 'المهمة غير موجودة' });

    const result = await pool.query(`
      UPDATE tasks SET
        title = COALESCE($1, title),
        description = COALESCE($2, description),
        status = COALESCE($3, status),
        priority = COALESCE($4, priority),
        due_date = $5,
        related_type = $6,
        related_id = $7,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $8 RETURNING *
    `, [title, description, status, priority, due_date || null, related_type || null, related_id || null, id]);

    res.json(result.rows[0]);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'حدث خطأ في تحديث المهمة' });
  }
};

// ─── PUT /api/tasks/:id/move — drag & drop ────────────────────────────────
exports.moveTask = async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const { status: newStatus, position: newPosition } = req.body;

    const current = await client.query('SELECT * FROM tasks WHERE id = $1', [id]);
    if (!current.rows.length) return res.status(404).json({ error: 'المهمة غير موجودة' });

    const task = current.rows[0];
    await client.query('BEGIN');

    // If column changed, shift positions in old column
    if (task.status !== newStatus) {
      // Close gap in old column
      await client.query(
        `UPDATE tasks SET position = position - 1 WHERE status = $1 AND position > $2`,
        [task.status, task.position]
      );
      // Make room in new column
      await client.query(
        `UPDATE tasks SET position = position + 1 WHERE status = $1 AND position >= $2`,
        [newStatus, newPosition]
      );
    } else {
      // Same column reorder
      if (newPosition < task.position) {
        await client.query(
          `UPDATE tasks SET position = position + 1 WHERE status = $1 AND position >= $2 AND position < $3 AND id != $4`,
          [newStatus, newPosition, task.position, id]
        );
      } else {
        await client.query(
          `UPDATE tasks SET position = position - 1 WHERE status = $1 AND position > $2 AND position <= $3 AND id != $4`,
          [newStatus, task.position, newPosition, id]
        );
      }
    }

    const result = await client.query(
      `UPDATE tasks SET status = $1, position = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3 RETURNING *`,
      [newStatus, newPosition, id]
    );

    await client.query('COMMIT');
    res.json(result.rows[0]);
  } catch (e) {
    await client.query('ROLLBACK');
    console.error(e);
    res.status(500).json({ error: 'حدث خطأ في تحريك المهمة' });
  } finally {
    client.release();
  }
};

// ─── PUT /api/tasks/:id/assign ────────────────────────────────────────────
exports.assignTask = async (req, res) => {
  try {
    const { id } = req.params;
    const { assigned_to } = req.body;

    const result = await pool.query(
      `UPDATE tasks SET assigned_to = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *`,
      [assigned_to || null, id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'المهمة غير موجودة' });

    const task = result.rows[0];

    if (assigned_to) {
      const assignee = await pool.query('SELECT id, full_name, email FROM users WHERE id = $1', [assigned_to]);
      const assigner = req.user ? await pool.query('SELECT full_name FROM users WHERE id = $1', [req.user.id]) : { rows: [{ full_name: 'النظام' }] };
      if (assignee.rows.length) {
        await notifyAssignee(task, assignee.rows[0], assigner.rows[0]);
      }
    }

    res.json(task);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'حدث خطأ في تعيين المهمة' });
  }
};

// ─── DELETE /api/tasks/:id ────────────────────────────────────────────────
exports.remove = async (req, res) => {
  try {
    await pool.query('DELETE FROM tasks WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'حدث خطأ في حذف المهمة' });
  }
};

// ─── POST /api/tasks/:id/comments ────────────────────────────────────────
exports.addComment = async (req, res) => {
  try {
    const { comment } = req.body;
    if (!comment?.trim()) return res.status(400).json({ error: 'التعليق مطلوب' });

    const user_id = req.user?.id || null;
    const result = await pool.query(
      `INSERT INTO task_comments (task_id, user_id, comment) VALUES ($1, $2, $3) RETURNING *`,
      [req.params.id, user_id, comment.trim()]
    );

    const withUser = await pool.query(
      `SELECT tc.*, u.full_name AS user_name, u.avatar FROM task_comments tc LEFT JOIN users u ON tc.user_id = u.id WHERE tc.id = $1`,
      [result.rows[0].id]
    );

    res.status(201).json(withUser.rows[0]);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'حدث خطأ في إضافة التعليق' });
  }
};

// ─── GET /api/users/list (for assign dropdown) ───────────────────────────
exports.getUsersList = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, full_name, email, avatar, role FROM users WHERE is_active = true ORDER BY full_name`
    );
    res.json(result.rows);
  } catch (e) {
    res.status(500).json({ error: 'حدث خطأ' });
  }
};
