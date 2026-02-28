const pool = require('../config/database');
const { logActivity, ACTIONS, ENTITIES } = require('./activityLogController');
const { assignSLAToTicket, recordFirstResponse } = require('./slaController');
const nodemailer = require('nodemailer');

// Email transporter
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  secure: true,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  }
});

// Send email notification to admin
const sendTicketNotification = async (ticket) => {
  try {
    const priorityLabels = {
      low: 'منخفضة',
      medium: 'متوسطة',
      high: 'عالية',
      urgent: 'عاجلة ⚠️'
    };
    
    const categoryLabels = {
      general: 'عام',
      hardware: 'أجهزة',
      software: 'برامج',
      network: 'شبكات',
      email: 'بريد إلكتروني',
      printer: 'طابعات',
      access: 'صلاحيات',
      other: 'أخرى'
    };

    const mailOptions = {
      from: `"نظام الدعم الفني" <${process.env.EMAIL_USER}>`,
      to: process.env.EMAIL_RECIPIENT,
      subject: `🆕 طلب دعم فني جديد - ${ticket.ticket_number}`,
      html: `
        <!DOCTYPE html>
        <html dir="rtl">
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; direction: rtl; }
            .container { max-width: 600px; margin: 0 auto; background: #ffffff; }
            .header { background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%); color: white; padding: 30px; text-align: center; }
            .content { padding: 30px; }
            .info-box { background: #f3f4f6; border-right: 4px solid #7c3aed; padding: 15px; margin: 15px 0; border-radius: 8px; }
            .label { font-weight: bold; color: #4b5563; margin-left: 10px; }
            .value { color: #1f2937; }
            .priority-urgent { background: #fee2e2; border-right-color: #dc2626; }
            .priority-high { background: #fed7aa; border-right-color: #ea580c; }
            .priority-medium { background: #dbeafe; border-right-color: #2563eb; }
            .footer { text-align: center; padding: 20px; color: #6b7280; background: #f9fafb; }
            .button { display: inline-block; background: #7c3aed; color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0;">🎫 طلب دعم فني جديد</h1>
              <p style="margin: 10px 0 0 0; opacity: 0.9;">تم استلام طلب جديد من أحد الموظفين</p>
            </div>
            
            <div class="content">
              <div class="info-box">
                <p><span class="label">رقم الطلب:</span><span class="value" style="font-size: 18px; font-weight: bold; color: #7c3aed;">${ticket.ticket_number}</span></p>
              </div>
              
              <div class="info-box ${ticket.priority === 'urgent' ? 'priority-urgent' : ticket.priority === 'high' ? 'priority-high' : 'priority-medium'}">
                <p><span class="label">الأولوية:</span><span class="value">${priorityLabels[ticket.priority]}</span></p>
                <p><span class="label">الفئة:</span><span class="value">${categoryLabels[ticket.category]}</span></p>
              </div>
              
              <div class="info-box">
                <h3 style="margin: 0 0 10px 0; color: #1f2937;">📋 تفاصيل الطلب</h3>
                <p><span class="label">العنوان:</span><span class="value">${ticket.title}</span></p>
                <p style="margin-top: 10px;"><span class="label">الوصف:</span></p>
                <p style="background: white; padding: 15px; border-radius: 6px; margin-top: 5px;">${ticket.description}</p>
              </div>
              
              <div class="info-box">
                <h3 style="margin: 0 0 10px 0; color: #1f2937;">👤 بيانات مقدم الطلب</h3>
                <p><span class="label">الاسم:</span><span class="value">${ticket.requester_name}</span></p>
                <p><span class="label">البريد:</span><span class="value">${ticket.requester_email}</span></p>
                <p><span class="label">الهاتف:</span><span class="value">${ticket.requester_phone}</span></p>
                <p><span class="label">القسم:</span><span class="value">${ticket.requester_department}</span></p>
              </div>
              
              <div style="text-align: center;">
                <a href="http://localhost:5176/tickets" class="button">
                  📊 عرض الطلب في النظام
                </a>
              </div>
            </div>
            
            <div class="footer">
              <p>نظام إدارة تكنولوجيا المعلومات</p>
              <p style="font-size: 12px; margin-top: 5px;">تم الإرسال تلقائياً - لا ترد على هذا البريد</p>
            </div>
          </div>
        </body>
        </html>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log(`✅ Email notification sent for ticket ${ticket.ticket_number}`);
  } catch (error) {
    console.error('❌ Error sending email notification:', error);
    // Don't throw error - ticket should still be created even if email fails
  }
};

// Send confirmation email to the requester
const sendRequesterConfirmation = async (ticket) => {
  try {
    if (!ticket.requester_email) return;

    const priorityLabels = {
      low: 'منخفضة',
      medium: 'متوسطة',
      high: 'عالية',
      urgent: 'عاجلة ⚠️'
    };

    const categoryLabels = {
      general: 'عام',
      hardware: 'أجهزة',
      software: 'برامج',
      network: 'شبكات',
      email: 'بريد إلكتروني',
      printer: 'طابعات',
      access: 'صلاحيات',
      other: 'أخرى'
    };

    const responseTimeMap = {
      low:    'سوف يتم التعامل مع الطلب خلال ٥ دقائق',
      medium: 'سوف يتم التعامل مع الطلب خلال ٥ دقائق',
      high:   'سوف يتم التعامل مع الطلب خلال ٥ دقائق',
      urgent: 'سوف يتم التعامل مع الطلب خلال ٥ دقائق',
    };

    const firstName = ticket.requester_name ? ticket.requester_name.trim().split(' ')[0] : 'موظفنا العزيز';

    const mailOptions = {
      from: `"الدعم الفني" <${process.env.EMAIL_USER}>`,
      to: ticket.requester_email,
      subject: `✅ تم استلام طلبك - ${ticket.ticket_number}`,
      html: `
        <!DOCTYPE html>
        <html dir="rtl">
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; direction: rtl; background: #f1f5f9; margin: 0; padding: 20px; }
            .container { max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08); }
            .header { background: linear-gradient(135deg, #312e81 0%, #4f46e5 60%, #7c3aed 100%); color: white; padding: 40px 30px; text-align: center; }
            .header h1 { margin: 0 0 8px; font-size: 24px; }
            .header p { margin: 0; opacity: 0.85; font-size: 15px; }
            .content { padding: 30px; }
            .ticket-box { background: linear-gradient(135deg,#ede9fe,#e0e7ff); border: 1px solid #c7d2fe; border-radius: 12px; padding: 20px 24px; text-align: center; margin-bottom: 24px; }
            .ticket-number { font-size: 28px; font-weight: 900; color: #4338ca; font-family: monospace; letter-spacing: 0.08em; }
            .ticket-label { font-size: 12px; color: #6b7280; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; margin-bottom: 6px; }
            .info-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #f1f5f9; font-size: 14px; }
            .info-row:last-child { border-bottom: none; }
            .info-label { color: #6b7280; font-weight: 600; }
            .info-value { color: #1e293b; font-weight: 700; }
            .status-badge { display: inline-block; background: #dcfce7; color: #16a34a; border: 1px solid #bbf7d0; border-radius: 20px; padding: 4px 14px; font-size: 13px; font-weight: 700; }
            .note-box { background: #fefce8; border: 1px solid #fde68a; border-radius: 10px; padding: 14px 18px; margin: 20px 0; font-size: 14px; color: #92400e; }
            .footer { text-align: center; padding: 20px 30px; background: #f8fafc; color: #94a3b8; font-size: 12px; border-top: 1px solid #e2e8f0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div style="font-size:42px; margin-bottom:12px;">✅</div>
              <h1>تم استلام طلبك بنجاح!</h1>
              <p>مرحباً ${firstName}، فريق الدعم الفني يعمل على طلبك</p>
            </div>

            <div class="content">
              <div class="ticket-box">
                <p class="ticket-label">رقم التذكرة للمتابعة</p>
                <div class="ticket-number">${ticket.ticket_number}</div>
                <div style="margin-top:10px;"><span class="status-badge">🟢 مفتوحة — جاري المعالجة</span></div>
              </div>

              <div style="background:#f8fafc; border-radius:10px; padding:16px 20px; margin-bottom:20px;">
                <div class="info-row">
                  <span class="info-label">عنوان الطلب</span>
                  <span class="info-value">${ticket.title}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">التصنيف</span>
                  <span class="info-value">${categoryLabels[ticket.category] || ticket.category}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">الأولوية</span>
                  <span class="info-value">${priorityLabels[ticket.priority] || ticket.priority}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">الوقت المتوقع للرد</span>
                  <span class="info-value" style="color:#4f46e5;">${responseTimeMap[ticket.priority] || '٢٤ ساعة'}</span>
                </div>
              </div>

              <div class="note-box">
                💡 <strong>احتفظ برقم التذكرة</strong> <span style="font-family:monospace; font-weight:900; color:#4338ca;">${ticket.ticket_number}</span> لمتابعة حالة طلبك مع فريق الدعم الفني.
              </div>
            </div>

            <div class="footer">
              <p style="margin:0 0 4px;">نظام إدارة تكنولوجيا المعلومات</p>
              <p style="margin:0;">هذا البريد أُرسل تلقائياً — الرجاء عدم الرد عليه</p>
            </div>
          </div>
        </body>
        </html>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log(`✅ Confirmation email sent to requester: ${ticket.requester_email}`);
  } catch (error) {
    console.error('❌ Error sending requester confirmation email:', error);
  }
};

// Generate ticket number
const generateTicketNumber = () => {
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `TKT-${year}${month}-${random}`;
};

// Get all tickets
exports.getAllTickets = async (req, res) => {
  try {
    const { status, priority, category, assigned_to, requester_id, search } = req.query;
    
    let query = `
      SELECT t.*,
        e.full_name as requester_full_name,
        e.employee_code,
        CONCAT(d.brand, ' ', d.model) as device_name,
        d.serial_number as device_serial,
        d.asset_tag as device_asset_tag,
        u.full_name as assigned_user_name,
        sp.response_time_minutes as sla_response_target,
        sp.resolution_time_minutes as sla_resolution_target,
        CASE 
          WHEN t.response_deadline IS NOT NULL AND t.first_response_at IS NULL AND t.status NOT IN ('resolved','closed')
          THEN EXTRACT(EPOCH FROM (t.response_deadline - NOW())) / 60 
        END as response_minutes_left,
        CASE 
          WHEN t.resolution_deadline IS NOT NULL AND t.status NOT IN ('resolved','closed')
          THEN EXTRACT(EPOCH FROM (t.resolution_deadline - NOW())) / 60 
        END as resolution_minutes_left
      FROM tickets t
      LEFT JOIN employees e ON t.requester_id = e.id
      LEFT JOIN devices d ON t.device_id = d.id
      LEFT JOIN users u ON t.assigned_to = u.id
      LEFT JOIN sla_policies sp ON t.sla_policy_id = sp.id
      WHERE 1=1
    `;
    
    const params = [];
    
    if (status) {
      params.push(status);
      query += ` AND t.status = $${params.length}`;
    }
    
    if (priority) {
      params.push(priority);
      query += ` AND t.priority = $${params.length}`;
    }
    
    if (category) {
      params.push(category);
      query += ` AND t.category = $${params.length}`;
    }
    
    if (assigned_to) {
      params.push(assigned_to);
      query += ` AND t.assigned_to = $${params.length}`;
    }
    
    if (requester_id) {
      params.push(requester_id);
      query += ` AND t.requester_id = $${params.length}`;
    }
    
    if (search) {
      params.push(`%${search}%`);
      query += ` AND (t.ticket_number ILIKE $${params.length} OR t.title ILIKE $${params.length} OR t.requester_name ILIKE $${params.length})`;
    }
    
    query += ' ORDER BY t.created_at DESC';
    
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching tickets:', error);
    res.status(500).json({ error: 'حدث خطأ في جلب الطلبات' });
  }
};

// Get ticket by ID
exports.getTicketById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const ticketResult = await pool.query(`
      SELECT t.*,
        e.full_name as requester_full_name,
        e.employee_code,
        e.email as requester_employee_email,
        CONCAT(d.brand, ' ', d.model) as device_name,
        d.serial_number as device_serial,
        d.asset_tag as device_asset_tag,
        u.full_name as assigned_user_name
      FROM tickets t
      LEFT JOIN employees e ON t.requester_id = e.id
      LEFT JOIN devices d ON t.device_id = d.id
      LEFT JOIN users u ON t.assigned_to = u.id
      WHERE t.id = $1
    `, [id]);
    
    if (ticketResult.rows.length === 0) {
      return res.status(404).json({ error: 'الطلب غير موجود' });
    }
    
    // Get comments
    const commentsResult = await pool.query(`
      SELECT * FROM ticket_comments 
      WHERE ticket_id = $1 
      ORDER BY created_at ASC
    `, [id]);
    
    res.json({
      ...ticketResult.rows[0],
      comments: commentsResult.rows
    });
  } catch (error) {
    console.error('Error fetching ticket:', error);
    res.status(500).json({ error: 'حدث خطأ في جلب الطلب' });
  }
};

// Create ticket
exports.createTicket = async (req, res) => {
  try {
    const {
      title, description, category, priority,
      requester_id, requester_name, requester_email, requester_phone, requester_department,
      device_id
    } = req.body;
    
    const ticket_number = generateTicketNumber();
    
    const result = await pool.query(`
      INSERT INTO tickets (
        ticket_number, title, description, category, priority,
        requester_id, requester_name, requester_email, requester_phone, requester_department,
        device_id, status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'new')
      RETURNING *
    `, [
      ticket_number, title, description, category || 'general', priority || 'medium',
      requester_id, requester_name, requester_email, requester_phone, requester_department,
      device_id
    ]);
    
    // Log activity
    logActivity(req, ACTIONS.CREATE, 'ticket', result.rows[0].id, 
      ticket_number, `تم إنشاء طلب جديد: ${title}`);
    
    // Send email notification to admin (non-blocking)
    sendTicketNotification({
      ticket_number,
      title,
      description,
      category: category || 'general',
      priority: priority || 'medium',
      requester_name,
      requester_email,
      requester_phone,
      requester_department
    }).catch(error => {
      console.error('Failed to send email notification:', error);
    });

    // Send confirmation email to requester (non-blocking)
    sendRequesterConfirmation({
      ticket_number,
      title,
      category: category || 'general',
      priority: priority || 'medium',
      requester_name,
      requester_email,
    }).catch(error => {
      console.error('Failed to send requester confirmation:', error);
    });
    
    res.status(201).json({
      message: 'تم إنشاء الطلب بنجاح',
      ticket_number: ticket_number,
      data: result.rows[0]
    });

    // Assign SLA policy (non-blocking, after response sent)
    assignSLAToTicket(result.rows[0].id, priority || 'medium').catch(err => {
      console.error('Failed to assign SLA:', err);
    });
  } catch (error) {
    console.error('Error creating ticket:', error);
    res.status(500).json({ error: 'حدث خطأ في إنشاء الطلب' });
  }
};

// Update ticket
exports.updateTicket = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title, description, category, priority, status,
      assigned_to, assigned_to_name, resolution
    } = req.body;
    
    // Get current ticket for logging
    const currentTicket = await pool.query('SELECT * FROM tickets WHERE id = $1', [id]);
    if (currentTicket.rows.length === 0) {
      return res.status(404).json({ error: 'الطلب غير موجود' });
    }
    
    let resolved_at = null;
    let closed_at = null;
    
    if (status === 'resolved' && currentTicket.rows[0].status !== 'resolved') {
      resolved_at = new Date();
    }
    if (status === 'closed' && currentTicket.rows[0].status !== 'closed') {
      closed_at = new Date();
    }
    
    const result = await pool.query(`
      UPDATE tickets SET
        title = COALESCE($1, title),
        description = COALESCE($2, description),
        category = COALESCE($3, category),
        priority = COALESCE($4, priority),
        status = COALESCE($5, status),
        assigned_to = COALESCE($6, assigned_to),
        assigned_to_name = COALESCE($7, assigned_to_name),
        resolution = COALESCE($8, resolution),
        resolved_at = COALESCE($9, resolved_at),
        closed_at = COALESCE($10, closed_at),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $11
      RETURNING *
    `, [title, description, category, priority, status, assigned_to, assigned_to_name, resolution, resolved_at, closed_at, id]);
    
    // Log activity
    let logMessage = `تم تحديث الطلب: ${result.rows[0].ticket_number}`;
    if (status && status !== currentTicket.rows[0].status) {
      logMessage = `تم تغيير حالة الطلب ${result.rows[0].ticket_number} إلى: ${status}`;
    }
    if (assigned_to && assigned_to !== currentTicket.rows[0].assigned_to) {
      logMessage = `تم تعيين الطلب ${result.rows[0].ticket_number} إلى: ${assigned_to_name}`;
    }
    
    logActivity(req, ACTIONS.UPDATE, 'ticket', id, 
      result.rows[0].ticket_number, logMessage);
    
    res.json({ message: 'تم تحديث الطلب بنجاح', ticket: result.rows[0] });
  } catch (error) {
    console.error('Error updating ticket:', error);
    res.status(500).json({ error: 'حدث خطأ في تحديث الطلب' });
  }
};

// Delete ticket
exports.deleteTicket = async (req, res) => {
  try {
    const { id } = req.params;
    
    const ticket = await pool.query('SELECT ticket_number, title FROM tickets WHERE id = $1', [id]);
    if (ticket.rows.length === 0) {
      return res.status(404).json({ error: 'الطلب غير موجود' });
    }
    
    await pool.query('DELETE FROM tickets WHERE id = $1', [id]);
    
    // Log activity
    logActivity(req, ACTIONS.DELETE, 'ticket', id, 
      ticket.rows[0].ticket_number, `تم حذف الطلب: ${ticket.rows[0].title}`);
    
    res.json({ message: 'تم حذف الطلب بنجاح' });
  } catch (error) {
    console.error('Error deleting ticket:', error);
    res.status(500).json({ error: 'حدث خطأ في حذف الطلب' });
  }
};

// Add comment to ticket
exports.addComment = async (req, res) => {
  try {
    const { id } = req.params;
    const { comment, is_internal } = req.body;
    const user_id = req.user?.id;
    const user_name = req.user?.full_name || 'مستخدم';
    
    const result = await pool.query(`
      INSERT INTO ticket_comments (ticket_id, user_id, user_name, comment, is_internal)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [id, user_id, user_name, comment, is_internal || false]);
    
    // Update ticket updated_at
    await pool.query('UPDATE tickets SET updated_at = CURRENT_TIMESTAMP WHERE id = $1', [id]);

    // Record first response for SLA tracking
    recordFirstResponse(id).catch(err => {
      console.error('Failed to record first response:', err);
    });
    
    res.status(201).json({
      message: 'تم إضافة التعليق بنجاح',
      comment: result.rows[0]
    });
  } catch (error) {
    console.error('Error adding comment:', error);
    res.status(500).json({ error: 'حدث خطأ في إضافة التعليق' });
  }
};

// Get ticket stats
exports.getTicketStats = async (req, res) => {
  try {
    const stats = await pool.query(`
      SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'new') as new_count,
        COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress_count,
        COUNT(*) FILTER (WHERE status = 'resolved') as resolved_count,
        COUNT(*) FILTER (WHERE status = 'closed') as closed_count,
        COUNT(*) FILTER (WHERE priority = 'high' AND status NOT IN ('resolved', 'closed')) as high_priority_open,
        COUNT(*) FILTER (WHERE priority = 'urgent' AND status NOT IN ('resolved', 'closed')) as urgent_open,
        COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE) as today_count,
        COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '7 days') as week_count
      FROM tickets
    `);
    
    // Get by category
    const byCategory = await pool.query(`
      SELECT category, COUNT(*) as count
      FROM tickets
      WHERE status NOT IN ('resolved', 'closed')
      GROUP BY category
      ORDER BY count DESC
    `);
    
    // Get by assignee
    const byAssignee = await pool.query(`
      SELECT 
        COALESCE(assigned_to_name, 'غير معين') as assignee,
        COUNT(*) as count
      FROM tickets
      WHERE status NOT IN ('resolved', 'closed')
      GROUP BY assigned_to_name
      ORDER BY count DESC
      LIMIT 10
    `);
    
    res.json({
      ...stats.rows[0],
      by_category: byCategory.rows,
      by_assignee: byAssignee.rows
    });
  } catch (error) {
    console.error('Error fetching ticket stats:', error);
    res.status(500).json({ error: 'حدث خطأ في جلب الإحصائيات' });
  }
};

// Assign ticket
exports.assignTicket = async (req, res) => {
  try {
    const { id } = req.params;
    const { assigned_to, assigned_to_name } = req.body;
    
    const result = await pool.query(`
      UPDATE tickets SET
        assigned_to = $1,
        assigned_to_name = $2,
        status = CASE WHEN status = 'new' THEN 'in_progress' ELSE status END,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
      RETURNING *
    `, [assigned_to, assigned_to_name, id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'الطلب غير موجود' });
    }
    
    // Log activity
    logActivity(req, ACTIONS.UPDATE, 'ticket', id, 
      result.rows[0].ticket_number, `تم تعيين الطلب إلى: ${assigned_to_name}`);

    // Record first response for SLA tracking
    recordFirstResponse(id).catch(err => {
      console.error('Failed to record first response:', err);
    });
    
    res.json({ message: 'تم تعيين الطلب بنجاح', ticket: result.rows[0] });
  } catch (error) {
    console.error('Error assigning ticket:', error);
    res.status(500).json({ error: 'حدث خطأ في تعيين الطلب' });
  }
};

// Change ticket status
exports.changeStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, resolution } = req.body;
    
    let updateFields = 'status = $1, updated_at = CURRENT_TIMESTAMP';
    const params = [status];
    
    if (status === 'resolved') {
      updateFields += ', resolved_at = CURRENT_TIMESTAMP';
      if (resolution) {
        updateFields += `, resolution = $${params.length + 1}`;
        params.push(resolution);
      }
    }
    
    if (status === 'closed') {
      updateFields += ', closed_at = CURRENT_TIMESTAMP';
    }
    
    params.push(id);
    
    const result = await pool.query(`
      UPDATE tickets SET ${updateFields}
      WHERE id = $${params.length}
      RETURNING *
    `, params);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'الطلب غير موجود' });
    }
    
    // Log activity
    const statusNames = {
      'new': 'جديد',
      'in_progress': 'قيد التنفيذ',
      'resolved': 'تم الحل',
      'closed': 'مغلق'
    };
    
    logActivity(req, ACTIONS.UPDATE, 'ticket', id, 
      result.rows[0].ticket_number, `تم تغيير حالة الطلب إلى: ${statusNames[status] || status}`);
    
    res.json({ message: 'تم تغيير حالة الطلب بنجاح', ticket: result.rows[0] });
  } catch (error) {
    console.error('Error changing ticket status:', error);
    res.status(500).json({ error: 'حدث خطأ في تغيير حالة الطلب' });
  }
};

// Get IT users for assignment
exports.getITUsers = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, full_name, email, role
      FROM users
      WHERE role IN ('admin', 'it_support', 'technician')
      ORDER BY full_name
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching IT users:', error);
    res.status(500).json({ error: 'حدث خطأ في جلب المستخدمين' });
  }
};

// Public - track ticket by ticket_number (no auth required)
exports.trackTicket = async (req, res) => {
  try {
    const { ticket_number } = req.params;
    const result = await pool.query(
      `SELECT ticket_number, title, description, status, priority, category,
              requester_name, created_at, updated_at, assigned_to_name
       FROM tickets
       WHERE ticket_number = $1`,
      [ticket_number.toUpperCase()]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'لم يتم العثور على طلب بهذا الرقم' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error tracking ticket:', error);
    res.status(500).json({ error: 'حدث خطأ أثناء البحث' });
  }
};
