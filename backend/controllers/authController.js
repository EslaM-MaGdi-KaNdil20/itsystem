const pool = require('../config/database');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { logActivity, ACTIONS, ENTITIES } = require('./activityLogController');
const adController = require('./adController');

// Multer setup for avatars
const avatarStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../uploads/avatars');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `avatar_${req.user.id}_${Date.now()}${ext}`);
  }
});
const uploadAvatarMiddleware = multer({
  storage: avatarStorage,
  limits: { fileSize: 3 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (/^image\/(jpeg|png|gif|webp)$/.test(file.mimetype)) cb(null, true);
    else cb(new Error('صيغة الصورة غير مدعومة'));
  }
});

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'البريد الإلكتروني وكلمة المرور مطلوبان' 
      });
    }

    // Find user (by email or AD username)
    let result = await pool.query(
      'SELECT * FROM users WHERE email = $1 OR ad_username = $1',
      [email]
    );

    // If not found locally, try AD login
    if (result.rows.length === 0) {
      try {
        const adResult = await adController.adLogin(email, password);
        if (adResult.success) {
          // Check if there's a linked local user by ad_guid
          result = await pool.query('SELECT * FROM users WHERE ad_guid = $1', [adResult.adUser.guid]);
          
          if (result.rows.length === 0) {
            // Auto-create if AD config allows it
            const adConfig = (await pool.query('SELECT auto_create_users, default_role FROM ad_config WHERE id = 1')).rows[0];
            if (adConfig?.auto_create_users) {
              const hashedPw = await bcrypt.hash(password, 10);
              const newUser = await pool.query(`
                INSERT INTO users (email, password, full_name, role, ad_guid, is_ad_user, ad_username)
                VALUES ($1, $2, $3, $4, $5, true, $6)
                RETURNING *
              `, [adResult.adUser.email, hashedPw, adResult.adUser.displayName,
                  adConfig.default_role || 'user', adResult.adUser.guid, adResult.adUser.username]);
              result = { rows: [newUser.rows[0]] };
            } else {
              return res.status(404).json({
                success: false,
                errorType: 'AD_USER_NOT_LINKED',
                message: 'تم التحقق من AD بنجاح لكن المستخدم غير مربوط بالنظام. تواصل مع المدير.'
              });
            }
          }
          // AD auth succeeded — skip local password check
          const user = result.rows[0];
          if (user.is_active === false) {
            return res.status(403).json({ success: false, errorType: 'ACCOUNT_DISABLED', message: 'هذا الحساب موقوف، تواصل مع المدير' });
          }
          // Update password hash to match AD password
          const newHash = await bcrypt.hash(password, 10);
          await pool.query('UPDATE users SET password = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [newHash, user.id]);

          const permissions = user.permissions || {};
          const token = jwt.sign(
            { id: user.id, email: user.email, full_name: user.full_name, role: user.role, permissions },
            process.env.JWT_SECRET, { expiresIn: '24h' }
          );
          req.user = { id: user.id, full_name: user.full_name, email: user.email };
          logActivity(req, ACTIONS.LOGIN, ENTITIES.USER, user.id, user.full_name, `تسجيل دخول عبر AD: ${user.full_name}`);
          return res.json({
            success: true, message: 'تم تسجيل الدخول عبر Active Directory', token,
            user: { id: user.id, email: user.email, full_name: user.full_name, role: user.role, phone: user.phone, is_active: user.is_active, permissions: user.permissions || {}, created_at: user.created_at, is_ad_user: true }
          });
        }
      } catch (adErr) {
        // AD not configured or failed — fall through to normal error
        console.log('AD login attempt failed:', adErr.message || adErr);
      }

      return res.status(404).json({ 
        success: false, 
        errorType: 'USER_NOT_FOUND',
        message: 'هذا المستخدم غير مسجل في النظام' 
      });
    }

    const user = result.rows[0];

    // Check if account is active
    if (user.is_active === false) {
      return res.status(403).json({
        success: false,
        errorType: 'ACCOUNT_DISABLED',
        message: 'هذا الحساب موقوف، تواصل مع المدير'
      });
    }

    // For AD users, try AD authentication first, fallback to local
    if (user.is_ad_user) {
      try {
        const adResult = await adController.adLogin(user.ad_username || email, password);
        if (adResult.success) {
          // AD auth succeeded — update local password hash
          const newHash = await bcrypt.hash(password, 10);
          await pool.query('UPDATE users SET password = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [newHash, user.id]);
          // Continue to token generation below
        } else {
          // AD auth failed — try local password as fallback
          const isValidPassword = await bcrypt.compare(password, user.password);
          if (!isValidPassword) {
            return res.status(401).json({ success: false, errorType: 'WRONG_PASSWORD', message: 'كلمة المرور غير صحيحة' });
          }
        }
      } catch (adErr) {
        // AD unavailable — fallback to local auth
        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
          return res.status(401).json({ success: false, errorType: 'WRONG_PASSWORD', message: 'كلمة المرور غير صحيحة' });
        }
      }
    } else {
      // Local user — check password
      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ 
          success: false, 
          errorType: 'WRONG_PASSWORD',
          message: 'كلمة المرور غير صحيحة' 
        });
      }
    }

    // Build permissions (super_admin gets all, others use stored permissions)
    const permissions = user.permissions || {};

    // Generate JWT token
    const token = jwt.sign(
      { 
        id: user.id, 
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        permissions
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    // Set user for logging (since auth middleware didn't run yet)
    req.user = { id: user.id, full_name: user.full_name, email: user.email };
    
    // Log login activity
    logActivity(req, ACTIONS.LOGIN, ENTITIES.USER, user.id, 
      user.full_name, `تسجيل دخول المستخدم: ${user.full_name}`);

    // Return success
    res.json({
      success: true,
      message: 'تم تسجيل الدخول بنجاح',
      token,
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        phone: user.phone,
        is_active: user.is_active,
        permissions: user.permissions || {},
        created_at: user.created_at
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'حدث خطأ في الخادم' 
    });
  }
};

// Update profile
const updateProfile = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'يجب تسجيل الدخول' });
    }

    const { full_name, email, phone } = req.body;

    // Check if email is already used by another user
    if (email) {
      const existingUser = await pool.query(
        'SELECT id FROM users WHERE email = $1 AND id != $2',
        [email, req.user.id]
      );
      if (existingUser.rows.length > 0) {
        return res.status(400).json({ success: false, error: 'البريد الإلكتروني مستخدم بالفعل' });
      }
    }

    const result = await pool.query(
      `UPDATE users SET 
        full_name = COALESCE($1, full_name),
        email = COALESCE($2, email),
        phone = COALESCE($3, phone),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $4
      RETURNING id, email, full_name, phone, role, avatar, created_at`,
      [full_name, email, phone, req.user.id]
    );
    
    // Log activity
    logActivity(req, ACTIONS.UPDATE, ENTITIES.USER, req.user.id, 
      result.rows[0].full_name, `تم تحديث الملف الشخصي: ${result.rows[0].full_name}`);

    res.json({ 
      success: true, 
      message: 'تم تحديث الملف الشخصي بنجاح',
      user: result.rows[0]
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في تحديث الملف الشخصي' });
  }
};

// Change password
const changePassword = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'يجب تسجيل الدخول' });
    }

    const { current_password, new_password } = req.body;

    if (!current_password || !new_password) {
      return res.status(400).json({ success: false, error: 'جميع الحقول مطلوبة' });
    }

    if (new_password.length < 6) {
      return res.status(400).json({ success: false, error: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' });
    }

    // Get current user
    const userResult = await pool.query('SELECT password FROM users WHERE id = $1', [req.user.id]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'المستخدم غير موجود' });
    }

    // Verify current password
    const isValid = await bcrypt.compare(current_password, userResult.rows[0].password);
    if (!isValid) {
      return res.status(400).json({ success: false, error: 'كلمة المرور الحالية غير صحيحة' });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(new_password, 10);

    // Update password
    await pool.query(
      'UPDATE users SET password = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [hashedPassword, req.user.id]
    );
    
    // Log activity
    logActivity(req, ACTIONS.UPDATE, ENTITIES.USER, req.user.id, 
      req.user.full_name || req.user.email, `تم تغيير كلمة المرور`);

    res.json({ success: true, message: 'تم تغيير كلمة المرور بنجاح' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في تغيير كلمة المرور' });
  }
};

// Get current user profile
const getProfile = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'يجب تسجيل الدخول' });
    }

    const result = await pool.query(
      'SELECT id, email, full_name, phone, role, avatar, created_at FROM users WHERE id = $1',
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'المستخدم غير موجود' });
    }

    res.json({ success: true, user: result.rows[0] });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب الملف الشخصي' });
  }
};

// Upload avatar
const uploadAvatar = [
  uploadAvatarMiddleware.single('avatar'),
  async (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ success: false, error: 'لم يتم رفع أي صورة' });

      // Delete old avatar file if exists
      const old = await pool.query('SELECT avatar FROM users WHERE id = $1', [req.user.id]);
      if (old.rows[0]?.avatar) {
        const oldPath = path.join(__dirname, '..', old.rows[0].avatar.replace(/^\//, ''));
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      }

      const avatarUrl = `/uploads/avatars/${req.file.filename}`;
      await pool.query('UPDATE users SET avatar = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [avatarUrl, req.user.id]);

      res.json({ success: true, avatar: avatarUrl });
    } catch (error) {
      console.error('Upload avatar error:', error);
      res.status(500).json({ success: false, error: 'حدث خطأ في رفع الصورة' });
    }
  }
];

module.exports = { login, updateProfile, changePassword, getProfile, uploadAvatar };
