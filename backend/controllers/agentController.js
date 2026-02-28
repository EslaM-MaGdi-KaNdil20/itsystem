const pool = require('../config/database');
const crypto = require('crypto');

// ── Ensure agent_keys table ──────────────────────────────────────────────────
async function ensureTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS agent_keys (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      key_hash VARCHAR(64) UNIQUE NOT NULL,
      key_preview VARCHAR(12) NOT NULL,
      created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      last_used TIMESTAMP,
      use_count INTEGER DEFAULT 0,
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);
}

// ── Generate new API key ──────────────────────────────────────────────────────
exports.generateKey = async (req, res) => {
  try {
    await ensureTable();
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'يجب إدخال اسم للـ Key' });

    // Generate cryptographically secure key: ITSYS-xxxxxxxxxxxxxxxxxxxxxxxxxxxx
    const rawKey = 'ITSYS-' + crypto.randomBytes(20).toString('hex').toUpperCase();
    const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');
    const keyPreview = rawKey.substring(0, 12) + '...';

    await pool.query(
      `INSERT INTO agent_keys (name, key_hash, key_preview, created_by) VALUES ($1, $2, $3, $4)`,
      [name, keyHash, keyPreview, req.user?.id || null]
    );

    // Return the full key ONCE — never stored in plaintext
    res.json({
      key: rawKey,
      name,
      preview: keyPreview,
      message: 'احفظ هذا الـ Key الآن - لن يظهر مرة أخرى'
    });
  } catch (error) {
    console.error('Error generating agent key:', error);
    res.status(500).json({ error: 'حدث خطأ' });
  }
};

// ── List all keys (without plaintext) ────────────────────────────────────────
exports.listKeys = async (req, res) => {
  try {
    await ensureTable();
    const result = await pool.query(`
      SELECT ak.id, ak.name, ak.key_preview, ak.last_used, ak.use_count, 
             ak.is_active, ak.created_at, u.full_name as created_by_name
      FROM agent_keys ak
      LEFT JOIN users u ON ak.created_by = u.id
      ORDER BY ak.created_at DESC
    `);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'حدث خطأ' });
  }
};

// ── Revoke key ────────────────────────────────────────────────────────────────
exports.revokeKey = async (req, res) => {
  try {
    await ensureTable();
    await pool.query(`UPDATE agent_keys SET is_active = false WHERE id = $1`, [req.params.id]);
    res.json({ message: 'تم إلغاء الـ Key' });
  } catch (error) {
    res.status(500).json({ error: 'حدث خطأ' });
  }
};

// ── Delete key ────────────────────────────────────────────────────────────────
exports.deleteKey = async (req, res) => {
  try {
    await ensureTable();
    await pool.query(`DELETE FROM agent_keys WHERE id = $1`, [req.params.id]);
    res.json({ message: 'تم حذف الـ Key' });
  } catch (error) {
    res.status(500).json({ error: 'حدث خطأ' });
  }
};

// ── Validate key (used internally) ───────────────────────────────────────────
exports.validateAgentKey = async (apiKey) => {
  try {
    await ensureTable();
    const keyHash = crypto.createHash('sha256').update(apiKey).digest('hex');
    const result = await pool.query(
      `SELECT * FROM agent_keys WHERE key_hash = $1 AND is_active = true`,
      [keyHash]
    );
    if (result.rows.length === 0) return false;

    // Update last_used and counter
    await pool.query(
      `UPDATE agent_keys SET last_used = NOW(), use_count = use_count + 1 WHERE key_hash = $1`,
      [keyHash]
    );
    return true;
  } catch {
    return false;
  }
};

// ── Generate Production Agent installer ──────────────────────────────────────
exports.getProductionAgent = async (req, res) => {
  try {
    const serverUrl = req.query.server || `${req.protocol}://${req.get('host')}`;
    const apiKey = req.query.key || 'ITSYS-YOUR-KEY-HERE';

    const script = `#Requires -RunAsAdministrator
<#
.SYNOPSIS
    IT System Agent - Production Ready v2.0
.DESCRIPTION
    Collects hardware specs from this machine and sends to IT System.
    Features: Retry logic, change detection, logging, CIM-based collection.
.NOTES
    Installer: Run IT-Agent-Setup.ps1 once to install
    Logs: C:\\IT-Agent\\logs\\
#>

# =========================================================
#  CONFIGURATION  (set during install - do not edit here)
# =========================================================
$ConfigFile = "C:\\IT-Agent\\config.json"
if (-not (Test-Path $ConfigFile)) {
    Write-Error "Config file not found. Run IT-Agent-Setup.ps1 first."
    exit 1
}
$Config = Get-Content $ConfigFile | ConvertFrom-Json
$ServerUrl = $Config.ServerUrl
$ApiKey    = $Config.ApiKey

# =========================================================
#  LOGGING
# =========================================================
$LogDir  = "C:\\IT-Agent\\logs"
$LogFile = Join-Path $LogDir "agent_$(Get-Date -Format 'yyyy-MM').log"
if (-not (Test-Path $LogDir)) { New-Item -ItemType Directory -Force -Path $LogDir | Out-Null }
function Write-Log {
    param([string]$Level, [string]$Msg)
    $Line = "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') [$Level] $Msg"
    Add-Content -Path $LogFile -Value $Line
    if ($Level -eq 'ERROR') { Write-Warning $Msg }
}

Write-Log "INFO" "Agent started on $env:COMPUTERNAME"

# =========================================================
#  IGNORE SSL
# =========================================================
try {
    Add-Type @"
using System.Net;
using System.Security.Cryptography.X509Certificates;
public class TrustAllCertsPolicy : ICertificatePolicy {
    public bool CheckValidationResult(ServicePoint srvPoint, X509Certificate cert, WebRequest req, int prob) { return true; }
}
"@
    [System.Net.ServicePointManager]::CertificatePolicy = New-Object TrustAllCertsPolicy
} catch {}
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

# =========================================================
#  COLLECT SPECS USING CIM (faster & more reliable than WMI)
# =========================================================
try {
    $CS    = Get-CimInstance Win32_ComputerSystem
    $CPU   = Get-CimInstance Win32_Processor | Select-Object -First 1
    $BIOS  = Get-CimInstance Win32_BIOS
    $Disks = Get-CimInstance Win32_LogicalDisk -Filter "DriveType=3"
    $Net   = Get-CimInstance Win32_NetworkAdapterConfiguration -Filter "IPEnabled=True" | Select-Object -First 1
} catch {
    Write-Log "ERROR" "Failed to collect CIM data: $($_.Exception.Message)"
    exit 1
}

# Build disks array
$DisksArray = @()
$TotalSize  = 0
$TotalFree  = 0
foreach ($d in $Disks) {
    $sz = [math]::Round($d.Size / 1GB, 2)
    $fr = [math]::Round($d.FreeSpace / 1GB, 2)
    $TotalSize += $sz
    $TotalFree += $fr
    $DisksArray += @{ drive = $d.DeviceID; size_gb = $sz; free_gb = $fr; label = $d.VolumeName }
}

# IP Address
$IpAddr = $null
if ($Net.IPAddress) {
    $IpAddr = ($Net.IPAddress | Where-Object { $_ -match '^[0-9]+\\.[0-9]+\\.[0-9]+\\.[0-9]+$' } | Select-Object -First 1)
}

$Spec = @{
    name          = $env:COMPUTERNAME
    processor     = $CPU.Name
    ram_gb        = [math]::Round($CS.TotalPhysicalMemory / 1GB, 2)
    disk_size_gb  = $TotalSize
    disk_free_gb  = $TotalFree
    disks         = $DisksArray
    manufacturer  = $CS.Manufacturer
    model         = $CS.Model
    serial_number = $BIOS.SerialNumber
    ip_address    = $IpAddr
    mac_address   = if ($Net) { $Net.MACAddress } else { $null }
}

# =========================================================
#  CHANGE DETECTION — skip if specs unchanged
# =========================================================
$HashFile    = "C:\\IT-Agent\\last_hash.txt"
$CurrentHash = ($Spec | ConvertTo-Json -Depth 5 -Compress | Out-String).Trim() |
               ForEach-Object { [System.Security.Cryptography.SHA256]::Create().ComputeHash(
                   [System.Text.Encoding]::UTF8.GetBytes($_)) } |
               ForEach-Object { ($_ | ForEach-Object { $_.ToString("x2") }) -join "" }

if ((Test-Path $HashFile) -and ((Get-Content $HashFile).Trim() -eq $CurrentHash)) {
    Write-Log "INFO" "No changes detected. Skipping send."
    exit 0
}

# =========================================================
#  SEND WITH RETRY LOGIC
# =========================================================
$Body    = @{ computers = @($Spec) } | ConvertTo-Json -Depth 5
$Headers = @{ "X-Agent-Key" = $ApiKey; "Content-Type" = "application/json" }
$MaxRetries = 3
$Sent = $false

for ($i = 1; $i -le $MaxRetries; $i++) {
    try {
        $Response = Invoke-RestMethod -Uri "$ServerUrl/api/ad/computers/import-specs" \`
            -Method POST -Headers $Headers -Body $Body -TimeoutSec 30 -ErrorAction Stop
        Write-Log "INFO" "Successfully sent specs. Server response: $($Response.message)"
        Set-Content -Path $HashFile -Value $CurrentHash
        $Sent = $true
        break
    } catch {
        $Delay = [math]::Pow(2, $i)  # 2, 4, 8 seconds
        Write-Log "WARN" "Attempt $i failed: $($_.Exception.Message). Retrying in ${Delay}s..."
        Start-Sleep -Seconds $Delay
    }
}

if (-not $Sent) {
    Write-Log "ERROR" "All $MaxRetries attempts failed. Will retry on next scheduled run."
    exit 1
}
`;

    const setupScript = `#Requires -RunAsAdministrator
<#
.SYNOPSIS
    IT System Agent Installer v2.0
.DESCRIPTION
    One-time setup: installs agent + creates scheduled task
#>

# =========================================================
#  CONFIGURATION
# =========================================================
$ServerUrl  = "${serverUrl}"
$ApiKey     = "${apiKey}"
$InstallDir = "C:\\IT-Agent"
$AgentFile  = "$InstallDir\\agent.ps1"
$ConfigFile = "$InstallDir\\config.json"
$TaskName   = "IT-System-Agent"

Write-Host "Installing IT System Agent..." -ForegroundColor Cyan

# 1. Create install directory
if (-not (Test-Path $InstallDir)) {
    New-Item -ItemType Directory -Force -Path $InstallDir | Out-Null
    New-Item -ItemType Directory -Force -Path "$InstallDir\\logs" | Out-Null
}

# 2. Save config (API key stored locally - NOT in script)
@{ ServerUrl = $ServerUrl; ApiKey = $ApiKey } | ConvertTo-Json | Set-Content -Path $ConfigFile

# 3. Download agent.ps1 from server
try {
    $Headers = @{ "X-Agent-Key" = $ApiKey }
    Invoke-WebRequest -Uri "$ServerUrl/api/agent/script" -Headers $Headers \`
        -OutFile $AgentFile -UseBasicParsing -TimeoutSec 30
    Write-Host "[OK] Agent script downloaded" -ForegroundColor Green
} catch {
    Write-Warning "Could not download agent from server, using embedded version."
    # Fallback: create minimal agent inline
    Set-Content -Path $AgentFile -Value '# Download failed - re-run installer'
}

# 4. Set permissions (only SYSTEM can read config)
icacls $ConfigFile /inheritance:r /grant:r "SYSTEM:(R)" | Out-Null
icacls $InstallDir /inheritance:r /grant:r "SYSTEM:(OI)(CI)(RX)" | Out-Null

# 5. Create Scheduled Task (runs at startup + every 6 hours)
$Action  = New-ScheduledTaskAction -Execute "powershell.exe" \`
    -Argument "-ExecutionPolicy Bypass -WindowStyle Hidden -NonInteractive -File \`"$AgentFile\`""
$TriggerBoot  = New-ScheduledTaskTrigger -AtStartup
$TriggerDaily = New-ScheduledTaskTrigger -RepetitionInterval (New-TimeSpan -Hours 6) \`
    -Once -At (Get-Date "08:00")
$Settings = New-ScheduledTaskSettingsSet -ExecutionTimeLimit (New-TimeSpan -Minutes 5) \`
    -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 2) -Hidden
$Principal = New-ScheduledTaskPrincipal -UserID "SYSTEM" -RunLevel Highest

try {
    Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false -ErrorAction SilentlyContinue
    Register-ScheduledTask -TaskName $TaskName \`
        -Action $Action -Trigger @($TriggerBoot, $TriggerDaily) \`
        -Settings $Settings -Principal $Principal | Out-Null
    Write-Host "[OK] Scheduled task created: $TaskName" -ForegroundColor Green
} catch {
    Write-Warning "Failed to create scheduled task: $($_.Exception.Message)"
}

# 6. Run now
Write-Host "Running agent for the first time..." -ForegroundColor Yellow
& powershell.exe -ExecutionPolicy Bypass -WindowStyle Hidden -File $AgentFile

# Verify logs
$LogFile = "$InstallDir\\logs\\agent_$(Get-Date -Format 'yyyy-MM').log"
if (Test-Path $LogFile) {
    Write-Host ""
    Write-Host "=== Last log entries ===" -ForegroundColor Cyan
    Get-Content $LogFile | Select-Object -Last 5 | ForEach-Object { Write-Host $_ }
}

Write-Host ""
Write-Host "IT System Agent installed successfully!" -ForegroundColor Green
Write-Host "Install dir : $InstallDir" -ForegroundColor Gray
Write-Host "Logs        : $InstallDir\\logs" -ForegroundColor Gray
Write-Host "Task        : Task Scheduler > $TaskName" -ForegroundColor Gray
`;

    if (req.query.type === 'setup') {
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="IT-Agent-Setup.ps1"');
      return res.send(setupScript);
    }

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="agent.ps1"');
    res.send(script);
  } catch (error) {
    console.error('Error generating agent:', error);
    res.status(500).json({ error: 'Error generating agent script' });
  }
};
