const pool = require('../config/database');

// ══════════════════════════════════════════════════════════════════════════════
// GENERATOR — scans DB and creates new notifications if not already present
// ══════════════════════════════════════════════════════════════════════════════

exports.generate = async () => {
  try {
    // ── 1. License expiry ─────────────────────────────────────────────────────
    //    Notify 60, 30, 7 days before expiry (one notification per threshold)
    const licResult = await pool.query(`
      SELECT id, name, vendor, expiry_date,
        (expiry_date - CURRENT_DATE) AS days_left
      FROM licenses
      WHERE expiry_date IS NOT NULL
        AND expiry_date >= CURRENT_DATE
        AND expiry_date <= CURRENT_DATE + INTERVAL '60 days'
    `);

    for (const lic of licResult.rows) {
      const days = parseInt(lic.days_left);
      let threshold = null;
      if      (days <= 7)  threshold = 7;
      else if (days <= 30) threshold = 30;
      else if (days <= 60) threshold = 60;
      if (!threshold) continue;

      // unique key: don't re-insert same threshold notification
      const exists = await pool.query(`
        SELECT 1 FROM notifications
        WHERE type = 'license_expiry'
          AND ref_id = $1
          AND message LIKE $2
          AND created_at >= CURRENT_DATE - INTERVAL '1 day'
      `, [lic.id, `%${threshold} يوم%`]);

      if (!exists.rows.length) {
        const urgency = days <= 7 ? '🔴' : days <= 30 ? '🟠' : '🟡';
        await pool.query(`
          INSERT INTO notifications (type, title, message, link, ref_id)
          VALUES ($1, $2, $3, $4, $5)
        `, [
          'license_expiry',
          `${urgency} ليسنز هينتهي خلال ${days} يوم`,
          `ليسنز "${lic.name}" من ${lic.vendor} هينتهي في ${new Date(lic.expiry_date).toLocaleDateString('ar-EG')} — باقي ${days} يوم — المطلوب التجديد قبل ${threshold} يوم`,
          '/licenses',
          lic.id
        ]);
      }
    }

    // ── 2. Warranty expiry ────────────────────────────────────────────────────
    //    Notify 30 days before warranty_end
    const warrantyResult = await pool.query(`
      SELECT id, brand, model, asset_tag, warranty_end,
        (warranty_end - CURRENT_DATE) AS days_left
      FROM devices
      WHERE warranty_end IS NOT NULL
        AND warranty_end >= CURRENT_DATE
        AND warranty_end <= CURRENT_DATE + INTERVAL '30 days'
    `);

    for (const dev of warrantyResult.rows) {
      const days = parseInt(dev.days_left);
      const exists = await pool.query(`
        SELECT 1 FROM notifications
        WHERE type = 'warranty_expiry'
          AND ref_id = $1
          AND created_at >= CURRENT_DATE - INTERVAL '3 days'
      `, [dev.id]);

      if (!exists.rows.length) {
        const label = `${dev.brand} ${dev.model}${dev.asset_tag ? ' (' + dev.asset_tag + ')' : ''}`;
        const urgency = days <= 7 ? '🔴' : '🟠';
        await pool.query(`
          INSERT INTO notifications (type, title, message, link, ref_id)
          VALUES ($1, $2, $3, $4, $5)
        `, [
          'warranty_expiry',
          `${urgency} ضمان جهاز هينتهي خلال ${days} يوم`,
          `ضمان الجهاز "${label}" هينتهي في ${new Date(dev.warranty_end).toLocaleDateString('ar-EG')} — باقي ${days} يوم`,
          '/devices',
          dev.id
        ]);
      }
    }

    // ── 3. Stale tickets (open > 24h with no comment/update) ─────────────────
    const staleResult = await pool.query(`
      SELECT t.id, t.ticket_number, t.title, t.status,
        EXTRACT(EPOCH FROM (NOW() - t.updated_at))/3600 AS hours_open
      FROM tickets t
      WHERE t.status IN ('new', 'open')
        AND t.updated_at < NOW() - INTERVAL '24 hours'
        AND NOT EXISTS (
          SELECT 1 FROM ticket_comments tc
          WHERE tc.ticket_id = t.id
            AND tc.created_at > NOW() - INTERVAL '24 hours'
        )
    `);

    for (const ticket of staleResult.rows) {
      const hours = Math.round(parseFloat(ticket.hours_open));
      const exists = await pool.query(`
        SELECT 1 FROM notifications
        WHERE type = 'ticket_stale'
          AND ref_id = $1
          AND created_at >= CURRENT_DATE - INTERVAL '1 day'
      `, [ticket.id]);

      if (!exists.rows.length) {
        await pool.query(`
          INSERT INTO notifications (type, title, message, link, ref_id)
          VALUES ($1, $2, $3, $4, $5)
        `, [
          'ticket_stale',
          `⏰ تذكرة متأخرة بدون رد`,
          `التذكرة #${ticket.ticket_number} "${ticket.title}" مفتوحة منذ ${hours} ساعة بدون استجابة`,
          '/tickets',
          ticket.id
        ]);
      }
    }

    console.log('🔔 Notifications generated');
  } catch (err) {
    console.error('❌ Error generating notifications:', err.message);
  }
};

// ══════════════════════════════════════════════════════════════════════════════
// API HANDLERS
// ══════════════════════════════════════════════════════════════════════════════

// GET /api/notifications
exports.getAll = async (req, res) => {
  try {
    const userId = req.user?.id || null;
    const result = await pool.query(`
      SELECT * FROM notifications
      WHERE (user_id IS NULL OR user_id = $1)
      ORDER BY is_read ASC, created_at DESC
      LIMIT 100
    `, [userId]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'حدث خطأ' });
  }
};

// GET /api/notifications/unread-count
exports.getUnreadCount = async (req, res) => {
  try {
    const userId = req.user?.id || null;
    const result = await pool.query(
      `SELECT COUNT(*)::int AS count FROM notifications WHERE is_read = false AND (user_id IS NULL OR user_id = $1)`,
      [userId]
    );
    res.json({ count: result.rows[0].count });
  } catch (err) {
    res.status(500).json({ error: 'حدث خطأ' });
  }
};

// PUT /api/notifications/:id/read
exports.markRead = async (req, res) => {
  try {
    await pool.query(
      `UPDATE notifications SET is_read = true WHERE id = $1`,
      [req.params.id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'حدث خطأ' });
  }
};

// PUT /api/notifications/read-all
exports.markAllRead = async (req, res) => {
  try {
    await pool.query(`UPDATE notifications SET is_read = true WHERE is_read = false`);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'حدث خطأ' });
  }
};

// DELETE /api/notifications/clear-read
exports.clearRead = async (req, res) => {
  try {
    await pool.query(`DELETE FROM notifications WHERE is_read = true`);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'حدث خطأ' });
  }
};
