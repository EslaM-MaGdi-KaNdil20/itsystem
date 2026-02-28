const pool = require('../config/database');
const { logActivity, ACTIONS, ENTITIES } = require('./activityLogController');

// Get all servers
exports.getAllServers = async (req, res) => {
  try {
    const { status, server_type } = req.query;
    
    let query = 'SELECT * FROM servers WHERE 1=1';
    const params = [];
    
    if (status) {
      params.push(status);
      query += ` AND status = $${params.length}`;
    }
    if (server_type) {
      params.push(server_type);
      query += ` AND server_type = $${params.length}`;
    }
    
    query += ' ORDER BY name ASC';
    
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching servers:', error);
    res.status(500).json({ error: 'حدث خطأ في جلب السيرفرات' });
  }
};

// Get server by ID
exports.getServerById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM servers WHERE id = $1', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'السيرفر غير موجود' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching server:', error);
    res.status(500).json({ error: 'حدث خطأ في جلب السيرفر' });
  }
};

// Create server
exports.createServer = async (req, res) => {
  try {
    const {
      name, hostname, public_ip, private_ip, ssh_port, server_type, provider,
      location, os, cpu, ram, storage, username, password_encrypted, ssh_key, notes, status
    } = req.body;
    
    const result = await pool.query(`
      INSERT INTO servers (
        name, hostname, public_ip, private_ip, ssh_port, server_type, provider,
        location, os, cpu, ram, storage, username, password_encrypted, ssh_key, notes, status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
      RETURNING *
    `, [
      name, hostname, public_ip, private_ip, ssh_port || 22, server_type, provider,
      location, os, cpu, ram, storage, username, password_encrypted, ssh_key, notes, status || 'active'
    ]);
    
    res.status(201).json({
      message: 'تم إضافة السيرفر بنجاح',
      server: result.rows[0]
    });
    
    // Log activity
    logActivity(req, ACTIONS.CREATE, ENTITIES.SERVER, result.rows[0].id, 
      name, `تم إضافة سيرفر جديد: ${name} (${public_ip || hostname})`);
  } catch (error) {
    console.error('Error creating server:', error);
    res.status(500).json({ error: 'حدث خطأ في إضافة السيرفر' });
  }
};

// Update server
exports.updateServer = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name, hostname, public_ip, private_ip, ssh_port, server_type, provider,
      location, os, cpu, ram, storage, username, password_encrypted, ssh_key, notes, status
    } = req.body;
    
    const result = await pool.query(`
      UPDATE servers SET
        name = COALESCE($1, name),
        hostname = COALESCE($2, hostname),
        public_ip = COALESCE($3, public_ip),
        private_ip = COALESCE($4, private_ip),
        ssh_port = COALESCE($5, ssh_port),
        server_type = COALESCE($6, server_type),
        provider = COALESCE($7, provider),
        location = COALESCE($8, location),
        os = COALESCE($9, os),
        cpu = COALESCE($10, cpu),
        ram = COALESCE($11, ram),
        storage = COALESCE($12, storage),
        username = COALESCE($13, username),
        password_encrypted = COALESCE($14, password_encrypted),
        ssh_key = COALESCE($15, ssh_key),
        notes = COALESCE($16, notes),
        status = COALESCE($17, status),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $18
      RETURNING *
    `, [name, hostname, public_ip, private_ip, ssh_port, server_type, provider,
        location, os, cpu, ram, storage, username, password_encrypted, ssh_key, notes, status, id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'السيرفر غير موجود' });
    }
    
    // Log activity
    logActivity(req, ACTIONS.UPDATE, ENTITIES.SERVER, id, 
      result.rows[0].name, `تم تحديث السيرفر: ${result.rows[0].name}`);
    
    res.json({ message: 'تم تحديث السيرفر بنجاح', server: result.rows[0] });
  } catch (error) {
    console.error('Error updating server:', error);
    res.status(500).json({ error: 'حدث خطأ في تحديث السيرفر' });
  }
};

// Delete server
exports.deleteServer = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get server name before delete
    const server = await pool.query('SELECT name FROM servers WHERE id = $1', [id]);
    const serverName = server.rows[0]?.name || `سيرفر #${id}`;
    
    await pool.query('DELETE FROM servers WHERE id = $1', [id]);
    
    // Log activity
    logActivity(req, ACTIONS.DELETE, ENTITIES.SERVER, id, 
      serverName, `تم حذف السيرفر: ${serverName}`);
    
    res.json({ message: 'تم حذف السيرفر بنجاح' });
  } catch (error) {
    console.error('Error deleting server:', error);
    res.status(500).json({ error: 'حدث خطأ في حذف السيرفر' });
  }
};

// Get server stats
exports.getServerStats = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        COUNT(*) as total_servers,
        COUNT(*) FILTER (WHERE status = 'active') as active_servers,
        COUNT(*) FILTER (WHERE status = 'maintenance') as maintenance_servers,
        COUNT(*) FILTER (WHERE status = 'offline') as offline_servers,
        COUNT(DISTINCT server_type) as server_types,
        COUNT(DISTINCT provider) as providers_count
      FROM servers
    `);
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching server stats:', error);
    res.status(500).json({ error: 'حدث خطأ في جلب الإحصائيات' });
  }
};
