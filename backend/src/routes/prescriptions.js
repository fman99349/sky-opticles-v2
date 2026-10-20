// Prescription file upload for signed-in customers.
//
// POST /api/prescriptions/upload — multipart, one file (JPG/PNG/PDF), max 10 MB
// GET  /api/prescriptions/:id   — stream the file back to its owner only
//
// Both endpoints require a valid customer JWT. Admin tokens are explicitly
// rejected (they lack a customer identity), so no admin can download a
// customer's prescription through this route. An admin-side download endpoint
// is a future addition, when the admin Orders page exists.

const express = require('express');
const multer = require('multer');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const pool = require('../db');

const router = express.Router();

// --- Upload settings --------------------------------------------------------

const UPLOAD_DIR = path.join(__dirname, '..', '..', 'uploads', 'prescriptions');
const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

// Only these MIME types are accepted. Extension is derived from MIME, never
// from the client-supplied filename, so a `.exe` cannot be smuggled in.
const ALLOWED_MIMES = new Set(['image/jpeg', 'image/png', 'application/pdf']);
const EXT_BY_MIME = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'application/pdf': '.pdf',
};

// Store files under a random name. The original filename is kept in the
// database only, never used to construct a path.
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext = EXT_BY_MIME[file.mimetype] || '';
    const rand = crypto.randomBytes(16).toString('hex');
    cb(null, `${Date.now()}-${rand}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_SIZE_BYTES },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIMES.has(file.mimetype)) {
      return cb(new Error('Only JPG, PNG, and PDF files are allowed.'));
    }
    cb(null, true);
  },
});

// --- Auth middleware --------------------------------------------------------

// Verifies a customer JWT. Explicitly rejects admin tokens (role === 'admin')
// even though both tokens are signed with the same secret.
async function requireCustomer(req, res, next) {
  const header = req.headers.authorization || '';
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match) {
    return res
      .status(401)
      .json({ error: 'Missing or malformed Authorization header.' });
  }

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    return res.status(500).json({ error: 'Server auth is not configured.' });
  }

  let payload;
  try {
    payload = jwt.verify(match[1], secret);
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token.' });
  }

  if (payload.role === 'admin') {
    return res.status(403).json({ error: 'Customer access required.' });
  }

  try {
    const result = await pool.query(
      'SELECT id FROM users WHERE id = $1',
      [payload.sub]
    );
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Account no longer exists.' });
    }
    req.userId = result.rows[0].id;
    next();
  } catch (error) {
    console.error('requireCustomer failed:', error.message);
    res.status(500).json({ error: 'An unexpected server error occurred.' });
  }
}

// --- Routes -----------------------------------------------------------------

// POST /api/prescriptions/upload
// Multipart field name: `file`
// Returns: { data: { id, filename, original_name, mime_type, size_bytes, created_at } }
router.post('/prescriptions/upload', requireCustomer, (req, res) => {
  upload.single('file')(req, res, async (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res
          .status(413)
          .json({ error: 'File exceeds the 10 MB limit.' });
      }
      return res.status(400).json({ error: err.message || 'Upload failed.' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded.' });
    }

    try {
      const result = await pool.query(
        `INSERT INTO prescriptions
           (user_id, filename, original_name, mime_type, size_bytes)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, filename, original_name, mime_type, size_bytes, created_at`,
        [
          req.userId,
          req.file.filename,
          req.file.originalname,
          req.file.mimetype,
          req.file.size,
        ]
      );

      res.status(201).json({ data: result.rows[0] });
    } catch (error) {
      // If the DB insert failed, remove the orphaned file so we do not leak
      // disk space on repeated failures.
      try {
        fs.unlinkSync(req.file.path);
      } catch {
        /* best-effort cleanup */
      }
      console.error('Prescription insert failed:', error.message);
      res.status(500).json({ error: 'An unexpected server error occurred.' });
    }
  });
});

// GET /api/prescriptions/:id
// Streams the file back to its owner. No other customer can read it.
router.get('/prescriptions/:id', requireCustomer, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: 'Invalid prescription ID.' });
  }

  try {
    const result = await pool.query(
      `SELECT filename, original_name, mime_type
       FROM prescriptions
       WHERE id = $1 AND user_id = $2`,
      [id, req.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Prescription not found.' });
    }

    const row = result.rows[0];
    const filePath = path.join(UPLOAD_DIR, row.filename);

    if (!fs.existsSync(filePath)) {
      return res.status(410).json({ error: 'File is no longer available.' });
    }

    res.setHeader('Content-Type', row.mime_type);
    res.setHeader(
      'Content-Disposition',
      `inline; filename="${row.original_name.replace(/"/g, '')}"`
    );
    fs.createReadStream(filePath).pipe(res);
  } catch (error) {
    console.error('Prescription fetch failed:', error.message);
    res.status(500).json({ error: 'An unexpected server error occurred.' });
  }
});

module.exports = router;