const express = require('express');
const router = express.Router();
const tasksController = require('../controllers/tasksController');
const { authenticateToken } = require('../middleware/auth');

router.use(authenticateToken);

// Users list for assign dropdown
router.get('/users-list', tasksController.getUsersList);

// Tasks CRUD
router.get('/', tasksController.getAll);
router.get('/:id', tasksController.getById);
router.post('/', tasksController.create);
router.put('/:id', tasksController.update);
router.delete('/:id', tasksController.remove);

// Move (drag & drop)
router.put('/:id/move', tasksController.moveTask);

// Assign
router.put('/:id/assign', tasksController.assignTask);

// Comments
router.post('/:id/comments', tasksController.addComment);

module.exports = router;
