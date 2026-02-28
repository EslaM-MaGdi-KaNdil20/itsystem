const pool = require('../config/database');
const { logActivity, ACTIONS, ENTITIES } = require('./activityLogController');

// Get all IPs
exports.getAllIPs = async (req, res) => {
  try {
    const { status, device_type } = req.query;
    
    let query = 'SELECT * FROM network_ips WHERE 1=1';
    const params = [];
    
    if (status) {
      params.push(status);
      query += ` AND status = $${params.length}`;
    }
    if (device_type) {
      params.push(device_type);
      query += ` AND device_type = $${params.length}`;
    }
    
    query += ' ORDER BY ip_address ASC';
    
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching IPs:', error);
    res.status(500).json({ error: 'حدث خطأ في جلب عناوين IP' });
  }
};

// Get IP by ID
exports.getIPById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM network_ips WHERE id = $1', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'عنوان IP غير موجود' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching IP:', error);
    res.status(500).json({ error: 'حدث خطأ في جلب عنوان IP' });
  }
};

// Create IP
exports.createIP = async (req, res) => {
  try {
    const {
      ip_address, subnet_mask, gateway, vlan, mac_address, device_type,
      assigned_to, location, notes, status
    } = req.body;
    
    // Check if IP already exists
    const existingIP = await pool.query('SELECT id FROM network_ips WHERE ip_address = $1', [ip_address]);
    if (existingIP.rows.length > 0) {
      return res.status(400).json({ error: 'عنوان IP موجود بالفعل' });
    }
    
    const result = await pool.query(`
      INSERT INTO network_ips (
        ip_address, subnet_mask, gateway, vlan, mac_address, device_type,
        assigned_to, location, notes, status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `, [
      ip_address, subnet_mask, gateway, vlan, mac_address, device_type,
      assigned_to, location, notes, status || 'available'
    ]);
    
    res.status(201).json({
      message: 'تم إضافة عنوان IP بنجاح',
      ip: result.rows[0]
    });
    
    // Log activity
    logActivity(req, ACTIONS.CREATE, ENTITIES.NETWORK_IP, result.rows[0].id, 
      ip_address, `تم إضافة عنوان IP جديد: ${ip_address}`);
  } catch (error) {
    console.error('Error creating IP:', error);
    res.status(500).json({ error: 'حدث خطأ في إضافة عنوان IP' });
  }
};

// Update IP
exports.updateIP = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      ip_address, subnet_mask, gateway, vlan, mac_address, device_type,
      assigned_to, location, notes, status
    } = req.body;
    
    const result = await pool.query(`
      UPDATE network_ips SET
        ip_address = COALESCE($1, ip_address),
        subnet_mask = COALESCE($2, subnet_mask),
        gateway = COALESCE($3, gateway),
        vlan = COALESCE($4, vlan),
        mac_address = COALESCE($5, mac_address),
        device_type = COALESCE($6, device_type),
        assigned_to = COALESCE($7, assigned_to),
        location = COALESCE($8, location),
        notes = COALESCE($9, notes),
        status = COALESCE($10, status),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $11
      RETURNING *
    `, [ip_address, subnet_mask, gateway, vlan, mac_address, device_type,
        assigned_to, location, notes, status, id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'عنوان IP غير موجود' });
    }
    
    // Log activity
    logActivity(req, ACTIONS.UPDATE, ENTITIES.NETWORK_IP, id, 
      result.rows[0].ip_address, `تم تحديث عنوان IP: ${result.rows[0].ip_address}`);
    
    res.json({ message: 'تم تحديث عنوان IP بنجاح', ip: result.rows[0] });
  } catch (error) {
    console.error('Error updating IP:', error);
    res.status(500).json({ error: 'حدث خطأ في تحديث عنوان IP' });
  }
};

// Delete IP
exports.deleteIP = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get IP address before delete
    const ip = await pool.query('SELECT ip_address FROM network_ips WHERE id = $1', [id]);
    const ipAddr = ip.rows[0]?.ip_address || `IP #${id}`;
    
    await pool.query('DELETE FROM network_ips WHERE id = $1', [id]);
    
    // Log activity
    logActivity(req, ACTIONS.DELETE, ENTITIES.NETWORK_IP, id, 
      ipAddr, `تم حذف عنوان IP: ${ipAddr}`);
    
    res.json({ message: 'تم حذف عنوان IP بنجاح' });
  } catch (error) {
    console.error('Error deleting IP:', error);
    res.status(500).json({ error: 'حدث خطأ في حذف عنوان IP' });
  }
};

// Get IP stats
exports.getIPStats = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        COUNT(*) as total_ips,
        COUNT(*) FILTER (WHERE status = 'available') as available_ips,
        COUNT(*) FILTER (WHERE status = 'assigned') as assigned_ips,
        COUNT(*) FILTER (WHERE status = 'reserved') as reserved_ips,
        COUNT(DISTINCT device_type) as device_types,
        COUNT(DISTINCT vlan) as vlans_count
      FROM network_ips
    `);
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching IP stats:', error);
    res.status(500).json({ error: 'حدث خطأ في جلب الإحصائيات' });
  }
};
