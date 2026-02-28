const pool = require('../config/database');
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  secure: true,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

// ─── Templates ────────────────────────────────────────────────────────────────
const buildHtml = (subject, body, template, senderName) => {
  const templates = {
    general:     { accent: '#1e40af', label: 'إشعار رسمي',       labelBg: '#eff6ff', labelColor: '#1d4ed8', borderTop: '#1e40af' },
    maintenance: { accent: '#92400e', label: 'إشعار صيانة',       labelBg: '#fffbeb', labelColor: '#92400e', borderTop: '#d97706' },
    alert:       { accent: '#991b1b', label: 'تنبيه عاجل',        labelBg: '#fff1f2', labelColor: '#be123c', borderTop: '#dc2626' },
    update:      { accent: '#0c4a6e', label: 'إشعار تحديث النظام', labelBg: '#f0f9ff', labelColor: '#0369a1', borderTop: '#0284c7' },
    success:     { accent: '#14532d', label: 'إشعار إيجابي',      labelBg: '#f0fdf4', labelColor: '#15803d', borderTop: '#16a34a' },
  };

  const t = templates[template] || templates.general;

  const now = new Date();
  const dateStr = now.toLocaleDateString('ar-EG', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });

  const bodyHtml = body
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/\n/g, '<br>');

  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;background:#f4f6f9;font-family:'Segoe UI',Arial,sans-serif;direction:rtl;">

  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f9;padding:40px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

        <!-- Top accent bar -->
        <tr>
          <td style="background:${t.borderTop};height:4px;border-radius:4px 4px 0 0;"></td>
        </tr>

        <!-- Header -->
        <tr>
          <td style="background:#ffffff;padding:32px 40px 24px;border-right:1px solid #e5e7eb;border-left:1px solid #e5e7eb;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td>
                  <p style="margin:0 0 2px;font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#9ca3af;">إدارة تكنولوجيا المعلومات</p>
                  <p style="margin:0;font-size:20px;font-weight:700;color:#111827;">${subject}</p>
                </td>
                <td align="left" style="white-space:nowrap;">
                  <span style="display:inline-block;background:${t.labelBg};color:${t.labelColor};border:1px solid ${t.labelColor}33;border-radius:4px;padding:4px 12px;font-size:12px;font-weight:700;">${t.label}</span>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Divider -->
        <tr>
          <td style="background:#ffffff;border-right:1px solid #e5e7eb;border-left:1px solid #e5e7eb;">
            <div style="height:1px;background:#f3f4f6;margin:0 40px;"></div>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="background:#ffffff;padding:28px 40px;border-right:1px solid #e5e7eb;border-left:1px solid #e5e7eb;">
            <p style="margin:0 0 20px;font-size:15px;color:#374151;line-height:1.85;">${bodyHtml}</p>
          </td>
        </tr>

        <!-- Sender info -->
        <tr>
          <td style="background:#f9fafb;padding:20px 40px;border-right:1px solid #e5e7eb;border-left:1px solid #e5e7eb;border-top:1px solid #f3f4f6;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td>
                  <p style="margin:0 0 2px;font-size:12px;color:#9ca3af;">صادر عن</p>
                  <p style="margin:0;font-size:14px;font-weight:700;color:#111827;">${senderName || 'إدارة تكنولوجيا المعلومات'}</p>
                  <p style="margin:2px 0 0;font-size:12px;color:#6b7280;">قسم تكنولوجيا المعلومات</p>
                </td>
                <td align="left">
                  <p style="margin:0;font-size:12px;color:#9ca3af;text-align:left;">${dateStr}</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#f3f4f6;padding:16px 40px;border-radius:0 0 4px 4px;border:1px solid #e5e7eb;border-top:none;">
            <p style="margin:0;font-size:11px;color:#9ca3af;line-height:1.6;">
              هذه رسالة رسمية صادرة تلقائياً من نظام إدارة تكنولوجيا المعلومات. يُرجى عدم الرد على هذا البريد الإلكتروني مباشرةً.
              في حال وجود أي استفسار يرجى التواصل مع قسم الدعم الفني.
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>

</body>
</html>`;
};

// ─── GET /recipients — preview who will receive based on filter ───────────────
exports.getRecipients = async (req, res) => {
  try {
    const { department_id, status } = req.query;
    let query = `
      SELECT e.id, e.full_name, e.email, d.name as department_name
      FROM employees e
      LEFT JOIN departments d ON e.department_id = d.id
      WHERE e.email IS NOT NULL AND e.email != ''
    `;
    const params = [];

    if (department_id) {
      params.push(department_id);
      query += ` AND e.department_id = $${params.length}`;
    }
    if (status === 'active') {
      query += ` AND e.is_active = true`;
    } else if (status === 'inactive') {
      query += ` AND e.is_active = false`;
    }
    query += ` ORDER BY d.name, e.full_name`;

    const result = await pool.query(query, params);
    res.json({ recipients: result.rows, count: result.rows.length });
  } catch (error) {
    console.error('Error fetching recipients:', error);
    res.status(500).json({ error: 'حدث خطأ في جلب المستلمين' });
  }
};

// ─── GET /departments — all departments for filter ────────────────────────────
exports.getDepartments = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT d.id, d.name,
         COUNT(e.id) FILTER (WHERE e.email IS NOT NULL AND e.email != '') as employee_count
       FROM departments d
       LEFT JOIN employees e ON e.department_id = d.id
       GROUP BY d.id, d.name ORDER BY d.name`
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'حدث خطأ في جلب الأقسام' });
  }
};

// ─── POST /send — send the broadcast ─────────────────────────────────────────
exports.sendBroadcast = async (req, res) => {
  try {
    const { subject, body, template = 'general', department_id, status_filter } = req.body;
    const senderName = req.user?.full_name || 'إدارة IT';

    if (!subject?.trim() || !body?.trim()) {
      return res.status(400).json({ error: 'الموضوع والمحتوى مطلوبان' });
    }

    // Build recipient list
    let query = `
      SELECT e.full_name, e.email
      FROM employees e
      WHERE e.email IS NOT NULL AND e.email != ''
    `;
    const params = [];
    if (department_id) { params.push(department_id); query += ` AND e.department_id = $${params.length}`; }
    if (status_filter === 'active') query += ` AND e.is_active = true`;
    else if (status_filter === 'inactive') query += ` AND e.is_active = false`;

    const result = await pool.query(query, params);
    const recipients = result.rows;

    if (recipients.length === 0) {
      return res.status(400).json({ error: 'لا يوجد مستلمون مطابقون للفلتر المختار' });
    }

    const html = buildHtml(subject, body, template, senderName);

    // Send in batches of 10 to avoid rate-limit
    const BATCH = 10;
    let sent = 0;
    let failed = 0;

    for (let i = 0; i < recipients.length; i += BATCH) {
      const batch = recipients.slice(i, i + BATCH);
      await Promise.allSettled(
        batch.map(async (r) => {
          try {
            await transporter.sendMail({
              from: `"إدارة IT - نظام المعلومات" <${process.env.EMAIL_USER}>`,
              to: r.email,
              subject,
              html,
            });
            sent++;
          } catch {
            failed++;
          }
        })
      );
    }

    // Save to history
    await pool.query(
      `INSERT INTO email_broadcasts (subject, body, template, recipients_filter, recipients_count, sent_by, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'sent')`,
      [
        subject,
        body,
        template,
        JSON.stringify({ department_id, status_filter }),
        sent,
        senderName,
      ]
    );

    res.json({
      message: `تم الإرسال بنجاح`,
      sent,
      failed,
      total: recipients.length,
    });
  } catch (error) {
    console.error('Error sending broadcast:', error);
    res.status(500).json({ error: 'حدث خطأ أثناء الإرسال' });
  }
};

// ─── GET /history — sent broadcasts history ───────────────────────────────────
exports.getHistory = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM email_broadcasts ORDER BY created_at DESC LIMIT 50`
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'حدث خطأ في جلب السجل' });
  }
};
