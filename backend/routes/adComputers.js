const express = require('express');
const router = express.Router();
const adComputersController = require('../controllers/adComputersController');
const { authenticateToken, requireAuth } = require('../middleware/auth');
const { validateAgentKey } = require('../controllers/agentController');

// Middleware: accept either a valid JWT (web UI) or a valid Agent API Key (agent script)
const agentOrUserAuth = async (req, res, next) => {
  const agentKey = req.headers['x-agent-key'];
  if (agentKey) {
    const valid = await validateAgentKey(agentKey);
    if (valid) { req.isAgent = true; return next(); }
    return res.status(401).json({ error: 'Invalid agent key' });
  }
  // Fall back to JWT
  return requireAuth(req, res, next);
};

router.get('/', authenticateToken, adComputersController.getCachedComputers);
router.get('/fetch', authenticateToken, adComputersController.fetchComputers);
router.get('/collector-script', authenticateToken, adComputersController.getCollectorScript);
router.get('/gpo-script', authenticateToken, adComputersController.getGPOScript);
router.post('/import-specs', agentOrUserAuth, adComputersController.importSpecs);
router.get('/:name', authenticateToken, adComputersController.getComputerDetails);
router.post('/assign', authenticateToken, adComputersController.assignEmployee);

module.exports = router;
