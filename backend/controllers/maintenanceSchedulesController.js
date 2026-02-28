const pool = require('../config/database');

// ── Helpers ──────────────────────────────────────────────────────────────────

const addDays = (date, days) => {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
};

const createTaskForSchedule = async (schedule) => {
  try {
    await pool.query(`
      INSERT INTO tasks (title, description, status, priority, due_date, related_type, related_id)
      VALUES ($1, $2, 'todo', 'medium', $3, 'maintenance_schedule', $4)
    `, [
      `صيانة دورية: ${schedule.title}`,
      schedule.description || `صيانة دورية للجهاز (كل ${schedule.interval_days} يوم)`,
      schedule.next_due,
      schedule.id
    ]);

    // Update last_task_created_for
    await pool.query(
      `UPDATE maintenance_schedules SET last_task_created_for = next_due WHERE id = $1`,
      [schedule.id]
    );

    // Notification
    const msg = `تذكير: صيانة دورية "${schedule.title}" مستحقة بتاريخ ${schedule.next_due}`;
    await pool.query(`
      INSERT INTO notifications (type, title, message, link)
      VALUES ('maintenance', 'صيانة دورية قادمة', $1, '/maintenance-schedules')
    `, [msg]);
  } catch (err) {
    console.error('Error creating task for schedule:', err.message);
  }
};

// ── Auto-check and create tasks for approaching schedules ────────────────────
const checkAndCreateTasks = async () => {
  try {
    const result = await pool.query(`
      SELECT ms.*, d.brand || ' ' || d.model as device_name
      FROM maintenance_schedules ms
      JOIN devices d ON ms.device_id = d.id
      WHERE ms.is_active = true
        AND ms.auto_create_task = true
        AND ms.next_due <= CURRENT_DATE + (ms.notify_days_before || ' days')::interval
        AND (ms.last_task_created_for IS NULL OR ms.last_task_created_for != ms.next_due)
    `);

    for (const sched of result.rows) {
      await createTaskForSchedule(sched);
    }

    if (result.rows.length > 0) {
      console.log(`✅ Created ${result.rows.length} maintenance schedule tasks`);
    }
  } catch (err) {
    console.error('Error in checkAndCreateTasks:', err.message);
  }
};

// ── GET all schedules ─────────────────────────────────────────────────────────
exports.getAll = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        ms.*,
        d.brand || ' ' || d.model as device_name,
        d.asset_tag, d.status as device_status,
        dt.name as device_type,
        u.full_name as assigned_to_name,
        (ms.next_due - CURRENT_DATE)::int as days_until_due
      FROM maintenance_schedules ms
      JOIN devices d ON ms.device_id = d.id
      LEFT JOIN device_types dt ON d.device_type_id = dt.id
      LEFT JOIN users u ON ms.assigned_to = u.id
      ORDER BY ms.next_due ASC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching maintenance schedules:', error);
    res.status(500).json({ error: 'حدث خطأ في جلب جداول الصيانة' });
  }
};

// ── GET single schedule ───────────────────────────────────────────────────────
exports.getById = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT ms.*, d.brand || ' ' || d.model as device_name, d.asset_tag,
        u.full_name as assigned_to_name,
        (ms.next_due - CURRENT_DATE)::int as days_until_due
      FROM maintenance_schedules ms
      JOIN devices d ON ms.device_id = d.id
      LEFT JOIN users u ON ms.assigned_to = u.id
      WHERE ms.id = $1
    `, [req.params.id]);

    if (result.rows.length === 0) return res.status(404).json({ error: 'لم يتم العثور على الجدول' });
    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'حدث خطأ' });
  }
};

// ── CREATE ────────────────────────────────────────────────────────────────────
exports.create = async (req, res) => {
  const { device_id, title, description, interval_days, next_due, assigned_to, auto_create_task, notify_days_before } = req.body;
  try {
    const result = await pool.query(`
      INSERT INTO maintenance_schedules
        (device_id, title, description, interval_days, next_due, assigned_to, auto_create_task, notify_days_before)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `, [device_id, title, description, interval_days || 90, next_due, assigned_to || null, auto_create_task !== false, notify_days_before || 7]);

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating schedule:', error);
    res.status(500).json({ error: 'حدث خطأ في إنشاء الجدول' });
  }
};

// ── UPDATE ────────────────────────────────────────────────────────────────────
exports.update = async (req, res) => {
  const { id } = req.params;
  const { title, description, interval_days, next_due, assigned_to, is_active, auto_create_task, notify_days_before } = req.body;
  try {
    const result = await pool.query(`
      UPDATE maintenance_schedules SET
        title = COALESCE($1, title),
        description = COALESCE($2, description),
        interval_days = COALESCE($3, interval_days),
        next_due = COALESCE($4, next_due),
        assigned_to = $5,
        is_active = COALESCE($6, is_active),
        auto_create_task = COALESCE($7, auto_create_task),
        notify_days_before = COALESCE($8, notify_days_before),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $9
      RETURNING *
    `, [title, description, interval_days, next_due, assigned_to || null, is_active, auto_create_task, notify_days_before, id]);

    if (result.rows.length === 0) return res.status(404).json({ error: 'لم يتم العثور على الجدول' });
    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'حدث خطأ في تحديث الجدول' });
  }
};

// ── MARK DONE (complete and auto-calc next due) ───────────────────────────────
exports.markDone = async (req, res) => {
  const { id } = req.params;
  const { done_date, notes, create_maintenance_record } = req.body;
  try {
    const sched = await pool.query('SELECT * FROM maintenance_schedules WHERE id = $1', [id]);
    if (sched.rows.length === 0) return res.status(404).json({ error: 'لم يتم العثور على الجدول' });

    const s = sched.rows[0];
    const lastDone = done_date || new Date().toISOString().split('T')[0];
    const nextDue = addDays(lastDone, s.interval_days);

    const updated = await pool.query(`
      UPDATE maintenance_schedules
      SET last_done = $1, next_due = $2, last_task_created_for = NULL, updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
      RETURNING *
    `, [lastDone, nextDue, id]);

    // Optionally create a maintenance_records entry
    if (create_maintenance_record) {
      try {
        await pool.query(`
          INSERT INTO maintenance_records (device_id, maintenance_type, description, start_date, end_date, status, performed_by)
          VALUES ($1, 'دورية', $2, $3, $3, 'completed', $4)
        `, [s.device_id, s.title + (notes ? ': ' + notes : ''), lastDone, req.user?.full_name || 'النظام']);
      } catch (e) { /* ignore */ }
    }

    res.json({ ...updated.rows[0], next_due: nextDue });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'حدث خطأ في تسجيل الصيانة' });
  }
};

// ── DELETE ────────────────────────────────────────────────────────────────────
exports.delete = async (req, res) => {
  try {
    await pool.query('DELETE FROM maintenance_schedules WHERE id = $1', [req.params.id]);
    res.json({ message: 'تم حذف الجدول بنجاح' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'حدث خطأ في الحذف' });
  }
};

// ── Export utility for server startup check ───────────────────────────────────
exports.checkAndCreateTasks = checkAndCreateTasks;
