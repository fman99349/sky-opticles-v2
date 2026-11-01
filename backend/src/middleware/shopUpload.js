const multer = require('multer');
const path = require('path');
const fs = require('fs');

// 1. Ensure the directory exists
const uploadDir = path.join(__dirname, '..', '..', 'uploads', 'shops', 'logos');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// 2. Configure disk storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Save as shop-<shopId>-<timestamp>.jpg
    const ext = path.extname(file.originalname).toLowerCase();
    const shopId = req.params.shopId || 'unknown';
    cb(null, `shop-${shopId}-${Date.now()}${ext}`);
  },
});

// 3. File filter
const fileFilter = (req, file, cb) => {
  const allowed = ['image/jpeg', 'image/png', 'image/webp'];
  if (!allowed.includes(file.mimetype)) {
    return cb(new Error('Only JPG, PNG, and WEBP files are allowed'));
  }
  cb(null, true);
};

const shopUpload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2 MB max
  fileFilter,
});

module.exports = shopUpload;