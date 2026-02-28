const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure multer for logo upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../public/assets');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    // Always save as logo.png (overwrite existing)
    cb(null, 'logo.png');
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB max
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'));
    }
  }
});

// Upload logo
router.post('/upload', upload.single('logo'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    res.json({ 
      message: 'Logo uploaded successfully',
      filename: req.file.filename,
      path: `/assets/${req.file.filename}`
    });
  } catch (error) {
    console.error('Error uploading logo:', error);
    res.status(500).json({ error: 'Failed to upload logo' });
  }
});

// Get logo info
router.get('/info', (req, res) => {
  try {
    const logoPath = path.join(__dirname, '../public/assets/logo.png');
    const exists = fs.existsSync(logoPath);
    
    if (exists) {
      const stats = fs.statSync(logoPath);
      res.json({
        exists: true,
        path: '/assets/logo.png',
        size: stats.size,
        modified: stats.mtime
      });
    } else {
      res.json({
        exists: false,
        message: 'No logo uploaded yet'
      });
    }
  } catch (error) {
    console.error('Error getting logo info:', error);
    res.status(500).json({ error: 'Failed to get logo info' });
  }
});

// Delete logo
router.delete('/', (req, res) => {
  try {
    const logoPath = path.join(__dirname, '../public/assets/logo.png');
    
    if (fs.existsSync(logoPath)) {
      fs.unlinkSync(logoPath);
      res.json({ message: 'Logo deleted successfully' });
    } else {
      res.status(404).json({ error: 'Logo not found' });
    }
  } catch (error) {
    console.error('Error deleting logo:', error);
    res.status(500).json({ error: 'Failed to delete logo' });
  }
});

module.exports = router;
