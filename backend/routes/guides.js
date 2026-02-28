const express = require('express');
const router = express.Router();
const guidesController = require('../controllers/guidesController');
const { generateGuidePDF } = require('../controllers/guidesPdfController');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, '../uploads/guides');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for image upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'guide-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('يُسمح فقط بملفات الصور (JPEG, PNG, GIF)'));
    }
  }
});

// Stats
router.get('/stats', guidesController.getStats);

// PDF Export
router.get('/:id/pdf', generateGuidePDF);

// Guides CRUD
router.get('/', guidesController.getAll);
router.get('/:id', guidesController.getById);
router.post('/', guidesController.create);
router.put('/:id', guidesController.update);
router.delete('/:id', guidesController.delete);

// Steps
router.post('/steps', guidesController.addStep);
router.put('/steps/:id', guidesController.updateStep);
router.delete('/steps/:id', guidesController.deleteStep);

// Image upload
router.post('/upload', upload.single('image'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'لم يتم رفع أي صورة' });
    }
    
    res.json({
      filename: req.file.filename,
      path: `/uploads/guides/${req.file.filename}`,
      size: req.file.size
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'حدث خطأ في رفع الصورة' });
  }
});

module.exports = router;
