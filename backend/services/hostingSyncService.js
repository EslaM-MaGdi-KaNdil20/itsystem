const pool = require('../config/database');
const nodemailer = require('nodemailer');
const https = require('https');
const http = require('http');

let syncInterval = null;
let isRunning = false;

// ───────────── cPanel UAPI helper ─────────────
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

    const req = protocol.request(options, (res) => {
      let data = '';
      res.on('data', chunk => (data += chunk));
      res.on('end', () => {
        if (res.statusCode !== 200) {
          return reject(new Error(`HTTP ${res.statusCode}`));
        }
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(new Error('Invalid JSON response')); }
      });
    });

    req.on('error', reject);
    req.setTimeout(30000, () => { req.destroy(); reject(new Error('Timeout')); });
    req.end();
  });
}

// ───────────── Auto Sync Function ─────────────
async function autoSyncEmails() {
  if (isRunning) {
    console.log('⏳ cPanel auto-sync already running, skipping...');
    return;
  }

  isRunning = true;
  console.log(`\n🔄 [${new Date().toLocaleTimeString('ar-EG')}] بدء المزامنة التلقائية لحسابات البريد...`);

  try {
    const configResult = await pool.query('SELECT * FROM hosting_config WHERE id = 1');
    if (configResult.rows.length === 0) return;

    const config = configResult.rows[0];
    if (!config.server_url || !config.api_token || !config.domain) return;
    if (!config.auto_sync_enabled) return;

    const cpanelUser = config.cpanel_user || config.username;
    const domain = config.domain;

    // Fetch email accounts from cPanel
    const response = await callCpanelApi(config, `/execute/Email/list_pops_with_disk?domain=${encodeURIComponent(domain)}`);

    let emailAccounts = [];
    if (response && response.status === 1 && response.data) {
      emailAccounts = response.data;
    } else {
      throw new Error(response?.errors?.join(', ') || 'Bad cPanel response');
    }

    // Get existing employees
    const employeesResult = await pool.query(`
      SELECT e.id, e.full_name, e.email, e.employee_code,
             a.sam_account_name as ad_username
      FROM employees e
      LEFT JOIN ad_users a ON e.ad_guid = a.ad_guid OR e.employee_code = a.sam_account_name
    `);
    const employees = employeesResult.rows;

    let newCount = 0, updatedCount = 0, errorCount = 0;
    const errors = [];
    const nearFullAccounts = []; // Accounts nearing quota

    for (const email of emailAccounts) {
      try {
        const login = email.login || email.email || '';
        if (login === cpanelUser || login === `${cpanelUser}@${domain}`) continue;

        const emailAddress = email.email || `${email.login || email.user}@${domain}`;

        // Parse quota
        let quotaMb = null;
        if (email._diskquota && email._diskquota !== 'unlimited' && email._diskquota !== '0' && email._diskquota !== 0) {
          const q = parseFloat(email._diskquota);
          quotaMb = q > 10000 ? Math.round(q / 1024 / 1024) : Math.round(q);
        } else if (email.diskquota && email.diskquota !== 'unlimited' && email.diskquota !== '0' && email.diskquota !== 0) {
          const q = parseFloat(email.diskquota);
          quotaMb = q > 10000 ? Math.round(q / 1024 / 1024) : Math.round(q);
        }

        // Parse disk used
        let diskUsedMb = 0;
        if (email.diskused !== undefined) {
          const used = parseFloat(email.diskused);
          diskUsedMb = isNaN(used) ? 0 : Math.round(used * 100) / 100;
        } else if (email.humandiskused) {
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

        // Check if near full
        const thresholdPercent = config.alert_threshold_percent || 85;
        if (quotaMb && quotaMb > 0 && diskUsedMb > 0) {
          const usagePercent = (diskUsedMb / quotaMb) * 100;
          if (usagePercent >= thresholdPercent) {
            nearFullAccounts.push({
              email: emailAddress,
              quotaMb,
              diskUsedMb: Math.round(diskUsedMb * 100) / 100,
              usagePercent: Math.round(usagePercent * 10) / 10
            });
          }
        }

        // Auto-link employee (smart matching with fuzzy + AD)
        let employeeId = null;
        const emailUser = emailAddress.split('@')[0].toLowerCase().replace(/[._-]/g, ' ').trim();
        const emailParts = emailUser.split(/\s+/).filter(p => p.length > 1);
        let bestScore = 0;

        // Helper: fuzzy compare two strings
        function fuzzyMatch(a, b) {
          if (!a || !b) return false;
          const al = a.toLowerCase(), bl = b.toLowerCase();
          if (al === bl) return true;
          const lenRatio = Math.min(al.length, bl.length) / Math.max(al.length, bl.length);
          if (lenRatio >= 0.7 && (al.includes(bl) || bl.includes(al))) return true;
          // Levenshtein distance
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

        // Upsert
        const existing = await pool.query(
          'SELECT id, employee_id FROM email_accounts WHERE email_address = $1',
          [emailAddress]
        );

        if (existing.rows.length > 0) {
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
      } catch (err) {
        errorCount++;
        errors.push({ email: email.user || email.email, error: err.message });
      }
    }

    const totalSynced = newCount + updatedCount;
    const message = `مزامنة تلقائية: ${totalSynced} حساب (${newCount} جديد، ${updatedCount} محدث${errorCount > 0 ? `، ${errorCount} أخطاء` : ''})`;

    // Update config
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
      VALUES ('auto_sync', $1, $2, $3, $4, $5, $6, $7)
    `, [
      emailAccounts.length, newCount, updatedCount, errorCount,
      errorCount === 0 ? 'success' : 'partial',
      message,
      JSON.stringify({ domain, errors, auto: true })
    ]);

    console.log(`   ✅ ${message}`);

    // ── Check for near-full accounts and send alerts ──
    if (nearFullAccounts.length > 0 && config.alert_enabled !== false) {
      await handleDiskAlerts(config, nearFullAccounts);
    }

  } catch (error) {
    console.error(`   ❌ خطأ في المزامنة التلقائية:`, error.message);

    try {
      await pool.query(`
        UPDATE hosting_config SET
          last_sync_at = NOW(),
          last_sync_status = 'error',
          last_sync_message = $1,
          updated_at = NOW()
        WHERE id = 1
      `, [`خطأ مزامنة تلقائية: ${error.message}`]);
    } catch (logErr) { /* ignore */ }
  } finally {
    isRunning = false;
  }
}

// ───────────── Disk Space Alerts ─────────────
async function handleDiskAlerts(config, nearFullAccounts) {
  try {
    const threshold = config.alert_threshold_percent || 85;
    console.log(`   ⚠️ ${nearFullAccounts.length} حساب/حسابات بريد تتجاوز ${threshold}% من المساحة`);

    // 1. Create in-system notifications (avoid duplicates within 4 hours)
    for (const account of nearFullAccounts) {
      const existing = await pool.query(`
        SELECT 1 FROM notifications
        WHERE type = 'email_quota'
          AND ref_id IS NOT NULL
          AND message LIKE $1
          AND created_at >= NOW() - INTERVAL '4 hours'
      `, [`%${account.email}%`]);

      if (!existing.rows.length) {
        const urgency = account.usagePercent >= 95 ? '🔴' : account.usagePercent >= 90 ? '🟠' : '🟡';
        const emailAccResult = await pool.query(
          'SELECT id FROM email_accounts WHERE email_address = $1',
          [account.email]
        );
        const refId = emailAccResult.rows[0]?.id || null;

        await pool.query(`
          INSERT INTO notifications (type, title, message, link, ref_id)
          VALUES ($1, $2, $3, $4, $5)
        `, [
          'email_quota',
          `${urgency} مساحة بريد ${account.email.split('@')[0]} قاربت على الامتلاء`,
          `البريد ${account.email} يستخدم ${account.usagePercent}% من المساحة (${account.diskUsedMb} MB من ${account.quotaMb} MB) — يرجى تنظيف أو زيادة المساحة`,
          '/email-accounts',
          refId
        ]);
        console.log(`   🔔 إشعار: ${account.email} (${account.usagePercent}%)`);
      }
    }

    // 2. Send email alert (once every 6 hours max)
    const alertEmail = config.alert_email || process.env.EMAIL_RECIPIENT;
    if (!alertEmail) return;

    // Check if we sent an alert in the last 6 hours
    const recentAlert = await pool.query(`
      SELECT 1 FROM hosting_sync_logs
      WHERE sync_type = 'disk_alert'
        AND created_at >= NOW() - INTERVAL '6 hours'
    `);

    if (recentAlert.rows.length > 0) {
      console.log('   📧 تم إرسال تنبيه مسبقاً خلال آخر 6 ساعات، تخطي...');
      return;
    }

    // Build and send email
    await sendDiskAlertEmail(alertEmail, nearFullAccounts, config);

    // Log that we sent an alert
    await pool.query(`
      INSERT INTO hosting_sync_logs (sync_type, status, message, details)
      VALUES ('disk_alert', 'sent', $1, $2)
    `, [
      `تم إرسال تنبيه لـ ${nearFullAccounts.length} حساب بريد`,
      JSON.stringify({ accounts: nearFullAccounts, sentTo: alertEmail })
    ]);

  } catch (err) {
    console.error('   ❌ خطأ في إرسال التنبيهات:', err.message);
  }
}

// ───────────── Send Disk Alert Email ─────────────
async function sendDiskAlertEmail(to, accounts, config) {
  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.EMAIL_PORT) || 587,
    secure: parseInt(process.env.EMAIL_PORT) === 465,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD,
    },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 10000,
  });

  const criticalCount = accounts.filter(a => a.usagePercent >= 95).length;
  const warningCount = accounts.filter(a => a.usagePercent >= 90 && a.usagePercent < 95).length;

  const accountRows = accounts
    .sort((a, b) => b.usagePercent - a.usagePercent)
    .map(a => {
      const color = a.usagePercent >= 95 ? '#dc3545' : a.usagePercent >= 90 ? '#fd7e14' : '#ffc107';
      const icon = a.usagePercent >= 95 ? '🔴' : a.usagePercent >= 90 ? '🟠' : '🟡';
      return `
        <tr>
          <td style="padding:10px; border-bottom:1px solid #eee;">${icon} ${a.email}</td>
          <td style="padding:10px; border-bottom:1px solid #eee; text-align:center;">
            <span style="color:${color}; font-weight:bold;">${a.usagePercent}%</span>
          </td>
          <td style="padding:10px; border-bottom:1px solid #eee; text-align:center;">${a.diskUsedMb} MB</td>
          <td style="padding:10px; border-bottom:1px solid #eee; text-align:center;">${a.quotaMb} MB</td>
        </tr>`;
    }).join('');

  const mailOptions = {
    from: `"IT System - تنبيه المساحة" <${process.env.EMAIL_USER}>`,
    to,
    subject: `⚠️ تنبيه: ${accounts.length} حساب/حسابات بريد قاربت مساحتها على الامتلاء`,
    html: `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head><meta charset="UTF-8"></head>
      <body style="font-family:'Segoe UI',Tahoma,sans-serif; background:#f4f4f4; padding:20px; direction:rtl;">
        <div style="max-width:700px; margin:0 auto; background:white; border-radius:10px; overflow:hidden; box-shadow:0 2px 10px rgba(0,0,0,0.1);">
          <div style="background:linear-gradient(135deg,#e74c3c 0%,#c0392b 100%); color:white; padding:25px; text-align:center;">
            <h1 style="margin:0; font-size:22px;">📧 تنبيه مساحة حسابات البريد</h1>
            <p style="margin:8px 0 0; opacity:0.9;">النطاق: ${config.domain}</p>
          </div>
          
          <div style="padding:25px;">
            <div style="background:#fff3cd; border-right:4px solid #ffc107; padding:15px; border-radius:5px; margin-bottom:20px;">
              <p style="margin:0; color:#856404;">
                ⚠️ يوجد <strong>${accounts.length}</strong> حساب بريد تتجاوز مساحته ${config.alert_threshold_percent || 85}% من الحد المسموح
                ${criticalCount > 0 ? `<br>🔴 <strong>${criticalCount}</strong> حساب في حالة حرجة (أكثر من 95%)` : ''}
                ${warningCount > 0 ? `<br>🟠 <strong>${warningCount}</strong> حساب في حالة تحذير (أكثر من 90%)` : ''}
              </p>
            </div>

            <table style="width:100%; border-collapse:collapse; margin-top:15px;">
              <thead>
                <tr style="background:#f8f9fa;">
                  <th style="padding:12px; text-align:right; border-bottom:2px solid #dee2e6;">البريد الإلكتروني</th>
                  <th style="padding:12px; text-align:center; border-bottom:2px solid #dee2e6;">النسبة</th>
                  <th style="padding:12px; text-align:center; border-bottom:2px solid #dee2e6;">المستخدم</th>
                  <th style="padding:12px; text-align:center; border-bottom:2px solid #dee2e6;">الحد</th>
                </tr>
              </thead>
              <tbody>
                ${accountRows}
              </tbody>
            </table>

            <div style="margin-top:25px; padding:15px; background:#e7f3ff; border-radius:5px; text-align:center;">
              <p style="margin:0; color:#004085;">
                💡 يرجى تنظيف الحسابات أو زيادة المساحة المخصصة لها من لوحة تحكم cPanel
              </p>
            </div>
          </div>

          <div style="background:#f8f9fa; padding:15px; text-align:center; color:#666; font-size:13px;">
            <p style="margin:0;">رسالة تلقائية من نظام إدارة تكنولوجيا المعلومات</p>
            <p style="margin:5px 0 0;">${new Date().toLocaleString('ar-EG')}</p>
          </div>
        </div>
      </body>
      </html>
    `,
  };

  const info = await transporter.sendMail(mailOptions);
  console.log(`   📧 تم إرسال تنبيه مساحة البريد إلى ${to} — ID: ${info.messageId}`);
}

// ───────────── Start Auto Sync ─────────────
async function startHostingAutoSync() {
  try {
    const configResult = await pool.query('SELECT auto_sync_enabled, sync_interval_minutes FROM hosting_config WHERE id = 1');
    
    if (configResult.rows.length === 0) {
      console.log('📧 لم يتم تكوين إعدادات الاستضافة بعد - تخطي المزامنة التلقائية');
      return;
    }

    const config = configResult.rows[0];
    
    if (!config.auto_sync_enabled) {
      console.log('📧 المزامنة التلقائية لحسابات البريد معطلة');
      return;
    }

    const intervalMinutes = config.sync_interval_minutes || 4;
    const intervalMs = intervalMinutes * 60 * 1000;

    // Clear any existing interval
    if (syncInterval) {
      clearInterval(syncInterval);
    }

    // Run immediately on startup
    setTimeout(async () => {
      await autoSyncEmails();
    }, 10000); // Wait 10 seconds after server start

    // Then run on interval
    syncInterval = setInterval(autoSyncEmails, intervalMs);

    console.log(`📧 المزامنة التلقائية لحسابات البريد: تعمل كل ${intervalMinutes} دقيقة`);
  } catch (err) {
    console.error('❌ خطأ في بدء المزامنة التلقائية:', err.message);
  }
}

// ───────────── Restart Auto Sync (called when config changes) ─────────────
async function restartHostingAutoSync() {
  if (syncInterval) {
    clearInterval(syncInterval);
    syncInterval = null;
  }
  await startHostingAutoSync();
}

module.exports = {
  startHostingAutoSync,
  restartHostingAutoSync,
  autoSyncEmails
};
