const jwt = require('jsonwebtoken');

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  console.log('🔐 Auth Header:', authHeader ? 'Present' : 'Missing');

  if (!token) {
    // If no token, continue but req.user will be null
    console.log('⚠️ No token provided');
    req.user = null;
    return next();
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      // If token is invalid, continue but req.user will be null
      console.log('❌ Token invalid:', err.message);
      req.user = null;
      return next();
    }
    
    console.log('✅ User authenticated:', user.full_name || user.email);
    req.user = user;
    next();
  });
};

const requireAuth = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'يجب تسجيل الدخول', code: 'NO_TOKEN' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({ error: 'انتهت صلاحية الجلسة - يرجى تسجيل الدخول مرة أخرى', code: 'TOKEN_EXPIRED' });
      }
      return res.status(403).json({ error: 'غير مصرح - يرجى تسجيل الدخول مرة أخرى', code: 'INVALID_TOKEN' });
    }
    
    req.user = user;
    next();
  });
};

module.exports = { authenticateToken, requireAuth };
