const pool = require('../config/database');
const { logActivity, ACTIONS, ENTITIES } = require('./activityLogController');

// Get all subscriptions
exports.getAllSubscriptions = async (req, res) => {
  try {
    const { status } = req.query;
    
    let query = `
      SELECT *,
        CASE 
          WHEN end_date < CURRENT_DATE THEN 'expired'
          WHEN end_date <= CURRENT_DATE + INTERVAL '7 days' THEN 'expiring_soon'
          WHEN end_date <= CURRENT_DATE + INTERVAL '30 days' THEN 'expiring_month'
          ELSE status
        END as alert_status,
        end_date - CURRENT_DATE as days_remaining
      FROM subscriptions
      WHERE 1=1
    `;
    
    const params = [];
    
    if (status) {
      query += ` AND status = $${params.length + 1}`;
      params.push(status);
    }
    
    query += ' ORDER BY end_date ASC, name ASC';
    
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching subscriptions:', error);
    res.status(500).json({ error: 'حدث خطأ في جلب الاشتراكات' });
  }
};

// Get subscription by ID
exports.getSubscriptionById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM subscriptions WHERE id = $1', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'الاشتراك غير موجود' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching subscription:', error);
    res.status(500).json({ error: 'حدث خطأ في جلب الاشتراك' });
  }
};

// Create subscription
exports.createSubscription = async (req, res) => {
  try {
    const {
      name, provider, subscription_type, cost, billing_cycle,
      start_date, end_date, auto_renew, login_url, username, password_encrypted, notes, status
    } = req.body;
    
    const result = await pool.query(`
      INSERT INTO subscriptions (
        name, provider, subscription_type, cost, billing_cycle,
        start_date, end_date, auto_renew, login_url, username, password_encrypted, notes, status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *
    `, [
      name, provider, subscription_type, cost, billing_cycle || 'monthly',
      start_date, end_date, auto_renew || false, login_url, username, password_encrypted, notes, status || 'active'
    ]);
    
    // Log activity
    logActivity(req, ACTIONS.CREATE, ENTITIES.SUBSCRIPTION, result.rows[0].id, 
      name, `تم إضافة اشتراك جديد: ${name} (${provider})`);
    
    res.status(201).json({
      message: 'تم إضافة الاشتراك بنجاح',
      subscription: result.rows[0]
    });
  } catch (error) {
    console.error('Error creating subscription:', error);
    res.status(500).json({ error: 'حدث خطأ في إضافة الاشتراك' });
  }
};

// Update subscription
exports.updateSubscription = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name, provider, subscription_type, cost, billing_cycle,
      start_date, end_date, auto_renew, login_url, username, password_encrypted, notes, status
    } = req.body;
    
    const result = await pool.query(`
      UPDATE subscriptions SET
        name = COALESCE($1, name),
        provider = COALESCE($2, provider),
        subscription_type = COALESCE($3, subscription_type),
        cost = COALESCE($4, cost),
        billing_cycle = COALESCE($5, billing_cycle),
        start_date = COALESCE($6, start_date),
        end_date = COALESCE($7, end_date),
        auto_renew = COALESCE($8, auto_renew),
        login_url = COALESCE($9, login_url),
        username = COALESCE($10, username),
        password_encrypted = COALESCE($11, password_encrypted),
        notes = COALESCE($12, notes),
        status = COALESCE($13, status),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $14
      RETURNING *
    `, [name, provider, subscription_type, cost, billing_cycle, start_date, end_date, auto_renew, login_url, username, password_encrypted, notes, status, id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'الاشتراك غير موجود' });
    }
    
    // Log activity
    logActivity(req, ACTIONS.UPDATE, ENTITIES.SUBSCRIPTION, id, 
      result.rows[0].name, `تم تحديث الاشتراك: ${result.rows[0].name}`);
    
    res.json({ message: 'تم تحديث الاشتراك بنجاح', subscription: result.rows[0] });
  } catch (error) {
    console.error('Error updating subscription:', error);
    res.status(500).json({ error: 'حدث خطأ في تحديث الاشتراك' });
  }
};

// Delete subscription
exports.deleteSubscription = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get subscription name
    const sub = await pool.query('SELECT name FROM subscriptions WHERE id = $1', [id]);
    const subName = sub.rows[0]?.name || `اشتراك #${id}`;
    
    await pool.query('DELETE FROM subscriptions WHERE id = $1', [id]);
    
    // Log activity
    logActivity(req, ACTIONS.DELETE, ENTITIES.SUBSCRIPTION, id, 
      subName, `تم حذف الاشتراك: ${subName}`);
    
    res.json({ message: 'تم حذف الاشتراك بنجاح' });
  } catch (error) {
    console.error('Error deleting subscription:', error);
    res.status(500).json({ error: 'حدث خطأ في حذف الاشتراك' });
  }
};

// Get expiring subscriptions
exports.getExpiringSubscriptions = async (req, res) => {
  try {
    const { days } = req.query;
    const daysFilter = days || 30;
    
    const result = await pool.query(`
      SELECT *, end_date - CURRENT_DATE as days_remaining
      FROM subscriptions
      WHERE status = 'active'
        AND end_date <= CURRENT_DATE + INTERVAL '${daysFilter} days'
        AND end_date >= CURRENT_DATE
      ORDER BY end_date ASC
    `);
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching expiring subscriptions:', error);
    res.status(500).json({ error: 'حدث خطأ في جلب الاشتراكات المنتهية' });
  }
};

// Get statistics
exports.getSubscriptionStats = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        COUNT(*) as total_subscriptions,
        COUNT(*) FILTER (WHERE status = 'active') as active_subscriptions,
        COUNT(*) FILTER (WHERE status = 'expired' OR end_date < CURRENT_DATE) as expired_subscriptions,
        COUNT(*) FILTER (WHERE end_date <= CURRENT_DATE + INTERVAL '7 days' AND end_date >= CURRENT_DATE) as expiring_week,
        COUNT(*) FILTER (WHERE end_date <= CURRENT_DATE + INTERVAL '30 days' AND end_date >= CURRENT_DATE) as expiring_month,
        COALESCE(SUM(cost) FILTER (WHERE status = 'active'), 0) as total_cost,
        COALESCE(SUM(cost) FILTER (WHERE status = 'active' AND billing_cycle = 'monthly'), 0) as monthly_cost,
        COALESCE(SUM(cost) FILTER (WHERE status = 'active' AND billing_cycle = 'yearly'), 0) as yearly_cost
      FROM subscriptions
    `);
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching subscription stats:', error);
    res.status(500).json({ error: 'حدث خطأ في جلب الإحصائيات' });
  }
};
