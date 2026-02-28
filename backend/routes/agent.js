const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const {
  generateKey,
  listKeys,
  revokeKey,
  deleteKey,
  getProductionAgent
} = require('../controllers/agentController');

// Key management — requires logged-in user (admin)
router.get('/keys', authenticateToken, listKeys);
router.post('/keys', authenticateToken, generateKey);
router.patch('/keys/:id/revoke', authenticateToken, revokeKey);
router.delete('/keys/:id', authenticateToken, deleteKey);

// Download agent scripts (must have valid API key passed as query param OR be logged in)
router.get('/script', getProductionAgent);          // agent.ps1 (used by setup)
router.get('/setup', authenticateToken, (req, res) => {
  req.query.type = 'setup';
  return getProductionAgent(req, res);              // IT-Agent-Setup.ps1
});

module.exports = router;
