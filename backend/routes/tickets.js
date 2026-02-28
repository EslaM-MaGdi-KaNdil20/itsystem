const express = require('express');
const router = express.Router();
const ticketsController = require('../controllers/ticketsController');
const { authenticateToken } = require('../middleware/auth');

// Public route - anyone can create a ticket
router.post('/', ticketsController.createTicket);

// Public route - track ticket by ticket_number (no auth needed)
router.get('/track/:ticket_number', ticketsController.trackTicket);

// Protected routes - require authentication
// Stats and IT users MUST come before /:id
router.get('/stats', authenticateToken, ticketsController.getTicketStats);
router.get('/it-users', authenticateToken, ticketsController.getITUsers);

router.get('/', authenticateToken, ticketsController.getAllTickets);
router.get('/:id', authenticateToken, ticketsController.getTicketById);
router.put('/:id', authenticateToken, ticketsController.updateTicket);
router.delete('/:id', authenticateToken, ticketsController.deleteTicket);
router.post('/:id/comments', authenticateToken, ticketsController.addComment);
router.put('/:id/assign', authenticateToken, ticketsController.assignTicket);
router.put('/:id/status', authenticateToken, ticketsController.changeStatus);

module.exports = router;
