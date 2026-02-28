const express = require('express');
const router = express.Router();
const accessoriesController = require('../controllers/accessoriesController');

// Get all accessories
router.get('/', accessoriesController.getAll);

// Get accessories by assignment
router.get('/assignment/:assignmentId', accessoriesController.getByAssignment);

// Add accessory to assignment
router.post('/assignment', accessoriesController.addToAssignment);

// Add multiple accessories to assignment
router.post('/assignment/bulk', accessoriesController.addMultipleToAssignment);

// Mark accessory as returned
router.put('/return/:id', accessoriesController.markReturned);

// Create new accessory type
router.post('/', accessoriesController.create);

// Update accessory type
router.put('/:id', accessoriesController.update);

// Remove accessory from assignment
router.delete('/assignment/:id', accessoriesController.removeFromAssignment);

module.exports = router;
