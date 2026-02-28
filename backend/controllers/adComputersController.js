const ldap = require('ldapjs');
const pool = require('../config/database');

// ─── Helper: create LDAP client ───
function createClient(config) {
  const url = config.use_ssl
    ? `ldaps://${config.server_url.replace(/^ldaps?:\/\//, '')}:${config.port || 636}`
    : `ldap://${config.server_url.replace(/^ldaps?:\/\//, '')}:${config.port || 389}`;

  return ldap.createClient({
    url,
    reconnect: false,
    connectTimeout: 10000,
    tlsOptions: { rejectUnauthorized: false }
  });
}

function bindClient(client, dn, password) {
  return new Promise((resolve, reject) => {
    client.bind(dn, password, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

function searchAD(client, baseDN, filter, attributes) {
  return new Promise((resolve, reject) => {
    const results = [];
    const opts = { filter, scope: 'sub', attributes, paged: { pageSize: 500 } };

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
        if (err.name === 'SizeLimitExceededError') resolve(results);
        else reject(err);
      });

      res.on('end', () => resolve(results));
    });
  });
}

// Parse Windows FILETIME to JS Date
function parseADTimestamp(val) {
  if (!val) return null;
  const num = parseInt(val, 10);
  if (num > 100000000000000) {
    const ms = (num / 10000) - 11644473600000;
    const d = new Date(ms);
    if (d.getFullYear() > 1970 && d.getFullYear() < 2100) return d;
  }
  return null;
}

// Parse AD date format "yyyyMMddHHmmss.0Z"
function parseADDate(val) {
  if (!val) return null;
  if (typeof val === 'string' && val.includes('.0Z')) {
    const y = val.substring(0, 4), m = val.substring(4, 6), d = val.substring(6, 8);
    const h = val.substring(8, 10), min = val.substring(10, 12), s = val.substring(12, 14);
    return new Date(`${y}-${m}-${d}T${h}:${min}:${s}Z`);
  }
  return null;
}

// Extract OU path from DN
function extractOU(dn) {
  if (!dn) return '';
  const parts = dn.replace(/^CN=[^,]+,/, '').split(',');
  const ous = parts
    .filter(p => p.startsWith('OU='))
    .map(p => p.replace('OU=', ''));
  return ous.join(' / ');
}

// Determine computer type from attributes
function getComputerType(obj) {
  const os = (obj.operatingSystem || '').toLowerCase();
  const dn = (obj.distinguishedName || '').toLowerCase();
  
  if (dn.includes('domain controllers')) return 'domain_controller';
  if (os.includes('server')) return 'server';
  if (obj.cn && obj.cn.toLowerCase().includes('lab')) return 'lab';
  if (os.includes('windows')) return 'workstation';
  return 'other';
}

// Check if computer is likely active (logged in within last 90 days)
function isActive(lastLogon) {
  if (!lastLogon) return false;
  const ninetyDaysAgo = Date.now() - (90 * 24 * 60 * 60 * 1000);
  return lastLogon.getTime() > ninetyDaysAgo;
}

// ───── Ensure cache table exists ─────
async function ensureCacheTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS ad_computers_cache (
      id SERIAL PRIMARY KEY,
      computer_name VARCHAR(255) UNIQUE NOT NULL,
      dns_name VARCHAR(255),
      os VARCHAR(255),
      os_version VARCHAR(100),
      os_sp VARCHAR(100),
      computer_type VARCHAR(50),
      ou VARCHAR(500),
      dn TEXT,
      description TEXT,
      location VARCHAR(255),
      last_logon TIMESTAMP,
      is_active BOOLEAN DEFAULT false,
      created_at_ad TIMESTAMP,
      last_changed TIMESTAMP,
      is_enabled BOOLEAN DEFAULT true,
      managed_by_name VARCHAR(255),
      managed_by_username VARCHAR(255),
      managed_by_department VARCHAR(255),
      managed_by_email VARCHAR(255),
      synced_at TIMESTAMP DEFAULT NOW(),
      -- Hardware specs (from PowerShell)
      processor VARCHAR(255),
      ram_gb DECIMAL(10,2),
      disk_size_gb DECIMAL(10,2),
      disk_free_gb DECIMAL(10,2),
      manufacturer VARCHAR(255),
      model VARCHAR(255),
      serial_number VARCHAR(255),
      ip_address VARCHAR(50),
      mac_address VARCHAR(50),
      specs_updated_at TIMESTAMP
    )
  `);
  
  // Add specs columns if table already exists (migration)
  const specsColumns = [
    "ALTER TABLE ad_computers_cache ADD COLUMN IF NOT EXISTS processor VARCHAR(255)",
    "ALTER TABLE ad_computers_cache ADD COLUMN IF NOT EXISTS ram_gb DECIMAL(10,2)",
    "ALTER TABLE ad_computers_cache ADD COLUMN IF NOT EXISTS disk_size_gb DECIMAL(10,2)",
    "ALTER TABLE ad_computers_cache ADD COLUMN IF NOT EXISTS disk_free_gb DECIMAL(10,2)",
    "ALTER TABLE ad_computers_cache ADD COLUMN IF NOT EXISTS disks JSONB",
    "ALTER TABLE ad_computers_cache ADD COLUMN IF NOT EXISTS manufacturer VARCHAR(255)",
    "ALTER TABLE ad_computers_cache ADD COLUMN IF NOT EXISTS model VARCHAR(255)",
    "ALTER TABLE ad_computers_cache ADD COLUMN IF NOT EXISTS serial_number VARCHAR(255)",
    "ALTER TABLE ad_computers_cache ADD COLUMN IF NOT EXISTS ip_address VARCHAR(50)",
    "ALTER TABLE ad_computers_cache ADD COLUMN IF NOT EXISTS mac_address VARCHAR(50)",
    "ALTER TABLE ad_computers_cache ADD COLUMN IF NOT EXISTS specs_updated_at TIMESTAMP"
  ];
  for (const sql of specsColumns) {
    try { await pool.query(sql); } catch(e) {}
  }
  // Also ensure assignments table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS ad_computers (
      id SERIAL PRIMARY KEY,
      computer_name VARCHAR(255) UNIQUE NOT NULL,
      assigned_employee_id INTEGER REFERENCES employees(id) ON DELETE SET NULL,
      notes TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `);
}

// ───── Get Cached Computers (fast, no AD connection) ─────
exports.getCachedComputers = async (req, res) => {
  try {
    await ensureCacheTable();

    const result = await pool.query(`
      SELECT c.*, 
        ac.assigned_employee_id,
        e.full_name, e.email as emp_email,
        d.name as department_name
      FROM ad_computers_cache c
      LEFT JOIN ad_computers ac ON c.computer_name = ac.computer_name
      LEFT JOIN employees e ON ac.assigned_employee_id = e.id
      LEFT JOIN departments d ON e.department_id = d.id
      ORDER BY c.is_active DESC, c.computer_name ASC
    `);

    if (result.rows.length === 0) {
      return res.json({ computers: [], stats: null, cached: false });
    }

    const computers = result.rows.map(r => ({
      name: r.computer_name,
      dns_name: r.dns_name,
      os: r.os || 'غير معروف',
      os_version: r.os_version,
      os_sp: r.os_sp,
      type: r.computer_type,
      ou: r.ou,
      dn: r.dn,
      description: r.description,
      location: r.location,
      last_logon: r.last_logon,
      is_active: r.is_active,
      created: r.created_at_ad,
      last_changed: r.last_changed,
      is_enabled: r.is_enabled,
      managed_by: r.managed_by_name ? {
        displayName: r.managed_by_name,
        username: r.managed_by_username,
        department: r.managed_by_department,
        email: r.managed_by_email
      } : null,
      assigned_user: r.assigned_employee_id ? {
        employee_id: r.assigned_employee_id,
        employee_name: r.emp_name || r.full_name,
        department: r.department_name,
        email: r.emp_email
      } : null,
      // Hardware specs
      specs: r.processor ? {
        processor: r.processor,
        ram_gb: parseFloat(r.ram_gb) || null,
        disk_size_gb: parseFloat(r.disk_size_gb) || null,
        disk_free_gb: parseFloat(r.disk_free_gb) || null,
        disks: r.disks || null,
        manufacturer: r.manufacturer,
        model: r.model,
        serial_number: r.serial_number,
        ip_address: r.ip_address,
        mac_address: r.mac_address,
        updated_at: r.specs_updated_at
      } : null
    }));

    const specsCount = computers.filter(c => c.specs).length;

    const stats = {
      total: computers.length,
      active: computers.filter(c => c.is_active).length,
      inactive: computers.filter(c => !c.is_active).length,
      workstations: computers.filter(c => c.type === 'workstation').length,
      servers: computers.filter(c => c.type === 'server').length,
      domain_controllers: computers.filter(c => c.type === 'domain_controller').length,
      labs: computers.filter(c => c.type === 'lab').length,
      specs_count: specsCount,
      os_breakdown: computers.reduce((acc, c) => {
        const os = c.os || 'Unknown';
        acc[os] = (acc[os] || 0) + 1;
        return acc;
      }, {}),
      last_sync: result.rows[0]?.synced_at
    };

    res.json({ computers, stats, cached: true });
  } catch (error) {
    console.error('Error getting cached computers:', error);
    res.status(500).json({ error: 'حدث خطأ في جلب البيانات' });
  }
};

// ───── Fetch Computers from AD ─────
exports.fetchComputers = async (req, res) => {
  let client;
  try {
    const configResult = await pool.query('SELECT * FROM ad_config WHERE id = 1');
    if (configResult.rows.length === 0) {
      return res.status(400).json({ error: 'إعدادات الـ AD غير مكوّنة' });
    }
    const config = configResult.rows[0];

    client = createClient(config);
    await bindClient(client, config.bind_dn, config.bind_password);

    // Fetch computers
    const computers = await searchAD(client, config.base_dn, '(objectClass=computer)', [
      'cn', 'name', 'dNSHostName', 'operatingSystem', 'operatingSystemVersion',
      'operatingSystemServicePack', 'lastLogonTimestamp', 'whenCreated', 'whenChanged',
      'description', 'location', 'managedBy', 'distinguishedName', 'objectGUID',
      'userAccountControl'
    ]);

    // Fetch users to cross-reference
    const users = await searchAD(client, config.base_dn,
      '(&(objectClass=user)(objectCategory=person))', [
      'sAMAccountName', 'displayName', 'department', 'title',
      'distinguishedName', 'mail', 'lastLogonTimestamp'
    ]);

    client.unbind();

    // Build user map by DN for managedBy lookups
    const userByDN = {};
    users.forEach(u => {
      if (u.distinguishedName) {
        userByDN[u.distinguishedName] = {
          username: u.sAMAccountName,
          displayName: u.displayName,
          department: u.department,
          title: u.title,
          email: u.mail
        };
      }
    });

    // Also check our DB for computer-user assignments
    let dbAssignments = {};
    try {
      const assignResult = await pool.query(`
        SELECT ac.*, e.full_name, e.email, d.name as department_name
        FROM ad_computers ac
        LEFT JOIN employees e ON ac.assigned_employee_id = e.id
        LEFT JOIN departments d ON e.department_id = d.id
        WHERE ac.assigned_employee_id IS NOT NULL
      `);
      assignResult.rows.forEach(r => {
        dbAssignments[r.computer_name] = {
          employee_id: r.assigned_employee_id,
          employee_name: r.full_name,
          department: r.department_name,
          email: r.email
        };
      });
    } catch (e) {
      // Table might not exist yet, that's fine
    }

    // Process results
    const result = computers.map(comp => {
      const lastLogon = parseADTimestamp(comp.lastLogonTimestamp);
      const created = parseADDate(comp.whenCreated);
      const changed = parseADDate(comp.whenChanged);
      const type = getComputerType(comp);
      const ou = extractOU(comp.distinguishedName);
      
      // Find managed by user
      let managedByUser = null;
      if (comp.managedBy && userByDN[comp.managedBy]) {
        managedByUser = userByDN[comp.managedBy];
      }

      // Check DB assignments
      const dbAssign = dbAssignments[comp.cn] || null;

      return {
        name: comp.cn,
        dns_name: comp.dNSHostName,
        os: comp.operatingSystem || 'غير معروف',
        os_version: comp.operatingSystemVersion,
        os_sp: comp.operatingSystemServicePack,
        type,
        ou,
        dn: comp.distinguishedName,
        description: comp.description,
        location: comp.location,
        last_logon: lastLogon,
        is_active: isActive(lastLogon),
        created: created,
        last_changed: changed,
        managed_by: managedByUser,
        assigned_user: dbAssign,
        is_enabled: comp.userAccountControl ? !(parseInt(comp.userAccountControl) & 0x0002) : true
      };
    });

    // Sort: active first, then by name
    result.sort((a, b) => {
      if (a.is_active !== b.is_active) return a.is_active ? -1 : 1;
      return (a.name || '').localeCompare(b.name || '');
    });

    // ── Cache results in database ──
    try {
      await ensureCacheTable();
      // Clear old cache and insert fresh data
      await pool.query('DELETE FROM ad_computers_cache');
      for (const comp of result) {
        await pool.query(`
          INSERT INTO ad_computers_cache 
            (computer_name, dns_name, os, os_version, os_sp, computer_type, ou, dn,
             description, location, last_logon, is_active, created_at_ad, last_changed,
             is_enabled, managed_by_name, managed_by_username, managed_by_department, managed_by_email, synced_at)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,NOW())
          ON CONFLICT (computer_name) DO UPDATE SET
            dns_name=$2, os=$3, os_version=$4, os_sp=$5, computer_type=$6, ou=$7, dn=$8,
            description=$9, location=$10, last_logon=$11, is_active=$12, created_at_ad=$13,
            last_changed=$14, is_enabled=$15, managed_by_name=$16, managed_by_username=$17,
            managed_by_department=$18, managed_by_email=$19, synced_at=NOW()
        `, [
          comp.name, comp.dns_name, comp.os, comp.os_version, comp.os_sp,
          comp.type, comp.ou, comp.dn, comp.description, comp.location,
          comp.last_logon, comp.is_active, comp.created, comp.last_changed,
          comp.is_enabled,
          comp.managed_by?.displayName || null, comp.managed_by?.username || null,
          comp.managed_by?.department || null, comp.managed_by?.email || null
        ]);
      }
      console.log(`✅ Cached ${result.length} computers in database`);
    } catch (cacheErr) {
      console.error('Warning: Failed to cache computers:', cacheErr.message);
    }

    const syncTime = new Date();

    res.json({
      computers: result,
      stats: {
        total: result.length,
        active: result.filter(c => c.is_active).length,
        inactive: result.filter(c => !c.is_active).length,
        workstations: result.filter(c => c.type === 'workstation').length,
        servers: result.filter(c => c.type === 'server').length,
        domain_controllers: result.filter(c => c.type === 'domain_controller').length,
        labs: result.filter(c => c.type === 'lab').length,
        os_breakdown: result.reduce((acc, c) => {
          const os = c.os || 'Unknown';
          acc[os] = (acc[os] || 0) + 1;
          return acc;
        }, {}),
        last_sync: syncTime
      },
      cached: false
    });
  } catch (error) {
    console.error('Error fetching AD computers:', error);
    if (client) try { client.unbind(); } catch(e) {}
    res.status(500).json({ error: 'فشل في جلب الكمبيوترات من الـ AD: ' + error.message });
  }
};

// ───── Assign Employee to Computer ─────
exports.assignEmployee = async (req, res) => {
  try {
    const { computer_name, employee_id } = req.body;

    // Ensure table exists
    await pool.query(`
      CREATE TABLE IF NOT EXISTS ad_computers (
        id SERIAL PRIMARY KEY,
        computer_name VARCHAR(255) UNIQUE NOT NULL,
        assigned_employee_id INTEGER REFERENCES employees(id) ON DELETE SET NULL,
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    if (employee_id) {
      await pool.query(`
        INSERT INTO ad_computers (computer_name, assigned_employee_id, updated_at)
        VALUES ($1, $2, NOW())
        ON CONFLICT (computer_name)
        DO UPDATE SET assigned_employee_id = $2, updated_at = NOW()
      `, [computer_name, employee_id]);
    } else {
      await pool.query(`
        DELETE FROM ad_computers WHERE computer_name = $1
      `, [computer_name]);
    }

    res.json({ message: employee_id ? 'تم ربط الموظف بالجهاز' : 'تم إلغاء الربط' });
  } catch (error) {
    console.error('Error assigning employee:', error);
    res.status(500).json({ error: 'حدث خطأ' });
  }
};

// ───── Get Computer Details (single) ─────
exports.getComputerDetails = async (req, res) => {
  let client;
  try {
    const { name } = req.params;
    const configResult = await pool.query('SELECT * FROM ad_config WHERE id = 1');
    if (configResult.rows.length === 0) {
      return res.status(400).json({ error: 'إعدادات الـ AD غير مكوّنة' });
    }
    const config = configResult.rows[0];

    client = createClient(config);
    await bindClient(client, config.bind_dn, config.bind_password);

    // Get the specific computer
    const computers = await searchAD(client, config.base_dn, `(&(objectClass=computer)(cn=${name}))`, [
      'cn', 'name', 'dNSHostName', 'operatingSystem', 'operatingSystemVersion',
      'operatingSystemServicePack', 'lastLogonTimestamp', 'whenCreated', 'whenChanged',
      'description', 'location', 'managedBy', 'distinguishedName', 'objectGUID',
      'userAccountControl', 'servicePrincipalName', 'memberOf'
    ]);

    if (computers.length === 0) {
      client.unbind();
      return res.status(404).json({ error: 'الجهاز غير موجود' });
    }

    const comp = computers[0];

    // Get all users to find who might be using this computer
    const users = await searchAD(client, config.base_dn,
      '(&(objectClass=user)(objectCategory=person))', [
      'sAMAccountName', 'displayName', 'department', 'title',
      'distinguishedName', 'mail', 'lastLogonTimestamp'
    ]);

    client.unbind();

    const lastLogon = parseADTimestamp(comp.lastLogonTimestamp);

    // Find managed by
    let managedByUser = null;
    if (comp.managedBy) {
      const u = users.find(u => u.distinguishedName === comp.managedBy);
      if (u) managedByUser = { username: u.sAMAccountName, displayName: u.displayName, department: u.department, email: u.mail };
    }

    // Check DB assignment
    let assignedUser = null;
    try {
      const r = await pool.query(`
        SELECT ac.*, e.full_name, e.email, e.employee_code, d.name as department_name
        FROM ad_computers ac
        LEFT JOIN employees e ON ac.assigned_employee_id = e.id
        LEFT JOIN departments d ON e.department_id = d.id
        WHERE ac.computer_name = $1
      `, [name]);
      if (r.rows.length > 0 && r.rows[0].assigned_employee_id) {
        assignedUser = r.rows[0];
      }
    } catch (e) {}

    // Get specs from cache
    let specs = null;
    try {
      const specsResult = await pool.query(`
        SELECT processor, ram_gb, disk_size_gb, disk_free_gb, disks, manufacturer, 
               model, serial_number, ip_address, mac_address, specs_updated_at
        FROM ad_computers_cache WHERE LOWER(computer_name) = LOWER($1)
      `, [name]);
      if (specsResult.rows.length > 0 && specsResult.rows[0].processor) {
        const s = specsResult.rows[0];
        specs = {
          processor: s.processor,
          ram_gb: parseFloat(s.ram_gb) || null,
          disk_size_gb: parseFloat(s.disk_size_gb) || null,
          disk_free_gb: parseFloat(s.disk_free_gb) || null,
          disks: s.disks || null,
          manufacturer: s.manufacturer,
          model: s.model,
          serial_number: s.serial_number,
          ip_address: s.ip_address,
          mac_address: s.mac_address,
          updated_at: s.specs_updated_at
        };
      }
    } catch (e) {}

    // Parse groups
    let groups = [];
    if (comp.memberOf) {
      const memberOf = Array.isArray(comp.memberOf) ? comp.memberOf : [comp.memberOf];
      groups = memberOf.map(dn => {
        const match = dn.match(/^CN=([^,]+)/);
        return match ? match[1] : dn;
      });
    }

    res.json({
      name: comp.cn,
      dns_name: comp.dNSHostName,
      os: comp.operatingSystem,
      os_version: comp.operatingSystemVersion,
      os_sp: comp.operatingSystemServicePack,
      type: getComputerType(comp),
      ou: extractOU(comp.distinguishedName),
      dn: comp.distinguishedName,
      description: comp.description,
      location: comp.location,
      last_logon: lastLogon,
      is_active: isActive(lastLogon),
      created: parseADDate(comp.whenCreated),
      last_changed: parseADDate(comp.whenChanged),
      managed_by: managedByUser,
      assigned_user: assignedUser,
      groups,
      specs,
      is_enabled: comp.userAccountControl ? !(parseInt(comp.userAccountControl) & 0x0002) : true
    });
  } catch (error) {
    console.error('Error getting computer details:', error);
    if (client) try { client.unbind(); } catch(e) {}
    res.status(500).json({ error: error.message });
  }
};

// ───── Import Hardware Specs from PowerShell ─────
exports.importSpecs = async (req, res) => {
  try {
    const { computers } = req.body;
    
    if (!computers || !Array.isArray(computers)) {
      return res.status(400).json({ error: 'يجب إرسال مصفوفة computers' });
    }

    await ensureCacheTable();
    
    let updated = 0;
    let notFound = 0;
    const notFoundNames = [];

    for (const comp of computers) {
      if (!comp.name) continue;
      
      // Prepare disks JSON
      const disksJson = comp.disks ? JSON.stringify(comp.disks) : null;
      
      const result = await pool.query(`
        UPDATE ad_computers_cache SET
          processor = $2,
          ram_gb = $3,
          disk_size_gb = $4,
          disk_free_gb = $5,
          disks = $6,
          manufacturer = $7,
          model = $8,
          serial_number = $9,
          ip_address = $10,
          mac_address = $11,
          specs_updated_at = NOW()
        WHERE LOWER(computer_name) = LOWER($1)
      `, [
        comp.name,
        comp.processor || null,
        comp.ram_gb || null,
        comp.disk_size_gb || null,
        comp.disk_free_gb || null,
        disksJson,
        comp.manufacturer || null,
        comp.model || null,
        comp.serial_number || null,
        comp.ip_address || null,
        comp.mac_address || null
      ]);
      
      if (result.rowCount > 0) {
        updated++;
      } else {
        notFound++;
        notFoundNames.push(comp.name);
      }
    }

    console.log(`✅ Imported specs for ${updated} computers`);
    
    res.json({ 
      message: `تم تحديث مواصفات ${updated} جهاز`,
      updated,
      notFound,
      notFoundNames: notFoundNames.slice(0, 10) // Show first 10
    });
  } catch (error) {
    console.error('Error importing specs:', error);
    res.status(500).json({ error: 'حدث خطأ في استيراد المواصفات' });
  }
};

// ───── Generate PowerShell Script ─────
exports.getCollectorScript = async (req, res) => {
  try {
    // Get server URL - use the actual server IP
    let serverUrl = req.query.server || `${req.protocol}://${req.get('host')}`;
    
    // Get auth token from the request
    const token = req.headers.authorization?.replace('Bearer ', '') || 'YOUR_TOKEN_HERE';
    
    // Simple LOCAL-ONLY agent script
    const script = `# IT System Agent - Collects THIS computer's specs and sends to server
# Install: Create scheduled task to run at startup
# Run: powershell -ExecutionPolicy Bypass -File C:\\IT-Agent\\agent.ps1

$ServerUrl = "${serverUrl}"
$Token = "${token}"

# Ignore SSL
try {
    Add-Type @"
using System.Net;
using System.Security.Cryptography.X509Certificates;
public class TrustAllCertsPolicy : ICertificatePolicy {
    public bool CheckValidationResult(ServicePoint srvPoint, X509Certificate certificate, WebRequest request, int certificateProblem) { return true; }
}
"@
    [System.Net.ServicePointManager]::CertificatePolicy = New-Object TrustAllCertsPolicy
} catch {}
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

# Collect local specs
$ComputerName = $env:COMPUTERNAME
$CS = Get-WmiObject Win32_ComputerSystem
$CPU = Get-WmiObject Win32_Processor | Select -First 1
$BIOS = Get-WmiObject Win32_BIOS
$Net = Get-WmiObject Win32_NetworkAdapterConfiguration -Filter "IPEnabled=True" | Select -First 1

# Get ALL disks (not just C:)
$AllDisks = Get-WmiObject Win32_LogicalDisk -Filter "DriveType=3"
$DisksArray = @()
$TotalSize = 0
$TotalFree = 0
foreach ($d in $AllDisks) {
    $size = [math]::Round($d.Size / 1GB, 2)
    $free = [math]::Round($d.FreeSpace / 1GB, 2)
    $TotalSize += $size
    $TotalFree += $free
    $DisksArray += @{ drive = $d.DeviceID; size_gb = $size; free_gb = $free; label = $d.VolumeName }
}

$ipAddr = $null
if ($Net.IPAddress) { $ipAddr = ($Net.IPAddress | Where-Object { $_ -match '^[0-9]+\\.[0-9]+\\.[0-9]+\\.[0-9]+$' } | Select -First 1) }

$Spec = @{
    name = $ComputerName
    processor = $CPU.Name
    ram_gb = [math]::Round($CS.TotalPhysicalMemory / 1GB, 2)
    disk_size_gb = $TotalSize
    disk_free_gb = $TotalFree
    disks = $DisksArray
    manufacturer = $CS.Manufacturer
    model = $CS.Model
    serial_number = $BIOS.SerialNumber
    ip_address = $ipAddr
    mac_address = $Net.MACAddress
}

$Body = @{ computers = @($Spec) } | ConvertTo-Json -Depth 5
$Headers = @{ "Authorization" = "Bearer $Token"; "Content-Type" = "application/json" }

try {
    Invoke-RestMethod -Uri "$ServerUrl/api/ad/computers/import-specs" -Method POST -Headers $Headers -Body $Body -TimeoutSec 30 | Out-Null
} catch {
    # Silent fail for scheduled task
}
`;

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="IT-Agent.ps1"');
    res.send(script);
  } catch (error) {
    console.error('Error generating script:', error);
    res.status(500).json({ error: 'Error generating script' });
  }
};

// ───── Generate GPO Deployment Script ─────
exports.getGPOScript = async (req, res) => {
  try {
    let serverUrl = req.query.server || `${req.protocol}://${req.get('host')}`;
    const token = req.headers.authorization?.replace('Bearer ', '') || 'YOUR_TOKEN_HERE';
    
    const script = `@echo off
REM IT System Agent Installer - Deploy via GPO
REM Copy this to: \\\\domain\\NETLOGON\\IT-Agent-Install.bat

set INSTALL_DIR=C:\\IT-Agent
set SERVER_URL=${serverUrl}
set TOKEN=${token}

if not exist "%INSTALL_DIR%" mkdir "%INSTALL_DIR%"

REM Create the agent script
(
echo $ServerUrl = "%SERVER_URL%"
echo $Token = "%TOKEN%"
echo try { Add-Type @"
echo using System.Net;
echo using System.Security.Cryptography.X509Certificates;
echo public class TrustAllCertsPolicy : ICertificatePolicy {
echo     public bool CheckValidationResult^(ServicePoint srvPoint, X509Certificate certificate, WebRequest request, int certificateProblem^) { return true; }
echo }
echo "@
echo [System.Net.ServicePointManager]::CertificatePolicy = New-Object TrustAllCertsPolicy
echo } catch {}
echo [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
echo $CS = Get-WmiObject Win32_ComputerSystem
echo $CPU = Get-WmiObject Win32_Processor ^| Select -First 1
echo $BIOS = Get-WmiObject Win32_BIOS
echo $Disk = Get-WmiObject Win32_LogicalDisk -Filter "DeviceID='C:'"
echo $Net = Get-WmiObject Win32_NetworkAdapterConfiguration -Filter "IPEnabled=True" ^| Select -First 1
echo $ipAddr = $null
echo if ^($Net.IPAddress^) { $ipAddr = ^($Net.IPAddress ^| Where-Object { $_ -match '^[0-9]+\\.[0-9]+\\.[0-9]+\\.[0-9]+$' } ^| Select -First 1^) }
echo $Spec = @{ name = $env:COMPUTERNAME; processor = $CPU.Name; ram_gb = [math]::Round^($CS.TotalPhysicalMemory / 1GB, 2^); disk_size_gb = [math]::Round^($Disk.Size / 1GB, 2^); disk_free_gb = [math]::Round^($Disk.FreeSpace / 1GB, 2^); manufacturer = $CS.Manufacturer; model = $CS.Model; serial_number = $BIOS.SerialNumber; ip_address = $ipAddr; mac_address = $Net.MACAddress }
echo $Body = @{ computers = @^($Spec^) } ^| ConvertTo-Json -Depth 5
echo try { Invoke-RestMethod -Uri "$ServerUrl/api/ad/computers/import-specs" -Method POST -Headers @{ "Authorization" = "Bearer $Token"; "Content-Type" = "application/json" } -Body $Body -TimeoutSec 30 ^| Out-Null } catch {}
) > "%INSTALL_DIR%\\agent.ps1"

REM Create scheduled task (runs at startup and every 6 hours)
schtasks /create /tn "IT-System-Agent" /tr "powershell -ExecutionPolicy Bypass -WindowStyle Hidden -File %INSTALL_DIR%\\agent.ps1" /sc onstart /ru SYSTEM /f
schtasks /create /tn "IT-System-Agent-Update" /tr "powershell -ExecutionPolicy Bypass -WindowStyle Hidden -File %INSTALL_DIR%\\agent.ps1" /sc daily /st 08:00 /ru SYSTEM /f

REM Run now
powershell -ExecutionPolicy Bypass -WindowStyle Hidden -File "%INSTALL_DIR%\\agent.ps1"

echo IT Agent installed successfully
`;

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="IT-Agent-Install.bat"');
    res.send(script);
  } catch (error) {
    res.status(500).json({ error: 'Error generating script' });
  }
};
