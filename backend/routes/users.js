const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const ctrl = require('../controllers/usersController');

// Only super_admin can manage users
const requireSuperAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'super_admin') {
    return res.status(403).json({ error: 'هذه الصفحة للسوبر ادمن فقط' });
  }
  next();
};

router.use(requireAuth);
router.use(requireSuperAdmin);

router.get('/',                       ctrl.getAll);
router.get('/:id',                    ctrl.getOne);
router.post('/',                      ctrl.create);
router.put('/:id',                    ctrl.update);
router.put('/:id/permissions',        ctrl.updatePermissions);
router.put('/:id/change-password',    ctrl.changePassword);
router.delete('/:id',                 ctrl.remove);

module.exports = router;
