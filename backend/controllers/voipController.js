const pool = require('../config/database');
const https = require('https');
const http = require('http');
const crypto = require('crypto');

// ───────────── Grandstream UCM API helper ─────────────
let ucmCookie = null;
let ucmLockoutUntil = null;  // Cooldown timer to prevent extending UCM lockout

// UCM6302A uses GET /cgi?action=xxx&param=xxx format
function callUcmApi(config, params) {
  return new Promise((resolve, reject) => {
    const protocol = config.use_ssl !== false ? https : http;
    
    // Build query string from params
    const queryString = Object.entries(params)
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
      .join('&');
    
    const options = {
      hostname: config.server_url,
      port: config.port || 8089,
      path: `/cgi?${queryString}`,
      method: 'GET',
      headers: {
        ...(ucmCookie ? { Cookie: ucmCookie } : {})
      },
      rejectUnauthorized: false,
      timeout: 30000
    };

    console.log(`📞 UCM API: GET /cgi?action=${params.action}`);

    const req = protocol.request(options, (res) => {
      let data = '';
      
      // Capture set-cookie for session
      if (res.headers['set-cookie']) {
        const cookies = res.headers['set-cookie'];
        ucmCookie = cookies.map(c => c.split(';')[0]).join('; ');
      }

      res.on('data', chunk => (data += chunk));
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve(parsed);
        } catch (e) {
          reject(new Error('استجابة غير صالحة من PBX: ' + data.substring(0, 200)));
        }
      });
    });

    req.on('error', (err) => {
      if (err.code === 'ECONNREFUSED') {
        reject(new Error('لا يمكن الاتصال بالـ PBX - تأكد من العنوان والبورت'));
      } else if (err.code === 'ENOTFOUND') {
        reject(new Error('لم يتم العثور على الـ PBX - تأكد من العنوان'));
      } else if (err.code === 'ETIMEDOUT' || err.code === 'ESOCKETTIMEDOUT') {
        reject(new Error('انتهت مهلة الاتصال'));
      } else {
        reject(err);
      }
    });

    req.setTimeout(30000, () => {
      req.destroy();
      reject(new Error('انتهت مهلة الاتصال بالـ PBX'));
    });

    req.end();
  });
}

// Grandstream UCM login with challenge-response
async function ucmLogin(config) {
  // Check cooldown to prevent extending UCM lockout
  if (ucmLockoutUntil && Date.now() < ucmLockoutUntil) {
    const remainSec = Math.ceil((ucmLockoutUntil - Date.now()) / 1000);
    throw new Error(`الحساب محظور مؤقتاً - انتظر ${remainSec} ثانية قبل المحاولة مرة أخرى. أو ادخل على واجهة الـ UCM وامسح الحظر من Security Settings`);
  }

  // Reset cookie for fresh session
  ucmCookie = null;

  // Step 1: Get challenge
  const challengeResp = await callUcmApi(config, {
    action: 'challenge',
    user: config.username
  });

  if (challengeResp.status !== 0 || !challengeResp.response?.challenge) {
    throw new Error('فشل في الحصول على challenge من الـ PBX (status: ' + challengeResp.status + ')');
  }

  const challenge = challengeResp.response.challenge;
  console.log(`   Challenge received: ${challenge}`);

  // Step 2: Create MD5 token = md5(challenge + password)
  const token = crypto.createHash('md5')
    .update(challenge + config.password)
    .digest('hex');

  // Step 3: Login with token
  const loginResp = await callUcmApi(config, {
    action: 'login',
    user: config.username,
    token: token
  });

  if (loginResp.status !== 0) {
    if (loginResp.status === -121) {
      // Set 5-minute cooldown to prevent extending the lockout
      ucmLockoutUntil = Date.now() + 5 * 60 * 1000;
      throw new Error('الحساب محظور مؤقتاً من الـ UCM بسبب محاولات دخول كتير. انتظر 5 دقائق أو ادخل على واجهة الـ UCM → Security Settings وامسح الحظر عن IP السيرفر (10.1.0.103)');
    }
    if (loginResp.status === -37) {
      throw new Error('كلمة المرور غير صحيحة - تأكد من كلمة سر الـ admin في إعدادات الـ UCM');
    }
    throw new Error('فشل تسجيل الدخول (status: ' + loginResp.status + ')');
  }

  // Login succeeded - clear any lockout timer
  ucmLockoutUntil = null;

  // Store the cookie from login response
  if (loginResp.response?.cookie) {
    ucmCookie = `session_id=${loginResp.response.cookie}`;
  }

  console.log('   ✅ UCM login successful');
  return loginResp;
}

async function ucmLogout(config) {
  try {
    await callUcmApi(config, { action: 'logout' });
  } catch (e) {
    // ignore logout errors
  }
  ucmCookie = null;
}

// ───────────── Get Config ─────────────
exports.getConfig = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM voip_config WHERE id = 1');
    if (result.rows.length === 0) {
      return res.json({});
    }
    const config = { ...result.rows[0] };
    if (config.password) {
      config.password = '********';
    }
    res.json(config);
  } catch (error) {
    console.error('Error getting VoIP config:', error);
    res.status(500).json({ error: 'حدث خطأ في جلب الإعدادات' });
  }
};

// ───────────── Save Config ─────────────
exports.saveConfig = async (req, res) => {
  try {
    const {
      pbx_type, server_url, port, username, password,
      use_ssl, auto_sync_enabled, sync_interval_minutes
    } = req.body;

    let finalPassword = password;
    if (password === '********') {
      const existing = await pool.query('SELECT password FROM voip_config WHERE id = 1');
      if (existing.rows.length > 0) {
        finalPassword = existing.rows[0].password;
      }
    }

    const existing = await pool.query('SELECT id FROM voip_config WHERE id = 1');
    
    if (existing.rows.length === 0) {
      await pool.query(`
        INSERT INTO voip_config (id, pbx_type, server_url, port, username, password, use_ssl, auto_sync_enabled, sync_interval_minutes)
        VALUES (1, $1, $2, $3, $4, $5, $6, $7, $8)
      `, [pbx_type || 'grandstream', server_url, port || 8089, username, finalPassword, use_ssl !== false, auto_sync_enabled || false, sync_interval_minutes || 60]);
    } else {
      await pool.query(`
        UPDATE voip_config SET
          pbx_type = $1, server_url = $2, port = $3, username = $4, password = $5,
          use_ssl = $6, auto_sync_enabled = $7, sync_interval_minutes = $8,
          updated_at = NOW()
        WHERE id = 1
      `, [pbx_type || 'grandstream', server_url, port || 8089, username, finalPassword, use_ssl !== false, auto_sync_enabled || false, sync_interval_minutes || 60]);
    }

    res.json({ message: 'تم حفظ الإعدادات بنجاح' });
  } catch (error) {
    console.error('Error saving VoIP config:', error);
    res.status(500).json({ error: 'حدث خطأ في حفظ الإعدادات' });
  }
};

// ───────────── Test Connection ─────────────
exports.testConnection = async (req, res) => {
  try {
    let config = req.body;

    if (!config.password || config.password === '********') {
      const dbConfig = await pool.query('SELECT * FROM voip_config WHERE id = 1');
      if (dbConfig.rows.length > 0) {
        config = { ...dbConfig.rows[0], ...config };
        if (config.password === '********') {
          config.password = dbConfig.rows[0].password;
        }
      }
    }

    if (!config.server_url || !config.username || !config.password) {
      return res.status(400).json({ error: 'بيانات الاتصال غير مكتملة' });
    }

    const loginResult = await ucmLogin(config);
    await ucmLogout(config);

    // Update sync status on success
    await pool.query(`UPDATE voip_config SET last_sync_status = 'connected', last_sync_message = 'تم الاتصال بنجاح', updated_at = NOW() WHERE id = 1`);

    res.json({
      success: true,
      message: 'تم الاتصال بالـ PBX بنجاح!'
    });
  } catch (error) {
    console.error('UCM connection test failed:', error);
    const isLockout = error.message.includes('محظور');
    // Update sync status
    await pool.query(`UPDATE voip_config SET last_sync_status = 'error', last_sync_message = $1, updated_at = NOW() WHERE id = 1`, [error.message]).catch(() => {});
    res.status(isLockout ? 429 : 400).json({ error: error.message, lockout: isLockout });
  }
};

// ───────────── Sync Extensions ─────────────
exports.syncExtensions = async (req, res) => {
  try {
    const configResult = await pool.query('SELECT * FROM voip_config WHERE id = 1');
    if (configResult.rows.length === 0) {
      return res.status(400).json({ error: 'لم يتم تكوين إعدادات الـ PBX' });
    }

    const config = configResult.rows[0];
    if (!config.server_url || !config.password) {
      return res.status(400).json({ error: 'إعدادات الـ PBX غير مكتملة' });
    }

    console.log(`\n📞 Syncing extensions from Grandstream UCM: ${config.server_url}`);

    // Login
    await ucmLogin(config);

    // Fetch all SIP extensions - paginate
    let allExtensions = [];
    let page = 1;
    const pageSize = 100;
    let hasMore = true;

    while (hasMore) {
      const resp = await callUcmApi(config, {
        action: 'listAccount',
        item_num: String(pageSize),
        page: String(page),
        sidx: 'extension',
        sord: 'asc'
      });

      if (resp.status !== 0) {
        throw new Error('فشل في جلب الإكستنشنات: ' + (resp.response?.message || JSON.stringify(resp)));
      }

      const accounts = resp.response?.account || [];
      allExtensions = allExtensions.concat(accounts);

      const totalItems = resp.response?.total_item || 0;
      if (allExtensions.length >= totalItems || accounts.length < pageSize) {
        hasMore = false;
      } else {
        page++;
      }
    }

    // Logout
    await ucmLogout(config);

    console.log(`   Found ${allExtensions.length} extensions on UCM`);

    // Get employees for auto-linking
    const employeesResult = await pool.query('SELECT id, full_name, email, phone FROM employees');
    const employees = employeesResult.rows;

    let newCount = 0, updatedCount = 0, errorCount = 0;
    const errors = [];

    for (const ext of allExtensions) {
      try {
        const extension = ext.extension || ext.account_number || '';
        if (!extension) continue;

        const callerIdName = ext.fullname || ext.caller_id_name || ext.callerid || '';
        const callerIdNumber = ext.caller_id_number || extension;
        const department = ext.department || '';
        const email = ext.email || '';
        const accountType = ext.account_type || ext.type || 'SIP';
        const outOfService = ext.out_of_service || 'no';
        const status = outOfService === 'yes' ? 'inactive' : 'active';

        // Try auto-link to employee
        let employeeId = null;
        const matchedEmployee = employees.find(emp => {
          // Match by phone/extension
          if (emp.phone && (emp.phone === extension || emp.phone.endsWith(extension))) return true;
          // Match by email
          if (emp.email && email && emp.email.toLowerCase() === email.toLowerCase()) return true;
          // Match by name
          if (callerIdName && emp.full_name) {
            const extName = callerIdName.toLowerCase().trim();
            const empName = emp.full_name.toLowerCase().trim();
            if (extName && empName && (extName === empName || extName.includes(empName) || empName.includes(extName))) return true;
          }
          return false;
        });
        if (matchedEmployee) {
          employeeId = matchedEmployee.id;
        }

        // Upsert
        const existing = await pool.query(
          'SELECT id, employee_id FROM voip_extensions WHERE extension = $1',
          [extension]
        );

        if (existing.rows.length > 0) {
          await pool.query(`
            UPDATE voip_extensions SET
              caller_id_name = $1, caller_id_number = $2, department = $3,
              email = $4, account_type = $5, status = $6,
              employee_id = COALESCE(employee_id, $7),
              out_of_service = $8,
              raw_data = $9,
              last_synced_at = NOW(), updated_at = NOW()
            WHERE extension = $10
          `, [callerIdName, callerIdNumber, department, email, accountType, status, employeeId, outOfService, JSON.stringify(ext), extension]);
          updatedCount++;
        } else {
          await pool.query(`
            INSERT INTO voip_extensions (
              extension, caller_id_name, caller_id_number, department,
              email, account_type, status, employee_id, out_of_service,
              raw_data, last_synced_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
          `, [extension, callerIdName, callerIdNumber, department, email, accountType, status, employeeId, outOfService, JSON.stringify(ext)]);
          newCount++;
        }

        if (employeeId) {
          console.log(`   ✅ Ext ${extension} (${callerIdName}) → employee #${employeeId}`);
        }
      } catch (err) {
        errorCount++;
        errors.push({ extension: ext.extension, error: err.message });
        console.error(`   ❌ Error syncing ext ${ext.extension}:`, err.message);
      }
    }

    const totalSynced = newCount + updatedCount;
    const message = `تم مزامنة ${totalSynced} إكستنشن (${newCount} جديد، ${updatedCount} محدث${errorCount > 0 ? `، ${errorCount} أخطاء` : ''})`;

    // Update config
    await pool.query(`
      UPDATE voip_config SET
        last_sync_at = NOW(),
        last_sync_status = $1,
        last_sync_message = $2,
        last_sync_count = $3,
        updated_at = NOW()
      WHERE id = 1
    `, [errorCount === 0 ? 'success' : 'partial', message, totalSynced]);

    // Log sync
    await pool.query(`
      INSERT INTO voip_sync_logs (sync_type, total_found, new_count, updated_count, error_count, status, message, details)
      VALUES ('extensions', $1, $2, $3, $4, $5, $6, $7)
    `, [allExtensions.length, newCount, updatedCount, errorCount, errorCount === 0 ? 'success' : 'partial', message, JSON.stringify({ errors })]);

    console.log(`   📞 Sync complete: ${message}`);

    res.json({
      total: allExtensions.length,
      new: newCount,
      updated: updatedCount,
      errors: errorCount,
      message,
      errorDetails: errors.length > 0 ? errors : undefined
    });
  } catch (error) {
    console.error('❌ Error syncing extensions:', error);

    try {
      await pool.query(`
        UPDATE voip_config SET
          last_sync_at = NOW(), last_sync_status = 'error',
          last_sync_message = $1, updated_at = NOW()
        WHERE id = 1
      `, [error.message]);

      await pool.query(`
        INSERT INTO voip_sync_logs (sync_type, status, message)
        VALUES ('extensions', 'error', $1)
      `, [error.message]);
    } catch (logErr) {
      console.error('Error logging sync failure:', logErr);
    }

    await ucmLogout({}).catch(() => {});
    res.status(500).json({ error: error.message });
  }
};

// ───────────── Get Extensions ─────────────
exports.getExtensions = async (req, res) => {
  try {
    const { status, department, linked } = req.query;
    let query = `
      SELECT e.*, emp.full_name as employee_name 
      FROM voip_extensions e 
      LEFT JOIN employees emp ON e.employee_id = emp.id
      WHERE 1=1
    `;
    const params = [];

    if (status) {
      params.push(status);
      query += ` AND e.status = $${params.length}`;
    }
    if (department) {
      params.push(department);
      query += ` AND e.department = $${params.length}`;
    }
    if (linked === 'yes') {
      query += ` AND e.employee_id IS NOT NULL`;
    } else if (linked === 'no') {
      query += ` AND e.employee_id IS NULL`;
    }

    query += ' ORDER BY e.extension ASC';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching extensions:', error);
    res.status(500).json({ error: 'حدث خطأ في جلب الإكستنشنات' });
  }
};

// ───────────── Link Extension to Employee ─────────────
exports.linkExtension = async (req, res) => {
  try {
    const { id } = req.params;
    const { employee_id } = req.body;

    await pool.query(
      'UPDATE voip_extensions SET employee_id = $1, updated_at = NOW() WHERE id = $2',
      [employee_id || null, id]
    );

    res.json({ message: employee_id ? 'تم ربط الإكستنشن بالموظف' : 'تم فك ربط الإكستنشن' });
  } catch (error) {
    console.error('Error linking extension:', error);
    res.status(500).json({ error: 'حدث خطأ' });
  }
};

// ───────────── Get Stats ─────────────
exports.getStats = async (req, res) => {
  try {
    const configResult = await pool.query('SELECT last_sync_at, last_sync_status, last_sync_count, last_sync_message FROM voip_config WHERE id = 1');
    const config = configResult.rows[0] || {};

    const stats = await pool.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'active') as active,
        COUNT(*) FILTER (WHERE status = 'inactive') as inactive,
        COUNT(*) FILTER (WHERE employee_id IS NOT NULL) as linked,
        COUNT(*) FILTER (WHERE employee_id IS NULL) as unlinked,
        COUNT(DISTINCT department) FILTER (WHERE department IS NOT NULL AND department != '') as departments
      FROM voip_extensions
    `);

    res.json({
      ...stats.rows[0],
      last_sync_at: config.last_sync_at,
      last_sync_status: config.last_sync_status,
      last_sync_count: config.last_sync_count,
      last_sync_message: config.last_sync_message
    });
  } catch (error) {
    console.error('Error getting VoIP stats:', error);
    res.status(500).json({ error: 'حدث خطأ' });
  }
};

// ───────────── Get Sync Logs ─────────────
exports.getSyncLogs = async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM voip_sync_logs ORDER BY created_at DESC LIMIT 50'
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching VoIP sync logs:', error);
    res.status(500).json({ error: 'حدث خطأ في جلب سجلات المزامنة' });
  }
};

// ───────────── Delete Extension ─────────────
exports.deleteExtension = async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM voip_extensions WHERE id = $1', [id]);
    res.json({ message: 'تم حذف الإكستنشن' });
  } catch (error) {
    console.error('Error deleting extension:', error);
    res.status(500).json({ error: 'حدث خطأ في الحذف' });
  }
};
