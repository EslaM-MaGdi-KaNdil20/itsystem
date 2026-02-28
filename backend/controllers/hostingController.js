const pool = require('../config/database');
const https = require('https');
const http = require('http');
const { restartHostingAutoSync } = require('../services/hostingSyncService');

// ───────────── cPanel UAPI helper (port 2083) ─────────────
function callCpanelApi(config, endpoint) {
  return new Promise((resolve, reject) => {
    const protocol = config.use_ssl !== false ? https : http;
    const username = config.cpanel_user || config.username;
    const options = {
      hostname: config.server_url,
      port: config.port || 2083,
      path: endpoint,
      method: 'GET',
      headers: {
        Authorization: `cpanel ${username}:${config.api_token}`
      },
      rejectUnauthorized: false,
      timeout: 30000
    };

    console.log(`📡 cPanel API: GET ${endpoint.substring(0, 80)}`);

    const req = protocol.request(options, (res) => {
      let data = '';
      res.on('data', chunk => (data += chunk));
      res.on('end', () => {
        if (res.statusCode === 401) {
          return reject(new Error('فشل المصادقة - تأكد من اسم المستخدم و API Token'));
        }
        if (res.statusCode === 403) {
          return reject(new Error('غير مصرح - تأكد من صلاحيات الحساب'));
        }
        if (res.statusCode !== 200) {
          return reject(new Error(`HTTP ${res.statusCode}: ${data.substring(0, 200)}`));
        }
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error('استجابة غير صالحة من السيرفر: ' + data.substring(0, 200)));
        }
      });
    });

    req.on('error', (err) => {
      if (err.code === 'ECONNREFUSED') {
        reject(new Error('لا يمكن الاتصال بالسيرفر - تأكد من العنوان والبورت'));
      } else if (err.code === 'ENOTFOUND') {
        reject(new Error('لم يتم العثور على السيرفر - تأكد من العنوان'));
      } else if (err.code === 'ETIMEDOUT' || err.code === 'ESOCKETTIMEDOUT') {
        reject(new Error('انتهت مهلة الاتصال'));
      } else {
        reject(err);
      }
    });

    req.setTimeout(30000, () => {
      req.destroy();
      reject(new Error('انتهت مهلة الاتصال بالسيرفر'));
    });

    req.end();
  });
}

// ───────────── Get Config ─────────────
exports.getConfig = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM hosting_config WHERE id = 1');
    if (result.rows.length === 0) {
      return res.json({});
    }
    const config = { ...result.rows[0] };
    // Mask API token
    if (config.api_token) {
      config.api_token = '********';
    }
    res.json(config);
  } catch (error) {
    console.error('Error getting hosting config:', error);
    res.status(500).json({ error: 'حدث خطأ في جلب الإعدادات' });
  }
};

// ───────────── Save Config ─────────────
exports.saveConfig = async (req, res) => {
  try {
    const {
      server_url, port, username, api_token,
      cpanel_user, domain, use_ssl,
      auto_sync_enabled, sync_interval_minutes,
      alert_enabled, alert_threshold_percent, alert_email
    } = req.body;

    // If token is masked, keep the old one
    let finalToken = api_token;
    if (api_token === '********') {
      const existing = await pool.query('SELECT api_token FROM hosting_config WHERE id = 1');
      if (existing.rows.length > 0) {
        finalToken = existing.rows[0].api_token;
      }
    }

    const existing = await pool.query('SELECT id FROM hosting_config WHERE id = 1');
    
    if (existing.rows.length === 0) {
      await pool.query(`
        INSERT INTO hosting_config (id, server_url, port, username, api_token, cpanel_user, domain, use_ssl, auto_sync_enabled, sync_interval_minutes, alert_enabled, alert_threshold_percent, alert_email)
        VALUES (1, $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      `, [server_url, port || 2083, username, finalToken, cpanel_user, domain, use_ssl !== false, auto_sync_enabled || false, sync_interval_minutes || 4, alert_enabled !== false, alert_threshold_percent || 85, alert_email || '']);
    } else {
      await pool.query(`
        UPDATE hosting_config SET
          server_url = $1, port = $2, username = $3, api_token = $4,
          cpanel_user = $5, domain = $6, use_ssl = $7,
          auto_sync_enabled = $8, sync_interval_minutes = $9,
          alert_enabled = $10, alert_threshold_percent = $11, alert_email = $12,
          updated_at = NOW()
        WHERE id = 1
      `, [server_url, port || 2083, username, finalToken, cpanel_user, domain, use_ssl !== false, auto_sync_enabled || false, sync_interval_minutes || 4, alert_enabled !== false, alert_threshold_percent || 85, alert_email || '']);
    }

    // Restart auto-sync with new settings
    await restartHostingAutoSync();

    res.json({ message: 'تم حفظ الإعدادات بنجاح' });
  } catch (error) {
    console.error('Error saving hosting config:', error);
    res.status(500).json({ error: 'حدث خطأ في حفظ الإعدادات' });
  }
};

// ───────────── Test Connection ─────────────
exports.testConnection = async (req, res) => {
  try {
    let config = req.body;

    // If token is masked, get real one from DB
    if (!config.api_token || config.api_token === '********') {
      const dbConfig = await pool.query('SELECT * FROM hosting_config WHERE id = 1');
      if (dbConfig.rows.length > 0) {
        config = { ...dbConfig.rows[0], ...config };
        if (config.api_token === '********') {
          config.api_token = dbConfig.rows[0].api_token;
        }
      }
    }

    if (!config.server_url || !config.username || !config.api_token) {
      return res.status(400).json({ error: 'بيانات الاتصال غير مكتملة' });
    }

    // Test with cPanel UAPI - list email accounts
    const result = await callCpanelApi(config, '/execute/Email/list_pops');
    
    if (result && result.status === 1) {
      const count = result.data ? result.data.length : 0;
      res.json({
        success: true,
        message: `تم الاتصال بنجاح! تم العثور على ${count} حساب بريد`
      });
    } else if (result && result.errors && result.errors.length > 0) {
      throw new Error(result.errors.join(', '));
    } else {
      res.json({
        success: true,
        message: 'تم الاتصال بنجاح!'
      });
    }
  } catch (error) {
    console.error('cPanel connection test failed:', error);
    res.status(400).json({ error: error.message });
  }
};

// ───────────── List Domains ─────────────
exports.listDomains = async (req, res) => {
  try {
    const configResult = await pool.query('SELECT * FROM hosting_config WHERE id = 1');
    if (configResult.rows.length === 0) {
      return res.status(400).json({ error: 'لم يتم تكوين إعدادات الاستضافة' });
    }
    const config = configResult.rows[0];

    // List domains via cPanel UAPI
    const result = await callCpanelApi(config, '/execute/DomainInfo/list_domains');
    
    if (result && result.status === 1 && result.data) {
      const domains = [];
      // Main domain
      if (result.data.main_domain) {
        domains.push({ domain: result.data.main_domain, type: 'main' });
      }
      // Addon domains
      if (result.data.addon_domains) {
        result.data.addon_domains.forEach(d => domains.push({ domain: d, type: 'addon' }));
      }
      // Subdomains
      if (result.data.sub_domains) {
        result.data.sub_domains.forEach(d => domains.push({ domain: d, type: 'sub' }));
      }
      res.json(domains);
    } else {
      res.json([]);
    }
  } catch (error) {
    console.error('Error listing domains:', error);
    res.status(500).json({ error: error.message });
  }
};

// ───────────── Sync Emails ─────────────
exports.syncEmails = async (req, res) => {
  try {
    const configResult = await pool.query('SELECT * FROM hosting_config WHERE id = 1');
    if (configResult.rows.length === 0) {
      return res.status(400).json({ error: 'لم يتم تكوين إعدادات الاستضافة' });
    }

    const config = configResult.rows[0];
    if (!config.server_url || !config.api_token || !config.domain) {
      return res.status(400).json({ error: 'إعدادات الاستضافة غير مكتملة' });
    }

    const cpanelUser = config.cpanel_user || config.username;
    const domain = config.domain;

    console.log(`\n📧 Syncing emails from cPanel: ${domain} (user: ${cpanelUser})`);

    // Call cPanel UAPI to list email accounts with disk usage
    const response = await callCpanelApi(config, `/execute/Email/list_pops_with_disk?domain=${encodeURIComponent(domain)}`);

    // Parse UAPI response
    let emailAccounts = [];
    if (response && response.status === 1 && response.data) {
      emailAccounts = response.data;
    } else if (response && response.errors && response.errors.length > 0) {
      throw new Error(response.errors.join(', '));
    } else {
      throw new Error('استجابة غير متوقعة من cPanel API');
    }

    console.log(`   Found ${emailAccounts.length} email accounts on cPanel`);

    // Get existing employees for auto-linking (with AD data)
    const employeesResult = await pool.query(`
      SELECT e.id, e.full_name, e.email, e.employee_code,
             a.sam_account_name as ad_username
      FROM employees e
      LEFT JOIN ad_users a ON e.ad_guid = a.ad_guid OR e.employee_code = a.sam_account_name
    `);
    const employees = employeesResult.rows;

    // Fuzzy compare helper
    function fuzzyMatch(a, b) {
      if (!a || !b) return false;
      const al = a.toLowerCase(), bl = b.toLowerCase();
      if (al === bl) return true;
      const lenRatio = Math.min(al.length, bl.length) / Math.max(al.length, bl.length);
      if (lenRatio >= 0.7 && (al.includes(bl) || bl.includes(al))) return true;
      const maxDist = Math.max(1, Math.floor(Math.min(al.length, bl.length) / 3));
      const matrix = [];
      for (let i = 0; i <= bl.length; i++) matrix[i] = [i];
      for (let j = 0; j <= al.length; j++) matrix[0][j] = j;
      for (let i = 1; i <= bl.length; i++)
        for (let j = 1; j <= al.length; j++) {
          const cost = al[j-1] === bl[i-1] ? 0 : 1;
          matrix[i][j] = Math.min(matrix[i-1][j]+1, matrix[i][j-1]+1, matrix[i-1][j-1]+cost);
        }
      return matrix[bl.length][al.length] <= maxDist;
    }

    let newCount = 0, updatedCount = 0, errorCount = 0;
    const errors = [];

    for (const email of emailAccounts) {
      try {
        // Skip the default/main cPanel account
        const login = email.login || email.email || '';
        if (login === cpanelUser || login === `${cpanelUser}@${domain}`) continue;

        const emailAddress = email.email || `${email.login || email.user}@${domain}`;
        
        // Parse quota - UAPI returns in bytes, convert to MB
        let quotaMb = null;
        if (email._diskquota && email._diskquota !== 'unlimited' && email._diskquota !== '0' && email._diskquota !== 0) {
          const q = parseFloat(email._diskquota);
          quotaMb = q > 10000 ? Math.round(q / 1024 / 1024) : Math.round(q);
        } else if (email.diskquota && email.diskquota !== 'unlimited' && email.diskquota !== '0' && email.diskquota !== 0) {
          const q = parseFloat(email.diskquota);
          quotaMb = q > 10000 ? Math.round(q / 1024 / 1024) : Math.round(q);
        }

        // Parse disk used (in MB)
        let diskUsedMb = 0;
        if (email.diskused !== undefined) {
          const used = parseFloat(email.diskused);
          diskUsedMb = isNaN(used) ? 0 : Math.round(used * 100) / 100;
        } else if (email.humandiskused) {
          // UAPI sometimes returns human-readable format like "10.5 MB"
          const match = String(email.humandiskused).match(/([\d.]+)\s*(MB|KB|GB|B)/i);
          if (match) {
            const val = parseFloat(match[1]);
            const unit = match[2].toUpperCase();
            if (unit === 'GB') diskUsedMb = val * 1024;
            else if (unit === 'MB') diskUsedMb = val;
            else if (unit === 'KB') diskUsedMb = val / 1024;
            else diskUsedMb = val / 1024 / 1024;
          }
        }

        let quotaUsedMb = Math.round(diskUsedMb);

        // Try auto-link to employee (smart matching with fuzzy + AD)
        let employeeId = null;
        const emailUser = emailAddress.split('@')[0].toLowerCase().replace(/[._-]/g, ' ').trim();
        const emailParts = emailUser.split(/\s+/).filter(p => p.length > 1);
        let bestScore = 0;

        for (const emp of employees) {
          // Exact email match
          if (emp.email && emp.email.toLowerCase() === emailAddress.toLowerCase()) {
            employeeId = emp.id;
            break;
          }

          // Match via AD username / employee_code (fuzzy)
          const adUsername = (emp.ad_username || emp.employee_code || '').toLowerCase();
          if (adUsername && adUsername.length > 2) {
            const adParts = adUsername.replace(/[._-]/g, ' ').split(/\s+/).filter(p => p.length > 1);
            if (adParts.length > 0 && emailParts.length > 0) {
              const matched = adParts.filter(ap => emailParts.some(ep => fuzzyMatch(ap, ep)));
              const reverse = emailParts.filter(ep => adParts.some(ap => fuzzyMatch(ap, ep)));
              if (matched.length === adParts.length && reverse.length === emailParts.length) {
                const score = 90;
                if (score > bestScore) { bestScore = score; employeeId = emp.id; }
              }
            }
          }

          // Smart name matching (fuzzy)
          const empName = (emp.full_name || '').toLowerCase().trim();
          if (!empName || empName.length < 3 || emailParts.length === 0) continue;
          const nameParts = empName.split(/\s+/).filter(p => p.length > 2);
          if (nameParts.length === 0) continue;
          const matchedNameParts = nameParts.filter(part => emailParts.some(ep => fuzzyMatch(part, ep)));
          const matchedEmailParts = emailParts.filter(part => nameParts.some(np => fuzzyMatch(np, part)));
          if (matchedNameParts.length === nameParts.length && matchedEmailParts.length >= 1) {
            const score = 50 + (matchedNameParts.length * 10) + (matchedEmailParts.length * 10);
            if (score > bestScore) { bestScore = score; employeeId = emp.id; }
          }
        }

        // Upsert into email_accounts
        const existing = await pool.query(
          'SELECT id, employee_id FROM email_accounts WHERE email_address = $1',
          [emailAddress]
        );

        if (existing.rows.length > 0) {
          // Update existing
          await pool.query(`
            UPDATE email_accounts SET
              quota_mb = COALESCE($1, quota_mb),
              quota_used_mb = $2,
              disk_used_mb = $3,
              source = 'cpanel',
              domain = $4,
              cpanel_user = $5,
              employee_id = COALESCE(employee_id, $6),
              status = 'active',
              last_synced_at = NOW(),
              updated_at = NOW()
            WHERE email_address = $7
          `, [quotaMb, quotaUsedMb, diskUsedMb, domain, email.user, employeeId, emailAddress]);
          updatedCount++;
        } else {
          // Insert new
          await pool.query(`
            INSERT INTO email_accounts (
              email_address, email_type, quota_mb, quota_used_mb, disk_used_mb,
              source, domain, cpanel_user, employee_id, status, last_synced_at,
              server_incoming, server_outgoing
            )
            VALUES ($1, 'work', $2, $3, $4, 'cpanel', $5, $6, $7, 'active', NOW(), $8, $9)
          `, [
            emailAddress, quotaMb, quotaUsedMb, diskUsedMb,
            domain, email.user, employeeId,
            `mail.${domain}`, `mail.${domain}`
          ]);
          newCount++;
        }

        if (employeeId) {
          console.log(`   ✅ ${emailAddress} → linked to employee #${employeeId}`);
        }
      } catch (err) {
        errorCount++;
        errors.push({ email: email.user || email.email, error: err.message });
        console.error(`   ❌ Error syncing ${email.user}:`, err.message);
      }
    }

    const totalSynced = newCount + updatedCount;
    const message = `تم مزامنة ${totalSynced} حساب بريد (${newCount} جديد، ${updatedCount} محدث${errorCount > 0 ? `، ${errorCount} أخطاء` : ''})`;

    // Update config with sync results
    await pool.query(`
      UPDATE hosting_config SET
        last_sync_at = NOW(),
        last_sync_status = $1,
        last_sync_message = $2,
        last_sync_count = $3,
        updated_at = NOW()
      WHERE id = 1
    `, [errorCount === 0 ? 'success' : 'partial', message, totalSynced]);

    // Log sync
    await pool.query(`
      INSERT INTO hosting_sync_logs (
        sync_type, total_found, new_count, updated_count, error_count, status, message, details
      )
      VALUES ('emails', $1, $2, $3, $4, $5, $6, $7)
    `, [
      emailAccounts.length, newCount, updatedCount, errorCount,
      errorCount === 0 ? 'success' : 'partial',
      message,
      JSON.stringify({ domain, errors })
    ]);

    console.log(`   📧 Sync complete: ${message}`);

    res.json({
      total: emailAccounts.length,
      new: newCount,
      updated: updatedCount,
      errors: errorCount,
      message,
      errorDetails: errors.length > 0 ? errors : undefined
    });
  } catch (error) {
    console.error('❌ Error syncing emails:', error);

    // Log failure
    try {
      await pool.query(`
        UPDATE hosting_config SET
          last_sync_at = NOW(),
          last_sync_status = 'error',
          last_sync_message = $1,
          updated_at = NOW()
        WHERE id = 1
      `, [error.message]);

      await pool.query(`
        INSERT INTO hosting_sync_logs (sync_type, status, message)
        VALUES ('emails', 'error', $1)
      `, [error.message]);
    } catch (logErr) {
      console.error('Error logging sync failure:', logErr);
    }

    res.status(500).json({ error: error.message });
  }
};

// ───────────── Get Sync Logs ─────────────
exports.getSyncLogs = async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM hosting_sync_logs ORDER BY created_at DESC LIMIT 50'
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching sync logs:', error);
    res.status(500).json({ error: 'حدث خطأ في جلب سجلات المزامنة' });
  }
};

// ───────────── Get Hosting Stats ─────────────
exports.getStats = async (req, res) => {
  try {
    const configResult = await pool.query('SELECT last_sync_at, last_sync_status, last_sync_count, last_sync_message FROM hosting_config WHERE id = 1');
    const config = configResult.rows[0] || {};

    const emailStats = await pool.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE source = 'cpanel') as cpanel_synced,
        COUNT(*) FILTER (WHERE source = 'manual') as manual,
        COUNT(*) FILTER (WHERE employee_id IS NOT NULL) as linked,
        COUNT(*) FILTER (WHERE employee_id IS NULL) as unlinked,
        COALESCE(SUM(quota_mb), 0) as total_quota,
        COALESCE(SUM(disk_used_mb), 0) as total_used
      FROM email_accounts
    `);

    res.json({
      ...emailStats.rows[0],
      last_sync_at: config.last_sync_at,
      last_sync_status: config.last_sync_status,
      last_sync_count: config.last_sync_count,
      last_sync_message: config.last_sync_message
    });
  } catch (error) {
    console.error('Error getting hosting stats:', error);
    res.status(500).json({ error: 'حدث خطأ' });
  }
};
