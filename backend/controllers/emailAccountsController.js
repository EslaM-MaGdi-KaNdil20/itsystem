const pool = require('../config/database');
const { logActivity, ACTIONS, ENTITIES } = require('./activityLogController');

// Get all email accounts
exports.getAllEmailAccounts = async (req, res) => {
  try {
    const { status, email_type } = req.query;
    
    let query = `
      SELECT ea.*, 
        e.full_name as employee_name,
        e.department_id as employee_department
      FROM email_accounts ea
      LEFT JOIN employees e ON ea.employee_id = e.id
      WHERE 1=1
    `;
    const params = [];
    
    if (status) {
      params.push(status);
      query += ` AND ea.status = $${params.length}`;
    }
    if (email_type) {
      params.push(email_type);
      query += ` AND ea.email_type = $${params.length}`;
    }
    
    query += ' ORDER BY ea.email_address ASC';
    
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching email accounts:', error);
    res.status(500).json({ error: 'حدث خطأ في جلب حسابات البريد' });
  }
};

// Get email account by ID
exports.getEmailAccountById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM email_accounts WHERE id = $1', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'حساب البريد غير موجود' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching email account:', error);
    res.status(500).json({ error: 'حدث خطأ في جلب حساب البريد' });
  }
};

// Create email account
exports.createEmailAccount = async (req, res) => {
  try {
    const {
      email_address, employee_id, email_type, password_encrypted,
      server_incoming, server_outgoing, quota_mb, quota_used_mb, notes, status
    } = req.body;
    
    // Check if email already exists
    const existingEmail = await pool.query('SELECT id FROM email_accounts WHERE email_address = $1', [email_address]);
    if (existingEmail.rows.length > 0) {
      return res.status(400).json({ error: 'حساب البريد موجود بالفعل' });
    }
    
    const result = await pool.query(`
      INSERT INTO email_accounts (
        email_address, employee_id, email_type, password_encrypted,
        server_incoming, server_outgoing, quota_mb, quota_used_mb, notes, status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `, [
      email_address, employee_id, email_type || 'work', password_encrypted,
      server_incoming, server_outgoing, quota_mb, quota_used_mb || 0, notes, status || 'active'
    ]);
    
    res.status(201).json({
      message: 'تم إضافة حساب البريد بنجاح',
      emailAccount: result.rows[0]
    });
    
    // Log activity
    logActivity(req, ACTIONS.CREATE, ENTITIES.EMAIL_ACCOUNT, result.rows[0].id, 
      email_address, `تم إضافة حساب بريد جديد: ${email_address}`);
  } catch (error) {
    console.error('Error creating email account:', error);
    res.status(500).json({ error: 'حدث خطأ في إضافة حساب البريد' });
  }
};

// Update email account
exports.updateEmailAccount = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      email_address, employee_id, email_type, password_encrypted,
      server_incoming, server_outgoing, quota_mb, quota_used_mb, notes, status
    } = req.body;
    
    const result = await pool.query(`
      UPDATE email_accounts SET
        email_address = COALESCE($1, email_address),
        employee_id = $2,
        email_type = COALESCE($3, email_type),
        password_encrypted = COALESCE($4, password_encrypted),
        server_incoming = COALESCE($5, server_incoming),
        server_outgoing = COALESCE($6, server_outgoing),
        quota_mb = COALESCE($7, quota_mb),
        quota_used_mb = COALESCE($8, quota_used_mb),
        notes = COALESCE($9, notes),
        status = COALESCE($10, status),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $11
      RETURNING *
    `, [email_address, employee_id || null, email_type, password_encrypted,
        server_incoming, server_outgoing, quota_mb, quota_used_mb, notes, status, id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'حساب البريد غير موجود' });
    }
    
    // Log activity
    logActivity(req, ACTIONS.UPDATE, ENTITIES.EMAIL_ACCOUNT, id, 
      result.rows[0].email_address, `تم تحديث حساب البريد: ${result.rows[0].email_address}`);
    
    res.json({ message: 'تم تحديث حساب البريد بنجاح', emailAccount: result.rows[0] });
  } catch (error) {
    console.error('Error updating email account:', error);
    res.status(500).json({ error: 'حدث خطأ في تحديث حساب البريد' });
  }
};

// Delete email account
exports.deleteEmailAccount = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get email address before delete
    const email = await pool.query('SELECT email_address FROM email_accounts WHERE id = $1', [id]);
    const emailAddr = email.rows[0]?.email_address || `بريد #${id}`;
    
    await pool.query('DELETE FROM email_accounts WHERE id = $1', [id]);
    
    // Log activity
    logActivity(req, ACTIONS.DELETE, ENTITIES.EMAIL_ACCOUNT, id, 
      emailAddr, `تم حذف حساب البريد: ${emailAddr}`);
    
    res.json({ message: 'تم حذف حساب البريد بنجاح' });
  } catch (error) {
    console.error('Error deleting email account:', error);
    res.status(500).json({ error: 'حدث خطأ في حذف حساب البريد' });
  }
};

// Get email stats
exports.getEmailStats = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        COUNT(*) as total_accounts,
        COUNT(*) FILTER (WHERE status = 'active') as active_accounts,
        COUNT(*) FILTER (WHERE status = 'inactive') as inactive_accounts,
        COUNT(*) FILTER (WHERE status = 'suspended') as suspended_accounts,
        COUNT(DISTINCT email_type) as email_types_count
      FROM email_accounts
    `);
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching email stats:', error);
    res.status(500).json({ error: 'حدث خطأ في جلب الإحصائيات' });
  }
};

// Get departments
exports.getDepartments = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT email_type, COUNT(*) as count
      FROM email_accounts
      WHERE email_type IS NOT NULL
      GROUP BY email_type
      ORDER BY email_type
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching email types:', error);
    res.status(500).json({ error: 'حدث خطأ في جلب أنواع البريد' });
  }
};

// ───────────── Link email to employee ─────────────
exports.linkEmployee = async (req, res) => {
  try {
    const { id } = req.params;
    const { employee_id } = req.body;

    const result = await pool.query(`
      UPDATE email_accounts SET employee_id = $1, updated_at = NOW()
      WHERE id = $2 RETURNING *
    `, [employee_id, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'حساب البريد غير موجود' });
    }

    // Also update employee's email field if linking
    if (employee_id) {
      const emailAddr = result.rows[0].email_address;
      await pool.query(`
        UPDATE employees SET email = $1 WHERE id = $2 AND (email IS NULL OR email = '')
      `, [emailAddr, employee_id]);
    }

    res.json({ message: 'تم ربط الموظف بنجاح', emailAccount: result.rows[0] });
  } catch (error) {
    console.error('Error linking employee:', error);
    res.status(500).json({ error: 'حدث خطأ في ربط الموظف' });
  }
};

// ───────────── Unlink email from employee ─────────────
exports.unlinkEmployee = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(`
      UPDATE email_accounts SET employee_id = NULL, updated_at = NOW()
      WHERE id = $1 RETURNING *
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'حساب البريد غير موجود' });
    }

    res.json({ message: 'تم فك الربط بنجاح', emailAccount: result.rows[0] });
  } catch (error) {
    console.error('Error unlinking employee:', error);
    res.status(500).json({ error: 'حدث خطأ في فك الربط' });
  }
};

// ───────────── Smart auto-link all unlinked emails ─────────────
// Levenshtein distance for fuzzy matching
function levenshtein(a, b) {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  const matrix = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      const cost = a[j - 1] === b[i - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }
  return matrix[b.length][a.length];
}

// Check if two strings are similar (Levenshtein distance <= threshold)
function isSimilar(a, b, threshold) {
  if (!a || !b) return false;
  const al = a.toLowerCase(), bl = b.toLowerCase();
  if (al === bl) return true;
  // For short strings, allow fewer edits
  const maxDist = threshold || Math.max(1, Math.floor(Math.min(al.length, bl.length) / 3));
  return levenshtein(al, bl) <= maxDist;
}

// Check if two name parts match with fuzzy tolerance
function partsMatch(a, b) {
  if (!a || !b) return false;
  const al = a.toLowerCase(), bl = b.toLowerCase();
  if (al === bl) return true;
  // Only allow substring match when lengths are very similar
  const lenRatio = Math.min(al.length, bl.length) / Math.max(al.length, bl.length);
  if (lenRatio >= 0.7 && (al.includes(bl) || bl.includes(al))) return true;
  // Allow 1-2 char difference for transliteration (hader/hadeer, abdullah/abdallah)
  return isSimilar(al, bl, Math.max(1, Math.floor(Math.min(al.length, bl.length) / 3)));
}

exports.autoLinkAll = async (req, res) => {
  try {
    // Get all unlinked emails
    const unlinkedResult = await pool.query(`
      SELECT id, email_address FROM email_accounts WHERE employee_id IS NULL
    `);

    // Get all employees with AD info
    const employeesResult = await pool.query(`
      SELECT e.id, e.full_name, e.email, e.ad_guid, e.employee_code,
             a.sam_account_name as ad_username, a.display_name as ad_display_name
      FROM employees e
      LEFT JOIN ad_users a ON e.ad_guid = a.ad_guid OR e.employee_code = a.sam_account_name
    `);
    const employees = employeesResult.rows;

    // Also get ALL AD users for indirect matching (employee may not be linked to AD yet)
    const adUsersResult = await pool.query(`
      SELECT id, sam_account_name, display_name, local_employee_id FROM ad_users
    `);
    const adUsers = adUsersResult.rows;

    let linked = 0;
    const linkResults = [];

    for (const emailAccount of unlinkedResult.rows) {
      const emailAddr = emailAccount.email_address.toLowerCase();
      const emailUser = emailAddr.split('@')[0].replace(/[._-]/g, ' ').trim();
      const emailUserRaw = emailAddr.split('@')[0].toLowerCase(); // e.g. hader.sherif

      let bestMatch = null;
      let bestScore = 0;
      let matchMethod = '';

      for (const emp of employees) {
        // Method 1: Exact email match — score 100
        if (emp.email && emp.email.toLowerCase() === emailAddr) {
          bestMatch = emp;
          bestScore = 100;
          matchMethod = 'exact_email';
          break;
        }

        // Skip employees with empty names for fuzzy matching
        if (!emp.full_name || emp.full_name.trim().length < 2) continue;

        // Method 2: AD username match (e.g. hadeer.sherif ≈ hader.sherif)
        const adUsername = (emp.ad_username || emp.employee_code || '').toLowerCase();
        if (adUsername && adUsername.length > 2) {
          // Compare email username with AD username using fuzzy match
          const adParts = adUsername.replace(/[._-]/g, ' ').split(/\s+/).filter(p => p.length > 1);
          const emailParts = emailUser.split(/\s+/).filter(p => p.length > 1);
          
          if (adParts.length > 0 && emailParts.length > 0) {
            // Check if all parts match with fuzzy tolerance
            const matchedParts = adParts.filter(ap => 
              emailParts.some(ep => partsMatch(ap, ep))
            );
            const reverseMatched = emailParts.filter(ep =>
              adParts.some(ap => partsMatch(ap, ep))
            );
            
            if (matchedParts.length === adParts.length && reverseMatched.length === emailParts.length) {
              const score = 90; // High score for AD username match
              if (score > bestScore) {
                bestScore = score;
                bestMatch = emp;
                matchMethod = 'ad_username_fuzzy';
              }
            }
          }
        }

        // Method 3: AD display name match (e.g. "Hadeer Sherif" vs email "hader.sherif")
        const adDisplayName = (emp.ad_display_name || '').toLowerCase().trim();
        if (adDisplayName && adDisplayName.length > 2 && bestScore < 85) {
          const adNameParts = adDisplayName.split(/\s+/).filter(p => p.length > 1);
          const emailParts = emailUser.split(/\s+/).filter(p => p.length > 1);
          
          if (adNameParts.length > 0 && emailParts.length > 0) {
            const matched = adNameParts.filter(ap => 
              emailParts.some(ep => partsMatch(ap, ep))
            );
            if (matched.length >= Math.min(2, adNameParts.length)) {
              const score = 85;
              if (score > bestScore) {
                bestScore = score;
                bestMatch = emp;
                matchMethod = 'ad_displayname_fuzzy';
              }
            }
          }
        }

        // Method 4: Employee full_name match (works when name is in Latin script)
        const empName = (emp.full_name || '').toLowerCase().trim();
        if (!empName || empName.length < 3) continue;

        const nameParts = empName.split(/\s+/).filter(p => p.length > 2);
        const emailParts2 = emailUser.split(/\s+/).filter(p => p.length > 2);

        if (nameParts.length === 0 || emailParts2.length === 0) continue;

        // Fuzzy match name parts against email parts
        const matchedNameParts = nameParts.filter(part => 
          emailParts2.some(ep => partsMatch(part, ep))
        );
        const matchedEmailParts = emailParts2.filter(part => 
          nameParts.some(np => partsMatch(np, part))
        );

        const nameMatchRatio = matchedNameParts.length / nameParts.length;
        const emailMatchRatio = matchedEmailParts.length / emailParts2.length;

        if (nameParts.length <= 2) {
          if (matchedNameParts.length === nameParts.length && emailMatchRatio >= 0.5) {
            const score = 50 + (matchedNameParts.length * 10) + (matchedEmailParts.length * 10);
            if (score > bestScore) {
              bestScore = score;
              bestMatch = emp;
              matchMethod = 'name_fuzzy';
            }
          }
        } else {
          if (matchedNameParts.length >= 2 && matchedEmailParts.length >= 1) {
            const score = 30 + (nameMatchRatio * 40) + (emailMatchRatio * 20);
            if (score > bestScore) {
              bestScore = score;
              bestMatch = emp;
              matchMethod = 'name_fuzzy';
            }
          }
        }
      }

      // Method 5: Indirect AD matching — find AD user by similar username, then link via their employee
      if (!bestMatch || bestScore < 80) {
        for (const adUser of adUsers) {
          if (!adUser.sam_account_name) continue;
          const adSam = adUser.sam_account_name.toLowerCase();
          const adParts = adSam.replace(/[._-]/g, ' ').split(/\s+/).filter(p => p.length > 1);
          const emailParts = emailUser.split(/\s+/).filter(p => p.length > 1);
          
          if (adParts.length === 0 || emailParts.length === 0) continue;
          
          const matched = adParts.filter(ap => emailParts.some(ep => partsMatch(ap, ep)));
          const reverse = emailParts.filter(ep => adParts.some(ap => partsMatch(ap, ep)));
          
          if (matched.length === adParts.length && reverse.length === emailParts.length) {
            // Found matching AD user — find linked employee
            if (adUser.local_employee_id) {
              const emp = employees.find(e => e.id === adUser.local_employee_id);
              if (emp) {
                const score = 88;
                if (score > bestScore) {
                  bestScore = score;
                  bestMatch = emp;
                  matchMethod = 'ad_indirect';
                }
              }
            } else {
              // AD user exists but no employee link — try to find employee with same name
              const adName = (adUser.display_name || '').toLowerCase().trim();
              if (adName) {
                for (const emp of employees) {
                  const empName = (emp.full_name || '').toLowerCase().trim();
                  if (empName === adName || isSimilar(empName, adName, 2)) {
                    const score = 82;
                    if (score > bestScore) {
                      bestScore = score;
                      bestMatch = emp;
                      matchMethod = 'ad_indirect_name';
                    }
                  }
                }
              }
            }
          }
        }
      }

      if (bestMatch && bestScore >= 50) {
        const alreadyLinked = await pool.query(
          'SELECT id, email_address FROM email_accounts WHERE employee_id = $1',
          [bestMatch.id]
        );

        await pool.query(
          'UPDATE email_accounts SET employee_id = $1, updated_at = NOW() WHERE id = $2',
          [bestMatch.id, emailAccount.id]
        );

        if (!bestMatch.email || bestMatch.email === '') {
          await pool.query(
            "UPDATE employees SET email = $1 WHERE id = $2 AND (email IS NULL OR email = '')",
            [emailAddr, bestMatch.id]
          );
        }

        linked++;
        linkResults.push({
          email: emailAccount.email_address,
          employee: bestMatch.full_name,
          score: bestScore,
          method: matchMethod,
          alreadyHad: alreadyLinked.rows.length > 0 ? alreadyLinked.rows[0].email_address : null
        });
      }
    }

    res.json({
      message: `تم ربط ${linked} حساب بريد تلقائياً`,
      linked,
      total_unlinked: unlinkedResult.rows.length,
      results: linkResults
    });
  } catch (error) {
    console.error('Error auto-linking:', error);
    res.status(500).json({ error: 'حدث خطأ في الربط التلقائي' });
  }
};
