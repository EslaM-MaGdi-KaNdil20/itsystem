const pool = require('../config/database');
const { logActivity, ACTIONS } = require('./activityLogController');

// ══════════════════════════════════════════════════════════════════════════════
// SLA POLICIES CRUD
// ══════════════════════════════════════════════════════════════════════════════

// GET /api/sla/policies
exports.getAllPolicies = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT sp.*, u.full_name as escalation_user_name
      FROM sla_policies sp
      LEFT JOIN users u ON sp.escalation_to = u.id
      ORDER BY 
        CASE sp.priority 
          WHEN 'urgent' THEN 1 
          WHEN 'high' THEN 2 
          WHEN 'medium' THEN 3 
          WHEN 'low' THEN 4 
        END
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching SLA policies:', error);
    res.status(500).json({ error: 'حدث خطأ في جلب سياسات SLA' });
  }
};

// PUT /api/sla/policies/:id
exports.updatePolicy = async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      response_time_minutes, resolution_time_minutes,
      escalation_enabled, escalation_after_minutes, escalation_to,
      is_active 
    } = req.body;

    const result = await pool.query(`
      UPDATE sla_policies SET
        response_time_minutes = COALESCE($1, response_time_minutes),
        resolution_time_minutes = COALESCE($2, resolution_time_minutes),
        escalation_enabled = COALESCE($3, escalation_enabled),
        escalation_after_minutes = COALESCE($4, escalation_after_minutes),
        escalation_to = $5,
        is_active = COALESCE($6, is_active),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $7
      RETURNING *
    `, [response_time_minutes, resolution_time_minutes, escalation_enabled, 
        escalation_after_minutes, escalation_to, is_active, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'السياسة غير موجودة' });
    }

    logActivity(req, ACTIONS.UPDATE, 'sla_policy', id,
      result.rows[0].name, `تم تحديث سياسة SLA: ${result.rows[0].name}`);

    res.json({ message: 'تم تحديث السياسة بنجاح', policy: result.rows[0] });
  } catch (error) {
    console.error('Error updating SLA policy:', error);
    res.status(500).json({ error: 'حدث خطأ في تحديث السياسة' });
  }
};

// ══════════════════════════════════════════════════════════════════════════════
// SLA ASSIGNMENT — called when a ticket is created
// ══════════════════════════════════════════════════════════════════════════════

exports.assignSLAToTicket = async (ticketId, priority) => {
  try {
    const policy = await pool.query(
      'SELECT * FROM sla_policies WHERE priority = $1 AND is_active = true',
      [priority || 'medium']
    );
    
    if (policy.rows.length === 0) return null;

    const sla = policy.rows[0];
    const now = new Date();
    const responseDeadline = new Date(now.getTime() + sla.response_time_minutes * 60000);
    const resolutionDeadline = new Date(now.getTime() + sla.resolution_time_minutes * 60000);

    await pool.query(`
      UPDATE tickets SET
        sla_policy_id = $1,
        response_deadline = $2,
        resolution_deadline = $3
      WHERE id = $4
    `, [sla.id, responseDeadline, resolutionDeadline, ticketId]);

    return { sla, responseDeadline, resolutionDeadline };
  } catch (error) {
    console.error('Error assigning SLA to ticket:', error);
    return null;
  }
};

// ══════════════════════════════════════════════════════════════════════════════
// RECORD FIRST RESPONSE — called when first comment is added or ticket assigned
// ══════════════════════════════════════════════════════════════════════════════

exports.recordFirstResponse = async (ticketId) => {
  try {
    const ticket = await pool.query(
      'SELECT id, first_response_at, response_deadline, sla_policy_id FROM tickets WHERE id = $1',
      [ticketId]
    );
    
    if (ticket.rows.length === 0 || ticket.rows[0].first_response_at) return;

    const now = new Date();
    const wasBreached = ticket.rows[0].response_deadline && now > new Date(ticket.rows[0].response_deadline);

    await pool.query(`
      UPDATE tickets SET 
        first_response_at = $1,
        response_breached = $2
      WHERE id = $3
    `, [now, wasBreached, ticketId]);

    if (wasBreached && ticket.rows[0].sla_policy_id) {
      const deadline = new Date(ticket.rows[0].response_deadline);
      const actualMinutes = Math.round((now - deadline) / 60000) + 
        (await pool.query('SELECT response_time_minutes FROM sla_policies WHERE id = $1', [ticket.rows[0].sla_policy_id])).rows[0]?.response_time_minutes;

      await pool.query(`
        INSERT INTO sla_breaches (ticket_id, breach_type, policy_id, target_minutes, actual_minutes)
        VALUES ($1, 'response', $2, $3, $4)
      `, [ticketId, ticket.rows[0].sla_policy_id, 
          (await pool.query('SELECT response_time_minutes FROM sla_policies WHERE id = $1', [ticket.rows[0].sla_policy_id])).rows[0]?.response_time_minutes,
          actualMinutes]);
    }

    return wasBreached;
  } catch (error) {
    console.error('Error recording first response:', error);
  }
};

// ══════════════════════════════════════════════════════════════════════════════
// SLA BREACH CHECKER — runs periodically (cron)
// ══════════════════════════════════════════════════════════════════════════════

exports.checkSLABreaches = async () => {
  try {
    // 1. Check response deadline breaches
    const responseBreaches = await pool.query(`
      SELECT t.id, t.ticket_number, t.title, t.priority, t.response_deadline,
             t.sla_policy_id, sp.response_time_minutes, sp.escalation_enabled,
             sp.escalation_after_minutes, sp.escalation_to
      FROM tickets t
      JOIN sla_policies sp ON t.sla_policy_id = sp.id
      WHERE t.status NOT IN ('resolved', 'closed')
        AND t.first_response_at IS NULL
        AND t.response_breached = false
        AND t.response_deadline < NOW()
    `);

    for (const ticket of responseBreaches.rows) {
      // Mark as breached
      await pool.query(
        'UPDATE tickets SET response_breached = true WHERE id = $1',
        [ticket.id]
      );

      // Log breach
      const actualMinutes = Math.round((Date.now() - new Date(ticket.response_deadline).getTime()) / 60000) + ticket.response_time_minutes;
      await pool.query(`
        INSERT INTO sla_breaches (ticket_id, breach_type, policy_id, target_minutes, actual_minutes, notes)
        VALUES ($1, 'response', $2, $3, $4, $5)
        ON CONFLICT DO NOTHING
      `, [ticket.id, ticket.sla_policy_id, ticket.response_time_minutes, actualMinutes,
          `تجاوز وقت الاستجابة للتذكرة ${ticket.ticket_number}`]);

      // Create notification
      await pool.query(`
        INSERT INTO notifications (type, title, message, link, ref_id)
        VALUES ($1, $2, $3, $4, $5)
      `, [
        'sla_breach',
        `🔴 تجاوز SLA — استجابة`,
        `التذكرة #${ticket.ticket_number} "${ticket.title}" تجاوزت وقت الاستجابة المحدد (${ticket.response_time_minutes} دقيقة)`,
        '/tickets',
        ticket.id
      ]);
    }

    // 2. Check resolution deadline breaches
    const resolutionBreaches = await pool.query(`
      SELECT t.id, t.ticket_number, t.title, t.priority, t.resolution_deadline,
             t.sla_policy_id, sp.resolution_time_minutes, sp.escalation_enabled,
             sp.escalation_after_minutes, sp.escalation_to
      FROM tickets t
      JOIN sla_policies sp ON t.sla_policy_id = sp.id
      WHERE t.status NOT IN ('resolved', 'closed')
        AND t.resolution_breached = false
        AND t.resolution_deadline < NOW()
    `);

    for (const ticket of resolutionBreaches.rows) {
      await pool.query(
        'UPDATE tickets SET resolution_breached = true WHERE id = $1',
        [ticket.id]
      );

      const actualMinutes = Math.round((Date.now() - new Date(ticket.resolution_deadline).getTime()) / 60000) + ticket.resolution_time_minutes;
      await pool.query(`
        INSERT INTO sla_breaches (ticket_id, breach_type, policy_id, target_minutes, actual_minutes, notes)
        VALUES ($1, 'resolution', $2, $3, $4, $5)
      `, [ticket.id, ticket.sla_policy_id, ticket.resolution_time_minutes, actualMinutes,
          `تجاوز وقت الحل للتذكرة ${ticket.ticket_number}`]);

      await pool.query(`
        INSERT INTO notifications (type, title, message, link, ref_id)
        VALUES ($1, $2, $3, $4, $5)
      `, [
        'sla_breach',
        `🔴 تجاوز SLA — حل`,
        `التذكرة #${ticket.ticket_number} "${ticket.title}" تجاوزت وقت الحل المحدد (${ticket.resolution_time_minutes} دقيقة)`,
        '/tickets',
        ticket.id
      ]);
    }

    // 3. Check escalation (tickets past escalation threshold)
    const escalationCheck = await pool.query(`
      SELECT t.id, t.ticket_number, t.title, t.priority, t.created_at,
             sp.escalation_enabled, sp.escalation_after_minutes, sp.escalation_to,
             u.full_name as escalation_user_name
      FROM tickets t
      JOIN sla_policies sp ON t.sla_policy_id = sp.id
      LEFT JOIN users u ON sp.escalation_to = u.id
      WHERE t.status NOT IN ('resolved', 'closed')
        AND t.escalated = false
        AND sp.escalation_enabled = true
        AND sp.escalation_to IS NOT NULL
        AND t.created_at + (sp.escalation_after_minutes || ' minutes')::INTERVAL < NOW()
    `);

    for (const ticket of escalationCheck.rows) {
      await pool.query(`
        UPDATE tickets SET 
          escalated = true, 
          escalated_to = $1,
          escalated_at = NOW()
        WHERE id = $2
      `, [ticket.escalation_to, ticket.id]);

      await pool.query(`
        INSERT INTO notifications (type, title, message, link, ref_id, user_id)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [
        'sla_escalation',
        `⚠️ تصعيد تذكرة`,
        `تم تصعيد التذكرة #${ticket.ticket_number} "${ticket.title}" إليك بسبب تجاوز المهلة الزمنية`,
        '/tickets',
        ticket.id,
        ticket.escalation_to
      ]);
    }

    const total = responseBreaches.rows.length + resolutionBreaches.rows.length + escalationCheck.rows.length;
    if (total > 0) {
      console.log(`🔴 SLA Check: ${responseBreaches.rows.length} response breaches, ${resolutionBreaches.rows.length} resolution breaches, ${escalationCheck.rows.length} escalations`);
    }
  } catch (error) {
    console.error('❌ Error checking SLA breaches:', error.message);
  }
};

// ══════════════════════════════════════════════════════════════════════════════
// SLA STATS & REPORTS
// ══════════════════════════════════════════════════════════════════════════════

// GET /api/sla/stats
exports.getStats = async (req, res) => {
  try {
    // Overall compliance rate
    const overall = await pool.query(`
      SELECT 
        COUNT(*) FILTER (WHERE sla_policy_id IS NOT NULL) as total_with_sla,
        COUNT(*) FILTER (WHERE response_breached = true) as response_breaches,
        COUNT(*) FILTER (WHERE resolution_breached = true) as resolution_breaches,
        COUNT(*) FILTER (WHERE escalated = true) as escalated_count,
        COUNT(*) FILTER (WHERE sla_policy_id IS NOT NULL AND response_breached = false AND (status IN ('resolved','closed') OR first_response_at IS NOT NULL)) as response_met,
        COUNT(*) FILTER (WHERE sla_policy_id IS NOT NULL AND resolution_breached = false AND status IN ('resolved','closed')) as resolution_met,
        COUNT(*) FILTER (WHERE status IN ('resolved','closed') AND sla_policy_id IS NOT NULL) as resolved_with_sla
      FROM tickets
    `);

    // Average response & resolution times  
    const avgTimes = await pool.query(`
      SELECT 
        ROUND(AVG(EXTRACT(EPOCH FROM (first_response_at - created_at)) / 60))::int as avg_response_minutes,
        ROUND(AVG(EXTRACT(EPOCH FROM (resolved_at - created_at)) / 60))::int as avg_resolution_minutes
      FROM tickets
      WHERE first_response_at IS NOT NULL OR resolved_at IS NOT NULL
    `);

    // By priority
    const byPriority = await pool.query(`
      SELECT 
        t.priority,
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE t.response_breached = true) as response_breaches,
        COUNT(*) FILTER (WHERE t.resolution_breached = true) as resolution_breaches,
        ROUND(AVG(EXTRACT(EPOCH FROM (t.first_response_at - t.created_at)) / 60))::int as avg_response_minutes,
        ROUND(AVG(EXTRACT(EPOCH FROM (t.resolved_at - t.created_at)) / 60))::int as avg_resolution_minutes
      FROM tickets t
      WHERE t.sla_policy_id IS NOT NULL
      GROUP BY t.priority
      ORDER BY 
        CASE t.priority 
          WHEN 'urgent' THEN 1 WHEN 'high' THEN 2 
          WHEN 'medium' THEN 3 WHEN 'low' THEN 4 
        END
    `);

    // Recent breaches
    const recentBreaches = await pool.query(`
      SELECT sb.*, t.ticket_number, t.title, t.priority
      FROM sla_breaches sb
      JOIN tickets t ON sb.ticket_id = t.id
      ORDER BY sb.breached_at DESC
      LIMIT 20
    `);

    // Tickets at risk (approaching deadline)
    const atRisk = await pool.query(`
      SELECT t.id, t.ticket_number, t.title, t.priority, t.status,
             t.response_deadline, t.resolution_deadline, t.first_response_at,
             t.assigned_to_name,
             EXTRACT(EPOCH FROM (t.response_deadline - NOW())) / 60 as response_minutes_left,
             EXTRACT(EPOCH FROM (t.resolution_deadline - NOW())) / 60 as resolution_minutes_left
      FROM tickets t
      WHERE t.status NOT IN ('resolved', 'closed')
        AND t.sla_policy_id IS NOT NULL
        AND (
          (t.response_deadline IS NOT NULL AND t.first_response_at IS NULL AND t.response_deadline > NOW() AND t.response_deadline < NOW() + INTERVAL '30 minutes')
          OR
          (t.resolution_deadline IS NOT NULL AND t.resolution_deadline > NOW() AND t.resolution_deadline < NOW() + INTERVAL '60 minutes')
        )
      ORDER BY LEAST(
        COALESCE(t.response_deadline, '9999-12-31'),
        COALESCE(t.resolution_deadline, '9999-12-31')
      )
    `);

    const stats = overall.rows[0];
    const totalWithSLA = parseInt(stats.total_with_sla) || 1;
    
    res.json({
      compliance: {
        response_rate: Math.round(((parseInt(stats.response_met) || 0) / totalWithSLA) * 100),
        resolution_rate: parseInt(stats.resolved_with_sla) > 0 
          ? Math.round(((parseInt(stats.resolution_met) || 0) / parseInt(stats.resolved_with_sla)) * 100)
          : 100,
        total_breaches: (parseInt(stats.response_breaches) || 0) + (parseInt(stats.resolution_breaches) || 0),
        response_breaches: parseInt(stats.response_breaches) || 0,
        resolution_breaches: parseInt(stats.resolution_breaches) || 0,
        escalated: parseInt(stats.escalated_count) || 0,
      },
      avg_times: avgTimes.rows[0],
      by_priority: byPriority.rows,
      recent_breaches: recentBreaches.rows,
      at_risk: atRisk.rows,
    });
  } catch (error) {
    console.error('Error fetching SLA stats:', error);
    res.status(500).json({ error: 'حدث خطأ في جلب إحصائيات SLA' });
  }
};

// GET /api/sla/breaches
exports.getBreaches = async (req, res) => {
  try {
    const { ticket_id, breach_type, limit = 50 } = req.query;
    let query = `
      SELECT sb.*, t.ticket_number, t.title, t.priority, t.status,
             t.assigned_to_name, u.full_name as escalated_to_name
      FROM sla_breaches sb
      JOIN tickets t ON sb.ticket_id = t.id
      LEFT JOIN users u ON sb.escalated_to = u.id
      WHERE 1=1
    `;
    const params = [];

    if (ticket_id) {
      params.push(ticket_id);
      query += ` AND sb.ticket_id = $${params.length}`;
    }
    if (breach_type) {
      params.push(breach_type);
      query += ` AND sb.breach_type = $${params.length}`;
    }

    params.push(parseInt(limit));
    query += ` ORDER BY sb.breached_at DESC LIMIT $${params.length}`;

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching SLA breaches:', error);
    res.status(500).json({ error: 'حدث خطأ' });
  }
};
