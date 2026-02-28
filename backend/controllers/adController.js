const ldap = require('ldapjs');
const pool = require('../config/database');
const bcrypt = require('bcrypt');

// ─── Helper: create LDAP client ───
function createClient(config) {
  const url = config.use_ssl
    ? `ldaps://${config.server_url.replace(/^ldaps?:\/\//, '')}:${config.port || 636}`
    : `ldap://${config.server_url.replace(/^ldaps?:\/\//, '')}:${config.port || 389}`;

  const client = ldap.createClient({
    url,
    reconnect: false,
    connectTimeout: 10000,
    tlsOptions: { rejectUnauthorized: false }
  });

  return client;
}

// ─── Helper: bind to AD ───
function bindClient(client, dn, password) {
  return new Promise((resolve, reject) => {
    client.bind(dn, password, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

// ─── Helper: search AD ───
function searchAD(client, baseDN, filter, attributes) {
  return new Promise((resolve, reject) => {
    const results = [];
    const opts = {
      filter,
      scope: 'sub',
      attributes: attributes || [
        'objectGUID', 'sAMAccountName', 'userPrincipalName',
        'displayName', 'givenName', 'sn', 'mail', 'telephoneNumber',
        'mobile', 'title', 'department', 'company', 'physicalDeliveryOfficeName',
        'manager', 'distinguishedName', 'memberOf', 'userAccountControl',
        'whenCreated', 'whenChanged', 'lastLogon'
      ],
      paged: { pageSize: 500 }
    };

    client.search(baseDN, opts, (err, res) => {
      if (err) return reject(err);

      res.on('searchEntry', (entry) => {
        const obj = {};
        if (entry.pojo && entry.pojo.attributes) {
          entry.pojo.attributes.forEach(attr => {
            if (attr.values && attr.values.length === 1) {
              obj[attr.type] = attr.values[0];
            } else if (attr.values && attr.values.length > 1) {
              obj[attr.type] = attr.values;
            }
          });
        }
        results.push(obj);
      });

      res.on('error', (err) => {
        // Size limit exceeded is okay — we got partial results
        if (err.name === 'SizeLimitExceededError') resolve(results);
        else reject(err);
      });

      res.on('end', () => resolve(results));
    });
  });
}

// ─── Helper: parse objectGUID buffer to string ───
function parseGUID(raw) {
  if (!raw) return null;
  
  // Helper: convert 16-byte hex to GUID string format
  function hexToGUID(hex) {
    if (hex.length !== 32) return null;
    return [
      hex.substring(6, 8) + hex.substring(4, 6) + hex.substring(2, 4) + hex.substring(0, 2),
      hex.substring(10, 12) + hex.substring(8, 10),
      hex.substring(14, 16) + hex.substring(12, 14),
      hex.substring(16, 20),
      hex.substring(20, 32)
    ].join('-').toLowerCase();
  }

  // Handle Buffer objects directly
  if (Buffer.isBuffer(raw)) {
    if (raw.length === 16) {
      return hexToGUID(raw.toString('hex'));
    }
    return raw.toString('hex');
  }

  if (typeof raw === 'string') {
    // Already looks like a formatted GUID (xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(raw)) {
      return raw.toLowerCase();
    }

    // Convert string to a raw byte buffer for consistent processing
    // This handles binary strings, UTF-8 replacement chars, etc.
    let buf;
    
    // Try base64 first (short strings)
    if (raw.length <= 24 && raw.length > 0) {
      try {
        const b64buf = Buffer.from(raw, 'base64');
        if (b64buf.length === 16) {
          buf = b64buf;
        }
      } catch (e) { /* fall through */ }
    }

    // If not base64, convert character codes to bytes
    if (!buf) {
      const bytes = [];
      for (let i = 0; i < raw.length; i++) {
        const code = raw.charCodeAt(i);
        if (code <= 0xFF) {
          bytes.push(code);
        } else {
          // Multi-byte char (e.g. UTF-8 replacement \uFFFD) — not a clean binary string
          // Fall through to use raw string as-is
          break;
        }
      }
      if (bytes.length === 16) {
        buf = Buffer.from(bytes);
      }
    }

    if (buf && buf.length === 16) {
      return hexToGUID(buf.toString('hex'));
    }
    
    // Return raw string as fallback (already a text GUID or unknown format)
    return raw;
  }
  return String(raw);
}

// ─── Helper: check if AD account is enabled ───
function isAccountEnabled(uac) {
  if (!uac) return true;
  const value = parseInt(uac, 10);
  return !(value & 0x0002); // ACCOUNTDISABLE flag
}

// ─── Helper: parse AD date ───
function parseADDate(val) {
  if (!val) return null;
  // AD dates can be "yyyyMMddHHmmss.0Z" format
  if (typeof val === 'string' && val.includes('.0Z')) {
    const y = val.substring(0, 4);
    const m = val.substring(4, 6);
    const d = val.substring(6, 8);
    const h = val.substring(8, 10);
    const min = val.substring(10, 12);
    const s = val.substring(12, 14);
    return new Date(`${y}-${m}-${d}T${h}:${min}:${s}Z`);
  }
  // Windows FILETIME (100ns intervals since 1601-01-01)
  const num = parseInt(val, 10);
  if (num > 100000000000000) {
    const ms = (num / 10000) - 11644473600000;
    return new Date(ms);
  }
  return null;
}

// ═══════════════════════════════════════════════
// CONTROLLER METHODS
// ═══════════════════════════════════════════════

// ─── Get AD Config ───
const getConfig = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM ad_config WHERE id = 1');
    if (result.rows.length === 0) {
      return res.json({ configured: false, config: null });
    }
    const config = result.rows[0];
    // Don't send password to frontend
    config.bind_password = config.bind_password ? '********' : '';
    res.json({ configured: true, config });
  } catch (error) {
    console.error('AD getConfig error:', error);
    res.status(500).json({ error: 'خطأ في جلب إعدادات Active Directory' });
  }
};

// ─── Save AD Config ───
const saveConfig = async (req, res) => {
  try {
    const {
      domain_name, server_url, base_dn, bind_dn, bind_password,
      search_filter, use_ssl, port, sync_interval_minutes,
      auto_sync_enabled, auto_create_users, default_role,
      sync_employees
    } = req.body;

    if (!domain_name || !server_url || !base_dn || !bind_dn) {
      return res.status(400).json({ error: 'جميع الحقول الأساسية مطلوبة' });
    }

    const existing = await pool.query('SELECT id, bind_password FROM ad_config WHERE id = 1');
    const actualPassword = (bind_password && bind_password !== '********')
      ? bind_password
      : (existing.rows.length > 0 ? existing.rows[0].bind_password : '');

    if (existing.rows.length === 0) {
      await pool.query(`
        INSERT INTO ad_config (id, domain_name, server_url, base_dn, bind_dn, bind_password,
          search_filter, use_ssl, port, sync_interval_minutes, auto_sync_enabled,
          auto_create_users, default_role, sync_employees)
        VALUES (1, $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      `, [domain_name, server_url, base_dn, bind_dn, actualPassword,
          search_filter || '(&(objectClass=user)(objectCategory=person))',
          use_ssl || false, port || 389, sync_interval_minutes || 60,
          auto_sync_enabled || false, auto_create_users || false,
          default_role || 'user', sync_employees !== false]);
    } else {
      await pool.query(`
        UPDATE ad_config SET
          domain_name = $1, server_url = $2, base_dn = $3, bind_dn = $4,
          bind_password = $5, search_filter = $6, use_ssl = $7, port = $8,
          sync_interval_minutes = $9, auto_sync_enabled = $10,
          auto_create_users = $11, default_role = $12, sync_employees = $13,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = 1
      `, [domain_name, server_url, base_dn, bind_dn, actualPassword,
          search_filter, use_ssl, port, sync_interval_minutes,
          auto_sync_enabled, auto_create_users, default_role, sync_employees]);
    }

    res.json({ success: true, message: 'تم حفظ إعدادات Active Directory بنجاح' });
  } catch (error) {
    console.error('AD saveConfig error:', error);
    res.status(500).json({ error: 'خطأ في حفظ الإعدادات' });
  }
};

// ─── Test AD Connection ───
const testConnection = async (req, res) => {
  let client;
  try {
    const config = req.body.server_url ? req.body : (await pool.query('SELECT * FROM ad_config WHERE id = 1')).rows[0];
    if (!config) return res.status(400).json({ error: 'لا توجد إعدادات Active Directory' });

    // Use actual password if testing with saved config
    if (config.bind_password === '********') {
      const saved = await pool.query('SELECT bind_password FROM ad_config WHERE id = 1');
      if (saved.rows.length > 0) config.bind_password = saved.rows[0].bind_password;
    }

    const url = config.use_ssl
      ? `ldaps://${config.server_url.replace(/^ldaps?:\/\//, '')}:${config.port || 636}`
      : `ldap://${config.server_url.replace(/^ldaps?:\/\//, '')}:${config.port || 389}`;

    console.log('━━━ AD Test Connection Debug ━━━');
    console.log('  URL:', url);
    console.log('  Bind DN:', config.bind_dn);
    console.log('  Base DN:', config.base_dn);
    console.log('  SSL:', config.use_ssl);
    console.log('  Port:', config.port);
    console.log('  Password length:', config.bind_password?.length || 0);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    client = createClient(config);

    await bindClient(client, config.bind_dn, config.bind_password);

    // Try a simple search to confirm access
    const results = await searchAD(client, config.base_dn,
      '(&(objectClass=user)(objectCategory=person))',
      ['sAMAccountName', 'displayName']);

    client.unbind();

    res.json({
      success: true,
      message: `✅ تم الاتصال بنجاح - تم العثور على ${results.length} مستخدم`,
      userCount: results.length
    });
  } catch (error) {
    if (client) try { client.unbind(); } catch (e) { /* ignore */ }
    console.error('AD testConnection error:', error.message);
    console.error('AD error code:', error.code);
    console.error('AD full error name:', error.name);

    let msg = 'فشل الاتصال: ';
    if (error.message?.includes('ECONNREFUSED')) msg += 'لا يمكن الوصول للسيرفر - تأكد من عنوان IP والبورت';
    else if (error.message?.includes('InvalidCredentials') || error.message?.includes('Invalid Credentials') || error.code === 49) msg += 'اسم المستخدم أو كلمة المرور غير صحيحة';
    else if (error.message?.includes('ETIMEDOUT')) msg += 'انتهت مهلة الاتصال - تأكد من عنوان السيرفر';
    else if (error.message?.includes('ENOTFOUND')) msg += 'اسم السيرفر غير صحيح';
    else msg += error.message;

    res.status(400).json({ success: false, error: msg });
  }
};

// ─── Fetch AD Users (preview, no save) ───
const fetchADUsers = async (req, res) => {
  let client;
  try {
    const config = (await pool.query('SELECT * FROM ad_config WHERE id = 1')).rows[0];
    if (!config) return res.status(400).json({ error: 'لا توجد إعدادات Active Directory' });

    client = createClient(config);
    await bindClient(client, config.bind_dn, config.bind_password);

    const filter = config.search_filter || '(&(objectClass=user)(objectCategory=person))';
    const rawUsers = await searchAD(client, config.base_dn, filter);
    client.unbind();

    const users = rawUsers.map(u => ({
      ad_guid: parseGUID(u.objectGUID),
      sam_account_name: u.sAMAccountName || '',
      user_principal_name: u.userPrincipalName || '',
      display_name: u.displayName || '',
      first_name: u.givenName || '',
      last_name: u.sn || '',
      email: u.mail || '',
      phone: u.telephoneNumber || '',
      mobile: u.mobile || '',
      title: u.title || '',
      department: u.department || '',
      company: u.company || '',
      office: u.physicalDeliveryOfficeName || '',
      manager_dn: u.manager || '',
      distinguished_name: u.distinguishedName || '',
      member_of: Array.isArray(u.memberOf) ? u.memberOf.join('; ') : (u.memberOf || ''),
      is_enabled: isAccountEnabled(u.userAccountControl),
      when_created: parseADDate(u.whenCreated),
      when_changed: parseADDate(u.whenChanged),
      last_logon: parseADDate(u.lastLogon)
    })).filter(u => u.sam_account_name && !u.sam_account_name.endsWith('$'));

    res.json({ success: true, users, total: users.length });
  } catch (error) {
    if (client) try { client.unbind(); } catch (e) { /* ignore */ }
    console.error('AD fetchUsers error:', error);
    res.status(500).json({ error: 'خطأ في جلب المستخدمين من Active Directory: ' + error.message });
  }
};

// ─── Sync AD Users to local cache ───
const syncADUsers = async (req, res) => {
  const startTime = Date.now();
  let client;
  try {
    const config = (await pool.query('SELECT * FROM ad_config WHERE id = 1')).rows[0];
    if (!config) return res.status(400).json({ error: 'لا توجد إعدادات Active Directory' });

    client = createClient(config);
    await bindClient(client, config.bind_dn, config.bind_password);

    const filter = config.search_filter || '(&(objectClass=user)(objectCategory=person))';
    const rawUsers = await searchAD(client, config.base_dn, filter);
    client.unbind();

    let newImported = 0, updated = 0, errors = 0;
    const errorDetails = [];

    for (const u of rawUsers) {
      try {
        const guid = parseGUID(u.objectGUID);
        const sam = u.sAMAccountName || '';
        if (!sam || sam.endsWith('$')) continue; // skip computer accounts

        const displayName = u.displayName || '';
        const email = u.mail || '';
        const phone = u.telephoneNumber || '';
        const mobile = u.mobile || '';
        const title = u.title || '';
        const department = u.department || '';
        const company = u.company || '';
        const office = u.physicalDeliveryOfficeName || '';
        const managerDn = u.manager || '';
        const dn = u.distinguishedName || '';
        const memberOf = Array.isArray(u.memberOf) ? u.memberOf.join('; ') : (u.memberOf || '');
        const isEnabled = isAccountEnabled(u.userAccountControl);
        const whenCreated = parseADDate(u.whenCreated);
        const whenChanged = parseADDate(u.whenChanged);
        const lastLogon = parseADDate(u.lastLogon);

        // Check by ad_guid first, then fallback to sam_account_name to prevent duplicates
        let existing = await pool.query('SELECT id, ad_guid FROM ad_users WHERE ad_guid = $1', [guid]);
        if (existing.rows.length === 0 && sam) {
          existing = await pool.query('SELECT id, ad_guid FROM ad_users WHERE sam_account_name = $1', [sam]);
        }

        if (existing.rows.length > 0) {
          // Update existing record — also fix the ad_guid to the latest consistent value
          await pool.query(`
            UPDATE ad_users SET
              ad_guid = $21,
              sam_account_name = $1, user_principal_name = $2, display_name = $3,
              first_name = $4, last_name = $5, email = $6, phone = $7, mobile = $8,
              title = $9, department = $10, company = $11, office = $12,
              manager_dn = $13, distinguished_name = $14, member_of = $15,
              is_enabled = $16, when_created = $17, when_changed = $18,
              last_logon = $19, last_sync_at = CURRENT_TIMESTAMP,
              updated_at = CURRENT_TIMESTAMP
            WHERE id = $20
          `, [sam, u.userPrincipalName || '', displayName,
              u.givenName || '', u.sn || '', email, phone, mobile,
              title, department, company, office,
              managerDn, dn, memberOf, isEnabled,
              whenCreated, whenChanged, lastLogon, existing.rows[0].id, guid]);
          updated++;
        } else {
          await pool.query(`
            INSERT INTO ad_users (ad_guid, sam_account_name, user_principal_name,
              display_name, first_name, last_name, email, phone, mobile,
              title, department, company, office, manager_dn,
              distinguished_name, member_of, is_enabled,
              when_created, when_changed, last_logon)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)
          `, [guid, sam, u.userPrincipalName || '', displayName,
              u.givenName || '', u.sn || '', email, phone, mobile,
              title, department, company, office, managerDn,
              dn, memberOf, isEnabled,
              whenCreated, whenChanged, lastLogon]);
          newImported++;
        }
      } catch (e) {
        errors++;
        errorDetails.push(`${u.sAMAccountName}: ${e.message}`);
      }
    }

    const duration = Date.now() - startTime;

    // Log the sync
    await pool.query(`
      INSERT INTO ad_sync_logs (sync_type, status, total_found, new_imported, updated, errors, error_details, duration_ms, triggered_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `, ['manual', errors > 0 ? 'partial' : 'success', rawUsers.length,
        newImported, updated, errors,
        errorDetails.length > 0 ? errorDetails.join('\n') : null,
        duration, req.user?.full_name || 'System']);

    // Update config last sync info
    await pool.query(`
      UPDATE ad_config SET
        last_sync_at = CURRENT_TIMESTAMP,
        last_sync_status = $1,
        last_sync_message = $2,
        last_sync_count = $3
      WHERE id = 1
    `, [errors > 0 ? 'partial' : 'success',
        `جديد: ${newImported}, محدث: ${updated}, أخطاء: ${errors}`,
        rawUsers.length]);

    res.json({
      success: true,
      message: `تم المزامنة بنجاح`,
      stats: {
        total: rawUsers.length,
        new: newImported,
        updated,
        errors,
        duration: `${(duration / 1000).toFixed(1)}s`
      }
    });
  } catch (error) {
    if (client) try { client.unbind(); } catch (e) { /* ignore */ }
    console.error('AD syncUsers error:', error);
    res.status(500).json({ error: 'خطأ في المزامنة: ' + error.message });
  }
};

// ─── Get cached AD users from local DB ───
const getADUsers = async (req, res) => {
  try {
    const { search, department, synced, enabled } = req.query;
    let query = `
      SELECT au.*,
        u.full_name as local_user_name,
        u.email as local_user_email,
        e.full_name as local_employee_name
      FROM ad_users au
      LEFT JOIN users u ON au.local_user_id = u.id
      LEFT JOIN employees e ON au.local_employee_id = e.id
      WHERE 1=1
    `;
    const params = [];

    if (search) {
      params.push(`%${search}%`);
      query += ` AND (au.display_name ILIKE $${params.length} OR au.sam_account_name ILIKE $${params.length} OR au.email ILIKE $${params.length})`;
    }
    if (department) {
      params.push(department);
      query += ` AND au.department = $${params.length}`;
    }
    if (synced === 'true') query += ` AND (au.is_synced_user = true OR au.is_synced_employee = true)`;
    if (synced === 'false') query += ` AND au.is_synced_user = false AND au.is_synced_employee = false`;
    if (enabled === 'true') query += ` AND au.is_enabled = true`;
    if (enabled === 'false') query += ` AND au.is_enabled = false`;

    query += ' ORDER BY au.display_name ASC';

    const result = await pool.query(query, params);

    // Get unique departments for filter
    const depts = await pool.query('SELECT DISTINCT department FROM ad_users WHERE department IS NOT NULL AND department != \'\' ORDER BY department');

    res.json({
      users: result.rows,
      total: result.rows.length,
      departments: depts.rows.map(d => d.department)
    });
  } catch (error) {
    console.error('AD getADUsers error:', error);
    res.status(500).json({ error: 'خطأ في جلب المستخدمين' });
  }
};

// ─── Create local user from AD user ───
const createUserFromAD = async (req, res) => {
  try {
    const { ad_user_id, role, password } = req.body;

    const adUser = (await pool.query('SELECT * FROM ad_users WHERE id = $1', [ad_user_id])).rows[0];
    if (!adUser) return res.status(404).json({ error: 'مستخدم AD غير موجود' });

    // Check if user already exists
    if (adUser.email) {
      const existing = await pool.query('SELECT id FROM users WHERE email = $1', [adUser.email]);
      if (existing.rows.length > 0) {
        // Link existing user
        await pool.query('UPDATE users SET ad_guid = $1, is_ad_user = true, ad_username = $2 WHERE id = $3',
          [adUser.ad_guid, adUser.sam_account_name, existing.rows[0].id]);
        await pool.query('UPDATE ad_users SET local_user_id = $1, is_synced_user = true WHERE id = $2',
          [existing.rows[0].id, ad_user_id]);
        return res.json({ success: true, message: 'تم ربط المستخدم الموجود بـ AD', userId: existing.rows[0].id });
      }
    }

    // Create new user
    const hashedPassword = await bcrypt.hash(password || 'ADUser@2026', 10);
    const email = adUser.email || `${adUser.sam_account_name}@${(await pool.query('SELECT domain_name FROM ad_config WHERE id = 1')).rows[0]?.domain_name || 'local'}`;

    const newUser = await pool.query(`
      INSERT INTO users (email, password, full_name, role, ad_guid, is_ad_user, ad_username, phone)
      VALUES ($1, $2, $3, $4, $5, true, $6, $7)
      RETURNING id
    `, [email, hashedPassword, adUser.display_name || adUser.sam_account_name,
        role || 'user', adUser.ad_guid, adUser.sam_account_name, adUser.phone || adUser.mobile]);

    await pool.query('UPDATE ad_users SET local_user_id = $1, is_synced_user = true WHERE id = $2',
      [newUser.rows[0].id, ad_user_id]);

    res.json({ success: true, message: 'تم إنشاء المستخدم بنجاح', userId: newUser.rows[0].id });
  } catch (error) {
    console.error('AD createUser error:', error);
    res.status(500).json({ error: 'خطأ في إنشاء المستخدم: ' + error.message });
  }
};

// ─── Helper: find department ID from AD user data (department field + OU path + memberOf groups) ───
async function findDeptFromADUser(adUser, overrideDeptId = null) {
  if (overrideDeptId) return overrideDeptId;

  // 1) Match by AD department field directly against departments table
  if (adUser.department) {
    const dept = await pool.query(
      `SELECT id FROM departments WHERE name ILIKE $1 OR ad_ou ILIKE $1 LIMIT 1`,
      [adUser.department]
    );
    if (dept.rows.length > 0) return dept.rows[0].id;

    // 2) Match by department field against ad_groups_ous cache
    const ouMatch = await pool.query(
      `SELECT local_department_id FROM ad_groups_ous
       WHERE name ILIKE $1 AND local_department_id IS NOT NULL LIMIT 1`,
      [adUser.department]
    );
    if (ouMatch.rows.length > 0) return ouMatch.rows[0].local_department_id;
  }

  // 3) Extract OU parts from distinguishedName and match against synced OUs
  if (adUser.distinguished_name) {
    const ouParts = adUser.distinguished_name.split(',')
      .filter(p => p.trim().toUpperCase().startsWith('OU='))
      .map(p => p.trim().substring(3)); // remove 'OU='

    for (const ouName of ouParts) {
      // Check ad_groups_ous by name or dn fragment
      const ouDeptMatch = await pool.query(
        `SELECT local_department_id FROM ad_groups_ous
         WHERE (name ILIKE $1 OR display_name ILIKE $1)
         AND local_department_id IS NOT NULL LIMIT 1`,
        [ouName]
      );
      if (ouDeptMatch.rows.length > 0) return ouDeptMatch.rows[0].local_department_id;

      // Also check departments table directly
      const deptMatch = await pool.query(
        `SELECT id FROM departments WHERE name ILIKE $1 OR ad_ou ILIKE $1 LIMIT 1`,
        [ouName]
      );
      if (deptMatch.rows.length > 0) return deptMatch.rows[0].id;
    }
  }

  // 4) Check memberOf groups against ad_groups_ous
  if (adUser.member_of) {
    const groups = adUser.member_of.split(';').map(g => g.trim()).filter(Boolean);
    for (const groupDN of groups) {
      // Try full DN match
      const dnMatch = await pool.query(
        `SELECT local_department_id FROM ad_groups_ous
         WHERE distinguished_name ILIKE $1 AND local_department_id IS NOT NULL LIMIT 1`,
        [groupDN]
      );
      if (dnMatch.rows.length > 0) return dnMatch.rows[0].local_department_id;

      // Try CN= name match
      const cnReg = groupDN.match(/^CN=([^,]+)/i);
      if (cnReg) {
        const groupNameMatch = await pool.query(
          `SELECT local_department_id FROM ad_groups_ous
           WHERE name ILIKE $1 AND local_department_id IS NOT NULL LIMIT 1`,
          [cnReg[1]]
        );
        if (groupNameMatch.rows.length > 0) return groupNameMatch.rows[0].local_department_id;
      }
    }
  }

  return null;
}

// ─── Helper: Levenshtein distance ───
function levenshtein(a, b) {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  const matrix = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      const cost = a[j - 1] === b[i - 1] ? 0 : 1;
      matrix[i][j] = Math.min(matrix[i - 1][j] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j - 1] + cost);
    }
  }
  return matrix[b.length][a.length];
}

function fuzzyMatch(a, b) {
  if (!a || !b) return false;
  const al = a.toLowerCase(), bl = b.toLowerCase();
  if (al === bl) return true;
  // Only allow substring match when lengths are very similar (prevent "micro" matching "analystmicro")
  const lenRatio = Math.min(al.length, bl.length) / Math.max(al.length, bl.length);
  if (lenRatio >= 0.7 && (al.includes(bl) || bl.includes(al))) return true;
  const maxDist = Math.max(1, Math.floor(Math.min(al.length, bl.length) / 3));
  return levenshtein(al, bl) <= maxDist;
}

// ─── Helper: Find ZK fingerprint user matching AD user ───
async function findZKUser(adUser) {
  const displayName = (adUser.display_name || '').toLowerCase().trim();
  const sam = (adUser.sam_account_name || '').toLowerCase();
  if (!displayName && !sam) return null;

  // Get all unmapped ZK users with names
  const zkResult = await pool.query(
    "SELECT zk_user_id, zk_user_name FROM zk_employee_map WHERE employee_id IS NULL AND zk_user_name IS NOT NULL AND zk_user_name != ''"
  );

  let bestMatch = null;
  let bestScore = 0;

  for (const zk of zkResult.rows) {
    const zkName = (zk.zk_user_name || '').toLowerCase().trim();
    if (!zkName || zkName.length < 2) continue;

    // Method 1: Exact name match
    if (zkName === displayName) {
      return zk;
    }

    // Method 2: Fuzzy name part matching
    const adParts = displayName.split(/[\s._,-]+/).filter(p => p.length > 1);
    const zkParts = zkName.split(/[\s._,-]+/).filter(p => p.length > 1);
    if (adParts.length > 0 && zkParts.length > 0) {
      const matched = adParts.filter(ap => zkParts.some(zp => fuzzyMatch(ap, zp)));
      const reverse = zkParts.filter(zp => adParts.some(ap => fuzzyMatch(ap, zp)));
      if (matched.length >= Math.min(2, adParts.length) && reverse.length >= Math.min(2, zkParts.length)) {
        const score = (matched.length / adParts.length) + (reverse.length / zkParts.length);
        if (score > bestScore) {
          bestScore = score;
          bestMatch = zk;
        }
      }
    }

    // Method 3: sam_account_name parts vs ZK name parts
    if (sam) {
      const samParts = sam.replace(/[._-]/g, ' ').split(/\s+/).filter(p => p.length > 1);
      const zkParts2 = zkName.split(/[\s._,-]+/).filter(p => p.length > 1);
      if (samParts.length > 0 && zkParts2.length > 0) {
        const matched = samParts.filter(sp => zkParts2.some(zp => fuzzyMatch(sp, zp)));
        const reverse = zkParts2.filter(zp => samParts.some(sp => fuzzyMatch(sp, zp)));
        if (matched.length >= Math.min(2, samParts.length) && reverse.length >= Math.min(2, zkParts2.length)) {
          const score = (matched.length / samParts.length) + (reverse.length / zkParts2.length);
          if (score > bestScore) {
            bestScore = score;
            bestMatch = zk;
          }
        }
      }
    }
  }
  return bestScore >= 1.0 ? bestMatch : null;
}

// ─── Helper: Find cPanel email matching AD user ───
async function findCPanelEmail(adUser) {
  const sam = (adUser.sam_account_name || '').toLowerCase();
  const displayName = (adUser.display_name || '').toLowerCase().trim();
  if (!sam && !displayName) return null;

  // Get all unlinked personal-looking cPanel emails
  const emailResult = await pool.query(
    "SELECT id, email_address FROM email_accounts WHERE employee_id IS NULL AND source = 'cpanel'"
  );

  let bestMatch = null;
  let bestScore = 0;

  const samParts = sam.replace(/[._-]/g, ' ').split(/\s+/).filter(p => p.length > 1);
  const nameParts = displayName.split(/\s+/).filter(p => p.length > 1);

  for (const ea of emailResult.rows) {
    const emailUser = ea.email_address.split('@')[0].toLowerCase();
    const emailParts = emailUser.replace(/[._-]/g, ' ').split(/\s+/).filter(p => p.length > 1);
    if (emailParts.length === 0) continue;

    // Method 1: sam_account_name vs email username (fuzzy)
    if (samParts.length > 0) {
      const matched = samParts.filter(sp => emailParts.some(ep => fuzzyMatch(sp, ep)));
      const reverse = emailParts.filter(ep => samParts.some(sp => fuzzyMatch(sp, ep)));
      if (matched.length === samParts.length && reverse.length === emailParts.length) {
        const score = 95; // Almost exact match via AD username
        if (score > bestScore) { bestScore = score; bestMatch = ea; }
      }
    }

    // Method 2: display_name vs email username (fuzzy)
    if (nameParts.length > 0 && bestScore < 90) {
      const matched = nameParts.filter(np => emailParts.some(ep => fuzzyMatch(np, ep)));
      const reverse = emailParts.filter(ep => nameParts.some(np => fuzzyMatch(np, ep)));
      if (matched.length >= Math.min(2, nameParts.length) && reverse.length >= Math.min(2, emailParts.length)) {
        const score = 80 + (matched.length / nameParts.length) * 10;
        if (score > bestScore) { bestScore = score; bestMatch = ea; }
      }
    }
  }
  return bestScore >= 80 ? bestMatch : null;
}

// ─── Helper: Find existing employee that matches AD user ───
async function findExistingEmployee(adUser, autoEmail, autoZkId) {
  const sam = adUser.sam_account_name || '';
  const displayName = (adUser.display_name || '').trim();

  // Phase 1: Exact matches by GUID, email, employee_code
  const checks = [
    adUser.ad_guid ? pool.query('SELECT id, full_name, employee_code, email FROM employees WHERE ad_guid = $1 LIMIT 1', [adUser.ad_guid]) : Promise.resolve({ rows: [] }),
    autoEmail      ? pool.query('SELECT id, full_name, employee_code, email FROM employees WHERE email = $1 LIMIT 1', [autoEmail]) : Promise.resolve({ rows: [] }),
    sam            ? pool.query('SELECT id, full_name, employee_code, email FROM employees WHERE employee_code = $1 LIMIT 1', [sam]) : Promise.resolve({ rows: [] }),
    autoZkId       ? pool.query('SELECT id, full_name, employee_code, email FROM employees WHERE employee_code = $1 LIMIT 1', [String(autoZkId)]) : Promise.resolve({ rows: [] }),
  ];
  const [byGuid, byEmail, byCode, byZk] = await Promise.all(checks);
  const found = byGuid.rows[0] || byEmail.rows[0] || byCode.rows[0] || byZk.rows[0];
  if (found) return found;

  // Phase 2: Check via email_accounts (even already-linked ones) matching sam_account_name
  if (sam) {
    const emailUsername = sam.replace(/[._-]/g, '.'); // normalize
    const byLinkedEmail = await pool.query(
      `SELECT e.id, e.full_name, e.employee_code, e.email 
       FROM email_accounts ea JOIN employees e ON ea.employee_id = e.id 
       WHERE ea.email_address ILIKE $1 LIMIT 1`,
      [`${emailUsername}@%`]
    );
    if (byLinkedEmail.rows[0]) return byLinkedEmail.rows[0];
    // Also try with dots replaced by different separators
    const samNoDots = sam.replace(/[._-]/g, '%');
    const byFuzzyEmail = await pool.query(
      `SELECT e.id, e.full_name, e.employee_code, e.email 
       FROM email_accounts ea JOIN employees e ON ea.employee_id = e.id 
       WHERE ea.email_address ILIKE $1 LIMIT 1`,
      [`${samNoDots}@%`]
    );
    if (byFuzzyEmail.rows[0]) return byFuzzyEmail.rows[0];
  }

  // Phase 3: Fuzzy name match against employees
  if (displayName && displayName.length > 2) {
    const allEmps = await pool.query('SELECT id, full_name, employee_code, email FROM employees WHERE full_name IS NOT NULL AND full_name != \'\'');
    const nameParts = displayName.toLowerCase().split(/\s+/).filter(p => p.length > 1);
    if (nameParts.length >= 2) {
      for (const emp of allEmps.rows) {
        const empParts = (emp.full_name || '').toLowerCase().split(/\s+/).filter(p => p.length > 1);
        if (empParts.length < 2) continue;
        const matched = nameParts.filter(np => empParts.some(ep => fuzzyMatch(np, ep)));
        const reverse = empParts.filter(ep => nameParts.some(np => fuzzyMatch(np, ep)));
        if (matched.length >= Math.min(2, nameParts.length) && reverse.length >= Math.min(2, empParts.length)) {
          return emp;
        }
      }
    }
  }

  return null;
}

// ─── Create local employee from AD user ───
const createEmployeeFromAD = async (req, res) => {
  try {
    const { ad_user_id, department_id, employee_code } = req.body;

    const adUser = (await pool.query('SELECT * FROM ad_users WHERE id = $1', [ad_user_id])).rows[0];
    if (!adUser) return res.status(404).json({ error: 'مستخدم AD غير موجود' });

    // ──── Auto-discover: ZK fingerprint ID + cPanel email ────
    const [zkUser, cpanelEmail] = await Promise.all([
      findZKUser(adUser),
      findCPanelEmail(adUser)
    ]);

    const autoEmail = cpanelEmail ? cpanelEmail.email_address : (adUser.email || '');
    const autoZkId = zkUser ? zkUser.zk_user_id : null;

    // Check if employee already exists
    const existingEmp = await findExistingEmployee(adUser, autoEmail, autoZkId);
    if (existingEmp) {
      // Link existing employee and fix department/email/fingerprint
      const empDept = (await pool.query('SELECT department_id, email, employee_code FROM employees WHERE id = $1', [existingEmp.id])).rows[0];
      let fixedDeptId = empDept?.department_id || await findDeptFromADUser(adUser, department_id);
      
      // Update employee with best available data
      await pool.query(`
        UPDATE employees SET 
          ad_guid = $1, is_ad_employee = true,
          department_id = COALESCE($3, department_id),
          email = COALESCE(NULLIF($4, ''), email),
          employee_code = COALESCE(NULLIF($5, ''), employee_code)
        WHERE id = $2
      `, [adUser.ad_guid, existingEmp.id, fixedDeptId, autoEmail, autoZkId || empDept?.employee_code]);

      await pool.query('UPDATE ad_users SET local_employee_id = $1, is_synced_employee = true WHERE id = $2', [existingEmp.id, ad_user_id]);

      // Auto-link email account
      if (cpanelEmail) {
        await pool.query('UPDATE email_accounts SET employee_id = $1, updated_at = NOW() WHERE id = $2', [existingEmp.id, cpanelEmail.id]);
      }
      // Auto-link ZK map
      if (zkUser) {
        await pool.query('UPDATE zk_employee_map SET employee_id = $1, is_mapped = true WHERE zk_user_id = $2', [existingEmp.id, zkUser.zk_user_id]);
      }

      const deptName = fixedDeptId ? (await pool.query('SELECT name FROM departments WHERE id=$1', [fixedDeptId])).rows[0]?.name : null;
      const extras = [];
      if (zkUser) extras.push(`بصمة: ${zkUser.zk_user_id} (${zkUser.zk_user_name})`);
      if (cpanelEmail) extras.push(`إيميل: ${cpanelEmail.email_address}`);
      const extraMsg = extras.length > 0 ? ` | ${extras.join(' | ')}` : '';
      
      return res.json({ 
        success: true, 
        message: `تم ربط الموظف الموجود بـ AD${deptName ? ` (القسم: ${deptName})` : ''}${extraMsg}`, 
        employeeId: existingEmp.id,
        department: deptName,
        autoLinked: { fingerprint: zkUser ? { id: zkUser.zk_user_id, name: zkUser.zk_user_name } : null, email: cpanelEmail ? cpanelEmail.email_address : null }
      });
    }

    // Find department using all available AD data (field, OU path, memberOf)
    const deptId = await findDeptFromADUser(adUser, department_id);

    // Employee code priority: provided > ZK fingerprint ID > sam_account_name
    let empCode = employee_code || autoZkId || adUser.sam_account_name;
    if (empCode) {
      const codeExists = await pool.query('SELECT id FROM employees WHERE employee_code = $1 LIMIT 1', [empCode]);
      if (codeExists.rows.length > 0) {
        empCode = `${empCode}_${Date.now().toString().slice(-5)}`;
      }
    } else {
      empCode = `AD_${Date.now().toString().slice(-8)}`;
    }

    const newEmp = await pool.query(`
      INSERT INTO employees (full_name, email, phone, job_title, department_id, employee_code, ad_guid, is_ad_employee, is_active)
      VALUES ($1, $2, $3, $4, $5, $6, $7, true, true)
      RETURNING id
    `, [adUser.display_name, autoEmail, adUser.phone || adUser.mobile,
        adUser.title, deptId, empCode, adUser.ad_guid]);

    const newEmpId = newEmp.rows[0].id;

    await pool.query('UPDATE ad_users SET local_employee_id = $1, is_synced_employee = true WHERE id = $2',
      [newEmpId, ad_user_id]);

    // Auto-link email account to new employee
    if (cpanelEmail) {
      await pool.query('UPDATE email_accounts SET employee_id = $1, updated_at = NOW() WHERE id = $2', [newEmpId, cpanelEmail.id]);
    }

    // Auto-link ZK fingerprint map to new employee
    if (zkUser) {
      await pool.query('UPDATE zk_employee_map SET employee_id = $1, is_mapped = true WHERE zk_user_id = $2', [newEmpId, zkUser.zk_user_id]);
    }

    const deptName = deptId ? (await pool.query('SELECT name FROM departments WHERE id=$1', [deptId])).rows[0]?.name : null;
    const extras = [];
    if (zkUser) extras.push(`بصمة: ${zkUser.zk_user_id} (${zkUser.zk_user_name})`);
    if (cpanelEmail) extras.push(`إيميل: ${cpanelEmail.email_address}`);
    const baseMsg = deptName ? `تم إنشاء الموظف بنجاح (القسم: ${deptName})` : 'تم إنشاء الموظف بنجاح';
    const extraMsg = extras.length > 0 ? ` | ${extras.join(' | ')}` : '';

    res.json({
      success: true,
      message: `${baseMsg}${extraMsg}`,
      employeeId: newEmpId,
      department: deptName,
      autoLinked: {
        fingerprint: zkUser ? { id: zkUser.zk_user_id, name: zkUser.zk_user_name } : null,
        email: cpanelEmail ? cpanelEmail.email_address : null
      }
    });
  } catch (error) {
    console.error('AD createEmployee error:', error);
    res.status(500).json({ error: 'خطأ في إنشاء الموظف: ' + error.message });
  }
};

// ─── Bulk create users from selected AD users ───
const bulkCreateUsers = async (req, res) => {
  try {
    const { ad_user_ids, role, default_password } = req.body;
    if (!ad_user_ids || ad_user_ids.length === 0) {
      return res.status(400).json({ error: 'يجب اختيار مستخدم واحد على الأقل' });
    }

    const hashedPassword = await bcrypt.hash(default_password || 'ADUser@2026', 10);
    const config = (await pool.query('SELECT domain_name FROM ad_config WHERE id = 1')).rows[0];
    const domain = config?.domain_name || 'local';

    let created = 0, linked = 0, skipped = 0;
    const errors = [];

    for (const adId of ad_user_ids) {
      try {
        const adUser = (await pool.query('SELECT * FROM ad_users WHERE id = $1', [adId])).rows[0];
        if (!adUser) { skipped++; continue; }
        if (adUser.is_synced_user) { skipped++; continue; }

        const email = adUser.email || `${adUser.sam_account_name}@${domain}`;

        // Check existing user
        const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
        if (existing.rows.length > 0) {
          await pool.query('UPDATE users SET ad_guid = $1, is_ad_user = true, ad_username = $2 WHERE id = $3',
            [adUser.ad_guid, adUser.sam_account_name, existing.rows[0].id]);
          await pool.query('UPDATE ad_users SET local_user_id = $1, is_synced_user = true WHERE id = $2',
            [existing.rows[0].id, adId]);
          linked++;
          continue;
        }

        const newUser = await pool.query(`
          INSERT INTO users (email, password, full_name, role, ad_guid, is_ad_user, ad_username, phone)
          VALUES ($1, $2, $3, $4, $5, true, $6, $7)
          RETURNING id
        `, [email, hashedPassword, adUser.display_name || adUser.sam_account_name,
            role || 'user', adUser.ad_guid, adUser.sam_account_name, adUser.phone || adUser.mobile]);

        await pool.query('UPDATE ad_users SET local_user_id = $1, is_synced_user = true WHERE id = $2',
          [newUser.rows[0].id, adId]);
        created++;
      } catch (e) {
        errors.push(`${adId}: ${e.message}`);
      }
    }

    res.json({
      success: true,
      message: `تم إنشاء ${created} مستخدم، تم ربط ${linked}، تم تخطي ${skipped}`,
      stats: { created, linked, skipped, errors: errors.length }
    });
  } catch (error) {
    console.error('AD bulkCreate error:', error);
    res.status(500).json({ error: 'خطأ في الإنشاء الجماعي: ' + error.message });
  }
};

// ─── Bulk create employees from selected AD users ───
const bulkCreateEmployees = async (req, res) => {
  try {
    const { ad_user_ids } = req.body;
    if (!ad_user_ids || ad_user_ids.length === 0) {
      return res.status(400).json({ error: 'يجب اختيار مستخدم واحد على الأقل' });
    }

    let created = 0, linked = 0, skipped = 0;

    for (const adId of ad_user_ids) {
      try {
        const adUser = (await pool.query('SELECT * FROM ad_users WHERE id = $1', [adId])).rows[0];
        if (!adUser) { skipped++; continue; }
        if (adUser.is_synced_employee) { skipped++; continue; }

        // Auto-discover: ZK fingerprint ID + cPanel email
        const [zkUser, cpanelEmail] = await Promise.all([
          findZKUser(adUser),
          findCPanelEmail(adUser)
        ]);
        const autoEmail = cpanelEmail ? cpanelEmail.email_address : (adUser.email || '');
        const autoZkId = zkUser ? zkUser.zk_user_id : null;

        // Check existing employee by ad_guid, email, or employee_code
        const [ckGuid, ckEmail, ckCode, ckZk] = await Promise.all([
          adUser.ad_guid          ? pool.query('SELECT id FROM employees WHERE ad_guid = $1 LIMIT 1', [adUser.ad_guid]) : Promise.resolve({ rows: [] }),
          autoEmail               ? pool.query('SELECT id FROM employees WHERE email = $1 LIMIT 1', [autoEmail]) : Promise.resolve({ rows: [] }),
          adUser.sam_account_name ? pool.query('SELECT id FROM employees WHERE employee_code = $1 LIMIT 1', [adUser.sam_account_name]) : Promise.resolve({ rows: [] }),
          autoZkId                ? pool.query('SELECT id FROM employees WHERE employee_code = $1 LIMIT 1', [autoZkId]) : Promise.resolve({ rows: [] }),
        ]);
        const existingBulk = ckGuid.rows[0] || ckEmail.rows[0] || ckCode.rows[0] || ckZk.rows[0];
        if (existingBulk) {
          const empDept = (await pool.query('SELECT department_id, email, employee_code FROM employees WHERE id = $1', [existingBulk.id])).rows[0];
          let fixedDeptId = empDept?.department_id || await findDeptFromADUser(adUser);
          await pool.query(`
            UPDATE employees SET 
              ad_guid = $1, is_ad_employee = true,
              department_id = COALESCE($3, department_id),
              email = COALESCE(NULLIF($4, ''), email),
              employee_code = COALESCE(NULLIF($5, ''), employee_code)
            WHERE id = $2
          `, [adUser.ad_guid, existingBulk.id, fixedDeptId, autoEmail, autoZkId || empDept?.employee_code]);
          await pool.query('UPDATE ad_users SET local_employee_id = $1, is_synced_employee = true WHERE id = $2', [existingBulk.id, adId]);
          // Auto-link email + ZK
          if (cpanelEmail) await pool.query('UPDATE email_accounts SET employee_id = $1, updated_at = NOW() WHERE id = $2', [existingBulk.id, cpanelEmail.id]);
          if (zkUser) await pool.query('UPDATE zk_employee_map SET employee_id = $1, is_mapped = true WHERE zk_user_id = $2', [existingBulk.id, zkUser.zk_user_id]);
          linked++;
          continue;
        }

        // Try to match department using all available AD data (field, OU path, memberOf)
        const deptId = await findDeptFromADUser(adUser);

        // Employee code priority: ZK fingerprint ID > sam_account_name
        let empCode = autoZkId || adUser.sam_account_name;
        if (empCode) {
          const codeExists = await pool.query('SELECT id FROM employees WHERE employee_code = $1 LIMIT 1', [empCode]);
          if (codeExists.rows.length > 0) empCode = `${empCode}_${Date.now().toString().slice(-5)}`;
        } else {
          empCode = `AD_${Date.now().toString().slice(-8)}`;
        }

        const newEmp = await pool.query(`
          INSERT INTO employees (full_name, email, phone, job_title, department_id, employee_code, ad_guid, is_ad_employee, is_active)
          VALUES ($1, $2, $3, $4, $5, $6, $7, true, true)
          RETURNING id
        `, [adUser.display_name, autoEmail, adUser.phone || adUser.mobile,
            adUser.title, deptId, empCode, adUser.ad_guid]);

        const newEmpId = newEmp.rows[0].id;
        await pool.query('UPDATE ad_users SET local_employee_id = $1, is_synced_employee = true WHERE id = $2', [newEmpId, adId]);
        // Auto-link email + ZK
        if (cpanelEmail) await pool.query('UPDATE email_accounts SET employee_id = $1, updated_at = NOW() WHERE id = $2', [newEmpId, cpanelEmail.id]);
        if (zkUser) await pool.query('UPDATE zk_employee_map SET employee_id = $1, is_mapped = true WHERE zk_user_id = $2', [newEmpId, zkUser.zk_user_id]);
        created++;
      } catch (e) { console.error('bulkCreate skip:', e.message); skipped++; }
    }

    res.json({
      success: true,
      message: `تم إنشاء ${created} موظف، تم ربط ${linked}، تم تخطي ${skipped}`,
      stats: { created, linked, skipped }
    });
  } catch (error) {
    console.error('AD bulkCreateEmployees error:', error);
    res.status(500).json({ error: 'خطأ في الإنشاء الجماعي' });
  }
};

// ─── AD Login (authenticate against AD) ───
const adLogin = async (username, password) => {
  const config = (await pool.query('SELECT * FROM ad_config WHERE id = 1 AND is_active = true')).rows[0];
  if (!config) return { success: false, error: 'AD غير مفعل' };

  let client;
  try {
    client = createClient(config);

    // Try to bind with user credentials
    const userDN = username.includes('@')
      ? username
      : `${username}@${config.domain_name}`;

    await bindClient(client, userDN, password);

    // Search for the user to get their details
    const users = await searchAD(client, config.base_dn,
      `(&(objectClass=user)(|(sAMAccountName=${username})(userPrincipalName=${userDN})))`,
      ['objectGUID', 'sAMAccountName', 'displayName', 'mail', 'memberOf', 'department', 'title']);

    client.unbind();

    if (users.length === 0) return { success: false, error: 'المستخدم غير موجود في AD' };

    const adUser = users[0];
    const guid = parseGUID(adUser.objectGUID);
    const email = adUser.mail || `${username}@${config.domain_name}`;

    return {
      success: true,
      adUser: {
        guid,
        username: adUser.sAMAccountName || username,
        displayName: adUser.displayName || username,
        email,
        department: adUser.department || '',
        title: adUser.title || '',
        memberOf: Array.isArray(adUser.memberOf) ? adUser.memberOf : (adUser.memberOf ? [adUser.memberOf] : [])
      }
    };
  } catch (error) {
    if (client) try { client.unbind(); } catch (e) { /* ignore */ }
    if (error.code === 49 || error.message?.includes('InvalidCredentials')) {
      return { success: false, error: 'بيانات الاعتماد غير صحيحة' };
    }
    return { success: false, error: 'خطأ في الاتصال بـ AD: ' + error.message };
  }
};

// ─── Get sync logs ───
const getSyncLogs = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM ad_sync_logs ORDER BY created_at DESC LIMIT 50');
    res.json(result.rows);
  } catch (error) {
    console.error('AD getSyncLogs error:', error);
    res.status(500).json({ error: 'خطأ في جلب سجل المزامنة' });
  }
};

// ─── Get AD stats ───
const getStats = async (req, res) => {
  try {
    const total = (await pool.query('SELECT COUNT(*) FROM ad_users')).rows[0].count;
    const enabled = (await pool.query('SELECT COUNT(*) FROM ad_users WHERE is_enabled = true')).rows[0].count;
    const syncedUsers = (await pool.query('SELECT COUNT(*) FROM ad_users WHERE is_synced_user = true')).rows[0].count;
    const syncedEmployees = (await pool.query('SELECT COUNT(*) FROM ad_users WHERE is_synced_employee = true')).rows[0].count;
    const departments = (await pool.query('SELECT COUNT(DISTINCT department) FROM ad_users WHERE department IS NOT NULL AND department != \'\'')).rows[0].count;
    const config = (await pool.query('SELECT last_sync_at, last_sync_status, last_sync_count FROM ad_config WHERE id = 1')).rows[0];

    res.json({
      total: parseInt(total),
      enabled: parseInt(enabled),
      disabled: parseInt(total) - parseInt(enabled),
      syncedUsers: parseInt(syncedUsers),
      syncedEmployees: parseInt(syncedEmployees),
      unsyncedUsers: parseInt(total) - parseInt(syncedUsers),
      departments: parseInt(departments),
      lastSync: config?.last_sync_at,
      lastSyncStatus: config?.last_sync_status,
      lastSyncCount: config?.last_sync_count
    });
  } catch (error) {
    console.error('AD getStats error:', error);
    res.status(500).json({ error: 'خطأ في جلب الإحصائيات' });
  }
};

// ─── Unlink AD user from local user/employee ───
const unlinkADUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { type } = req.body; // 'user' or 'employee'

    if (type === 'user') {
      const adUser = (await pool.query('SELECT local_user_id FROM ad_users WHERE id = $1', [id])).rows[0];
      if (adUser?.local_user_id) {
        await pool.query('UPDATE users SET ad_guid = NULL, is_ad_user = false, ad_username = NULL WHERE id = $1', [adUser.local_user_id]);
      }
      await pool.query('UPDATE ad_users SET local_user_id = NULL, is_synced_user = false WHERE id = $1', [id]);
    } else if (type === 'employee') {
      const adUser = (await pool.query('SELECT local_employee_id FROM ad_users WHERE id = $1', [id])).rows[0];
      if (adUser?.local_employee_id) {
        await pool.query('UPDATE employees SET ad_guid = NULL, is_ad_employee = false WHERE id = $1', [adUser.local_employee_id]);
      }
      await pool.query('UPDATE ad_users SET local_employee_id = NULL, is_synced_employee = false WHERE id = $1', [id]);
    }

    res.json({ success: true, message: 'تم فك الربط بنجاح' });
  } catch (error) {
    console.error('AD unlink error:', error);
    res.status(500).json({ error: 'خطأ في فك الربط' });
  }
};

// ─── Fetch OUs from AD ───
const fetchADOUs = async (req, res) => {
  let client;
  try {
    const config = (await pool.query('SELECT * FROM ad_config WHERE id = 1')).rows[0];
    if (!config) return res.status(400).json({ error: 'لا توجد إعدادات Active Directory' });

    client = createClient(config);
    await bindClient(client, config.bind_dn, config.bind_password);

    // Search for OUs
    const ous = await searchAD(client, config.base_dn,
      '(objectClass=organizationalUnit)',
      ['ou', 'distinguishedName', 'description', 'name']);

    client.unbind();

    const ouList = ous.map(o => ({
      name: o.ou || o.name || '',
      display_name: o.ou || o.name || '',
      distinguished_name: o.distinguishedName || '',
      description: o.description || '',
      type: 'ou',
      parent_dn: o.distinguishedName ? o.distinguishedName.split(',').slice(1).join(',') : ''
    })).filter(o => o.name);

    res.json({ success: true, ous: ouList, count: ouList.length });
  } catch (error) {
    if (client) try { client.unbind(); } catch (e) {}
    console.error('AD fetchOUs error:', error.message);
    res.status(500).json({ error: 'خطأ في جلب OUs: ' + error.message });
  }
};

// ─── Fetch Groups from AD ───
const fetchADGroups = async (req, res) => {
  let client;
  try {
    const config = (await pool.query('SELECT * FROM ad_config WHERE id = 1')).rows[0];
    if (!config) return res.status(400).json({ error: 'لا توجد إعدادات Active Directory' });

    client = createClient(config);
    await bindClient(client, config.bind_dn, config.bind_password);

    // Search for Security and Distribution Groups
    const groups = await searchAD(client, config.base_dn,
      '(objectClass=group)',
      ['cn', 'distinguishedName', 'description', 'name', 'groupType', 'member', 'objectGUID']);

    client.unbind();

    const groupList = groups.map(g => {
      const members = Array.isArray(g.member)
        ? g.member
        : (g.member ? [g.member] : []);
      return {
        name: g.cn || g.name || '',
        display_name: g.cn || g.name || '',
        distinguished_name: g.distinguishedName || '',
        description: g.description || '',
        type: 'group',
        member_count: members.length,
        ad_guid: g.objectGUID || null,
        parent_dn: g.distinguishedName ? g.distinguishedName.split(',').slice(1).join(',') : ''
      };
    }).filter(g => g.name);

    res.json({ success: true, groups: groupList, count: groupList.length });
  } catch (error) {
    if (client) try { client.unbind(); } catch (e) {}
    console.error('AD fetchGroups error:', error.message);
    res.status(500).json({ error: 'خطأ في جلب Groups: ' + error.message });
  }
};

// ─── Sync OUs/Groups as Departments ───
const syncAsDepartments = async (req, res) => {
  try {
    const { items } = req.body; // array of { name, display_name, distinguished_name, description, type }
    if (!items || items.length === 0) {
      return res.status(400).json({ error: 'لا توجد عناصر للمزامنة' });
    }

    let created = 0, linked = 0, skipped = 0;
    const results = [];

    for (const item of items) {
      try {
        // Check if already synced by DN
        const existingAD = await pool.query(
          'SELECT id, local_department_id FROM ad_groups_ous WHERE distinguished_name = $1',
          [item.distinguished_name]
        );

        // Check if department name already exists
        const existingDept = await pool.query(
          'SELECT id FROM departments WHERE name ILIKE $1 OR ad_dn = $2',
          [item.name, item.distinguished_name]
        );

        let deptId;

        if (existingDept.rows.length > 0) {
          // Link existing department to AD
          deptId = existingDept.rows[0].id;
          await pool.query(
            `UPDATE departments SET ad_ou = $1, ad_dn = $2, ad_type = $3, is_ad_department = true, updated_at = CURRENT_TIMESTAMP WHERE id = $4`,
            [item.name, item.distinguished_name, item.type, deptId]
          );
          linked++;
        } else {
          // Create new department from AD
          const newDept = await pool.query(
            `INSERT INTO departments (name, ad_ou, ad_dn, ad_type, is_ad_department, is_active)
             VALUES ($1, $2, $3, $4, true, true) RETURNING id`,
            [item.display_name || item.name, item.name, item.distinguished_name, item.type]
          );
          deptId = newDept.rows[0].id;
          created++;
        }

        // Upsert in ad_groups_ous cache
        if (existingAD.rows.length > 0) {
          await pool.query(
            `UPDATE ad_groups_ous SET name=$1, display_name=$2, description=$3, type=$4,
             member_count=$5, parent_dn=$6, local_department_id=$7, is_synced=true, last_sync_at=CURRENT_TIMESTAMP, updated_at=CURRENT_TIMESTAMP
             WHERE distinguished_name=$8`,
            [item.name, item.display_name || item.name, item.description || '', item.type,
             item.member_count || 0, item.parent_dn || '', deptId, item.distinguished_name]
          );
        } else {
          await pool.query(
            `INSERT INTO ad_groups_ous (name, display_name, description, type, member_count, parent_dn, distinguished_name, ad_guid, local_department_id, is_synced)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, true)`,
            [item.name, item.display_name || item.name, item.description || '', item.type,
             item.member_count || 0, item.parent_dn || '', item.distinguished_name,
             item.ad_guid || null, deptId]
          );
        }

        results.push({ name: item.name, status: existingDept.rows.length > 0 ? 'linked' : 'created', id: deptId });
      } catch (e) {
        skipped++;
        results.push({ name: item.name, status: 'error', error: e.message });
      }
    }

    res.json({
      success: true,
      message: `تم: إنشاء ${created} قسم جديد، ربط ${linked} قسم موجود، تخطي ${skipped}`,
      created, linked, skipped, results
    });
  } catch (error) {
    console.error('AD syncAsDepartments error:', error);
    res.status(500).json({ error: 'خطأ في مزامنة الأقسام: ' + error.message });
  }
};

// ─── Get synced AD Groups/OUs (cached) ───
const getADGroupsOUs = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT ag.*, d.name as dept_name
      FROM ad_groups_ous ag
      LEFT JOIN departments d ON d.id = ag.local_department_id
      ORDER BY ag.type, ag.name
    `);
    res.json({ success: true, items: result.rows });
  } catch (error) {
    res.status(500).json({ error: 'خطأ في جلب البيانات' });
  }
};

// ─── Fix departments for existing AD employees that have null department_id ───
const fixEmployeeDepartments = async (req, res) => {
  try {
    // Get all AD employees with no department
    const emps = await pool.query(`
      SELECT e.id, e.full_name, e.ad_guid, au.id as ad_user_id, au.display_name, au.department, au.distinguished_name, au.member_of, au.sam_account_name
      FROM employees e
      LEFT JOIN ad_users au ON au.local_employee_id = e.id
      WHERE e.is_ad_employee = true AND e.department_id IS NULL AND au.id IS NOT NULL
    `);

    let fixed = 0;
    const details = [];

    for (const emp of emps.rows) {
      const deptId = await findDeptFromADUser(emp);
      if (deptId) {
        await pool.query('UPDATE employees SET department_id = $1 WHERE id = $2', [deptId, emp.id]);
        const deptName = (await pool.query('SELECT name FROM departments WHERE id=$1', [deptId])).rows[0]?.name;
        details.push({ employee: emp.full_name, department: deptName });
        fixed++;
      }
    }

    res.json({
      success: true,
      message: `تم إصلاح ${fixed} موظف من أصل ${emps.rows.length}`,
      fixed,
      total: emps.rows.length,
      details
    });
  } catch (error) {
    console.error('fixEmployeeDepartments error:', error);
    res.status(500).json({ error: 'خطأ في إصلاح الأقسام: ' + error.message });
  }
};

// ─── Preview auto-link data before creating employee ───
const previewEmployeeAutoLink = async (req, res) => {
  try {
    const { ad_user_id } = req.params;
    const adUser = (await pool.query('SELECT * FROM ad_users WHERE id = $1', [ad_user_id])).rows[0];
    if (!adUser) return res.status(404).json({ error: 'مستخدم AD غير موجود' });

    // Find unlinked matches
    const [zkUser, cpanelEmail] = await Promise.all([
      findZKUser(adUser),
      findCPanelEmail(adUser)
    ]);

    const autoEmail = cpanelEmail ? cpanelEmail.email_address : (adUser.email || '');
    const autoZkId = zkUser ? zkUser.zk_user_id : null;
    const sam = adUser.sam_account_name || '';

    // ──── Check if employee already exists ────
    const existingEmp = await findExistingEmployee(adUser, autoEmail, autoZkId);

    // If existing employee found, also get their currently-linked ZK & email
    let existingZk = null, existingEmail = null;
    if (existingEmp) {
      const [zkLinked, emLinked] = await Promise.all([
        pool.query('SELECT zk_user_id, zk_user_name FROM zk_employee_map WHERE employee_id = $1', [existingEmp.id]),
        pool.query("SELECT id, email_address FROM email_accounts WHERE employee_id = $1 AND source = 'cpanel'", [existingEmp.id]),
      ]);
      if (zkLinked.rows[0]) existingZk = zkLinked.rows[0];
      if (emLinked.rows[0]) existingEmail = emLinked.rows[0];
    }

    const deptId = await findDeptFromADUser(adUser);
    const deptName = deptId ? (await pool.query('SELECT name FROM departments WHERE id=$1', [deptId])).rows[0]?.name : null;

    // Build fingerprint info: new match > existing link
    let fingerprint = null;
    if (zkUser) {
      fingerprint = { id: zkUser.zk_user_id, name: zkUser.zk_user_name, status: 'will_link' };
    } else if (existingZk) {
      fingerprint = { id: existingZk.zk_user_id, name: existingZk.zk_user_name, status: 'already_linked' };
    }

    // Build email info: new match > existing link
    let email = null;
    if (cpanelEmail) {
      email = { id: cpanelEmail.id, address: cpanelEmail.email_address, status: 'will_link' };
    } else if (existingEmail) {
      email = { id: existingEmail.id, address: existingEmail.email_address, status: 'already_linked' };
    }

    const empCode = autoZkId || (existingEmp?.employee_code) || sam;

    res.json({
      ad_user: {
        id: adUser.id,
        display_name: adUser.display_name,
        sam_account_name: adUser.sam_account_name,
        email: adUser.email,
        title: adUser.title
      },
      existing_employee: existingEmp ? {
        id: existingEmp.id,
        full_name: existingEmp.full_name,
        employee_code: existingEmp.employee_code,
        email: existingEmp.email
      } : null,
      auto_link: {
        fingerprint,
        email,
        department: deptName ? { id: deptId, name: deptName } : null,
        employee_code: empCode
      }
    });
  } catch (error) {
    console.error('previewAutoLink error:', error);
    res.status(500).json({ error: 'خطأ في المعاينة: ' + error.message });
  }
};

module.exports = {
  getConfig,
  saveConfig,
  testConnection,
  fetchADUsers,
  syncADUsers,
  getADUsers,
  createUserFromAD,
  createEmployeeFromAD,
  bulkCreateUsers,
  bulkCreateEmployees,
  adLogin,
  getSyncLogs,
  getStats,
  unlinkADUser,
  fetchADOUs,
  fetchADGroups,
  syncAsDepartments,
  getADGroupsOUs,
  fixEmployeeDepartments,
  previewEmployeeAutoLink
};
