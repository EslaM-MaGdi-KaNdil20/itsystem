const pool = require('../config/database');

// Action types
const ACTIONS = {
  CREATE: 'create',
  UPDATE: 'update',
  DELETE: 'delete',
  VIEW: 'view',
  EXPORT: 'export',
  IMPORT: 'import',
  LOGIN: 'login',
  LOGOUT: 'logout',
  ASSIGN: 'assign',
  UNASSIGN: 'unassign'
};

// Entity types
const ENTITIES = {
  DEVICE: 'device',
  EMPLOYEE: 'employee',
  DEPARTMENT: 'department',
  MAINTENANCE: 'maintenance',
  SUBSCRIPTION: 'subscription',
  SERVER: 'server',
  PRODUCT: 'product',
  INVENTORY: 'inventory',
  PASSWORD: 'password',
  NETWORK_IP: 'network_ip',
  EMAIL_ACCOUNT: 'email_account',
  USER: 'user',
  ASSIGNMENT: 'assignment',
  ACCESSORY: 'accessory',
  CATEGORY: 'category'
};

// Log an activity
const logActivity = async (req, action, entityType, entityId, entityName, details = null) => {
  try {
    // Extract user info from request (assumes auth middleware sets req.user)
    const userId = req.user?.id || null;
    const userName = req.user?.full_name || req.user?.email || 'مستخدم مجهول';
    const ipAddress = req.ip || req.connection?.remoteAddress || req.headers['x-forwarded-for'];
    const userAgent = req.headers['user-agent'];

    console.log('📝 Logging activity:', { 
      user: userName, 
      userId, 
      action, 
      hasReqUser: !!req.user,
      reqUserData: req.user 
    });

    await pool.query(
      `INSERT INTO activity_logs (user_id, user_name, action, entity_type, entity_id, entity_name, details, ip_address, user_agent)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [userId, userName, action, entityType, entityId, entityName, details, ipAddress, userAgent]
    );
  } catch (error) {
    console.error('Error logging activity:', error);
    // Don't throw - logging should not break the main operation
  }
};

// Get all activity logs with pagination and filters
const getActivityLogs = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 50, 
      action, 
      entity_type, 
      user_id,
      start_date,
      end_date,
      search 
    } = req.query;
    
    const offset = (page - 1) * limit;
    let whereClause = 'WHERE 1=1';
    const params = [];
    let paramIndex = 1;

    if (action) {
      whereClause += ` AND action = $${paramIndex++}`;
      params.push(action);
    }

    if (entity_type) {
      whereClause += ` AND entity_type = $${paramIndex++}`;
      params.push(entity_type);
    }

    if (user_id) {
      whereClause += ` AND user_id = $${paramIndex++}`;
      params.push(user_id);
    }

    if (start_date) {
      whereClause += ` AND created_at >= $${paramIndex++}`;
      params.push(start_date);
    }

    if (end_date) {
      whereClause += ` AND created_at <= $${paramIndex++}`;
      params.push(end_date + ' 23:59:59');
    }

    if (search) {
      whereClause += ` AND (
        user_name ILIKE $${paramIndex} OR 
        entity_name ILIKE $${paramIndex} OR 
        details ILIKE $${paramIndex}
      )`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    // Get total count
    const countResult = await pool.query(
      `SELECT COUNT(*) FROM activity_logs ${whereClause}`,
      params
    );
    const totalItems = parseInt(countResult.rows[0].count);
    const totalPages = Math.ceil(totalItems / limit);

    // Get logs
    const result = await pool.query(
      `SELECT 
        al.*,
        u.email as user_email
       FROM activity_logs al
       LEFT JOIN users u ON al.user_id = u.id
       ${whereClause}
       ORDER BY al.created_at DESC
       LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
      [...params, limit, offset]
    );

    res.json({
      logs: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        totalItems,
        totalPages
      }
    });
  } catch (error) {
    console.error('Error fetching activity logs:', error);
    res.status(500).json({ error: 'حدث خطأ أثناء جلب سجل النشاطات' });
  }
};

// Get activity log statistics
const getActivityStats = async (req, res) => {
  try {
    const { days = 30 } = req.query;
    
    // Actions per day
    const dailyStats = await pool.query(`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as count
      FROM activity_logs
      WHERE created_at >= NOW() - INTERVAL '${parseInt(days)} days'
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `);

    // Actions by type
    const actionStats = await pool.query(`
      SELECT 
        action,
        COUNT(*) as count
      FROM activity_logs
      WHERE created_at >= NOW() - INTERVAL '${parseInt(days)} days'
      GROUP BY action
      ORDER BY count DESC
    `);

    // Top active users
    const userStats = await pool.query(`
      SELECT 
        user_name,
        COUNT(*) as count
      FROM activity_logs
      WHERE created_at >= NOW() - INTERVAL '${parseInt(days)} days'
      GROUP BY user_name
      ORDER BY count DESC
      LIMIT 10
    `);

    // Entity type stats
    const entityStats = await pool.query(`
      SELECT 
        entity_type,
        COUNT(*) as count
      FROM activity_logs
      WHERE created_at >= NOW() - INTERVAL '${parseInt(days)} days'
      GROUP BY entity_type
      ORDER BY count DESC
    `);

    res.json({
      dailyStats: dailyStats.rows,
      actionStats: actionStats.rows,
      userStats: userStats.rows,
      entityStats: entityStats.rows
    });
  } catch (error) {
    console.error('Error fetching activity stats:', error);
    res.status(500).json({ error: 'حدث خطأ أثناء جلب إحصائيات النشاطات' });
  }
};

// Get recent activities for dashboard
const getRecentActivities = async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    
    const result = await pool.query(
      `SELECT * FROM activity_logs 
       ORDER BY created_at DESC 
       LIMIT $1`,
      [limit]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching recent activities:', error);
    res.status(500).json({ error: 'حدث خطأ أثناء جلب النشاطات الأخيرة' });
  }
};

// Clear old logs (for maintenance)
const clearOldLogs = async (req, res) => {
  try {
    const { days = 365 } = req.body;
    
    const result = await pool.query(
      `DELETE FROM activity_logs 
       WHERE created_at < NOW() - INTERVAL '${parseInt(days)} days'
       RETURNING id`
    );

    // Log this action itself
    await logActivity(req, ACTIONS.DELETE, 'activity_log', null, 'مسح السجلات القديمة', `تم حذف ${result.rowCount} سجل`);

    res.json({ 
      message: `تم حذف ${result.rowCount} سجل قديم`,
      deletedCount: result.rowCount 
    });
  } catch (error) {
    console.error('Error clearing old logs:', error);
    res.status(500).json({ error: 'حدث خطأ أثناء مسح السجلات القديمة' });
  }
};

module.exports = {
  logActivity,
  getActivityLogs,
  getActivityStats,
  getRecentActivities,
  clearOldLogs,
  ACTIONS,
  ENTITIES
};
