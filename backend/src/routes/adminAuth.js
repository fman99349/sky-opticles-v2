// Administrator authentication for the desktop app.
// Separate from customer auth in routes/auth.js.
// Endpoints live under /api/admin/auth/... so they never collide with
// customer endpoints.

const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../db');

const router = express.Router();

const BCRYPT_COST = 10;
const EMAIL_MAX = 180;
const PASSWORD_MIN = 8;
const PASSWORD_MAX = 72;

// Only ever returned to the client. Never the password hash.
function publicAdmin(row) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    created_at: row.created_at,
  };
}

function isValidEmail(value) {
  if (typeof value !== 'string') return false;
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > EMAIL_MAX) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
}

// Admin tokens are signed with the same JWT_SECRET as customer tokens,
// but the payload includes role: 'admin' so backend middleware and future
// admin-only endpoints can tell them apart.
function signAdminToken(admin) {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET is not configured');
  return jwt.sign(
    { sub: String(admin.id), email: admin.email, role: 'admin' },
    secret,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}

// Verifies a Bearer token, checks it is an admin token, and loads the admin.
// Used here by /me and available for future protected admin endpoints.
async function requireAdmin(req, res, next) {
  const header = req.headers.authorization || '';
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match) {
    return res.status(401).json({ error: 'Missing or malformed Authorization header.' });
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

  if (payload.role !== 'admin') {
    return res.status(403).json({ error: 'Administrator access required.' });
  }

  try {
    const result = await pool.query(
      'SELECT id, name, email, created_at FROM admins WHERE id = $1',
      [payload.sub]
    );
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Administrator no longer exists.' });
    }
    req.admin = result.rows[0];
    next();
  } catch (error) {
    console.error('requireAdmin failed:', error.message);
    res.status(500).json({ error: 'An unexpected server error occurred.' });
  }
}

function handleError(res, error, operation) {
  console.error(`${operation}:`, error.message);
  return res.status(500).json({ error: 'An unexpected server error occurred.' });
}

// POST /api/admin/auth/login
// Body: { email, password }
// Returns: { data: { admin, token } }
router.post('/admin/auth/login', async (req, res) => {
  const { email, password } = req.body || {};

  // Same generic message for both failures — do not reveal which was wrong.
  if (!isValidEmail(email) || typeof password !== 'string' || !password) {
    return res.status(401).json({ error: 'Invalid email or password.' });
  }

  const lowerEmail = email.trim().toLowerCase();

  try {
    const result = await pool.query(
      'SELECT id, name, email, password_hash, created_at FROM admins WHERE LOWER(email) = $1',
      [lowerEmail]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const row = result.rows[0];
    const ok = await bcrypt.compare(password, row.password_hash);
    if (!ok) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const token = signAdminToken(row);
    res.json({ data: { admin: publicAdmin(row), token } });
  } catch (error) {
    handleError(res, error, 'Admin login failed');
  }
});

// GET /api/admin/auth/me
// Header: Authorization: Bearer <token>
// Returns: { data: { admin } }
router.get('/admin/auth/me', requireAdmin, async (req, res) => {
  res.json({ data: { admin: publicAdmin(req.admin) } });
});


// PATCH /api/admin/auth/me
// Allows the logged-in admin to update their name, email, or password.
router.patch('/admin/auth/me', requireAdmin, async (req, res) => {
  const { name, email, currentPassword, newPassword } = req.body || {};
  const adminId = req.admin.id;

  const updates = {};
  const values = [];

  // 1. Validate Name
  if (name !== undefined) {
    if (typeof name !== 'string' || !name.trim() || name.trim().length > 120) {
      return res.status(400).json({ error: 'Name must be 1-120 characters.' });
    }
    updates.name = name.trim();
  }

  // 2. Validate Email (Requires current password for security)
  if (email !== undefined && email !== req.admin.email) {
    if (!currentPassword) {
      return res.status(400).json({ error: 'Current password is required to change email.' });
    }
    if (!isValidEmail(email)) {
      return res.status(400).json({ error: 'Valid email is required.' });
    }
    
    // Verify current password
    const pwdRes = await pool.query('SELECT password_hash FROM admins WHERE id = $1', [adminId]);
    const ok = await bcrypt.compare(currentPassword, pwdRes.rows[0].password_hash);
    if (!ok) {
      return res.status(401).json({ error: 'Incorrect current password.' });
    }

    updates.email = email.trim();
  }

  // 3. Validate New Password (Requires current password for security)
  if (newPassword) {
    if (!currentPassword) {
      return res.status(400).json({ error: 'Current password is required to set a new password.' });
    }
    if (newPassword.length < 8 || newPassword.length > 72) {
      return res.status(400).json({ error: 'New password must be 8-72 characters.' });
    }

    // Verify current password
    const pwdRes = await pool.query('SELECT password_hash FROM admins WHERE id = $1', [adminId]);
    const ok = await bcrypt.compare(currentPassword, pwdRes.rows[0].password_hash);
    if (!ok) {
      return res.status(401).json({ error: 'Incorrect current password.' });
    }

    const newHash = await bcrypt.hash(newPassword, BCRYPT_COST);
    updates.password_hash = newHash;
  }

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ error: 'No changes requested.' });
  }

  // Build query
  const setClauses = [];
  for (const [col, val] of Object.entries(updates)) {
    values.push(val);
    setClauses.push(`${col} = $${values.length}`);
  }
  setClauses.push('updated_at = NOW()');
  values.push(adminId);

  try {
    const result = await pool.query(
      `UPDATE admins SET ${setClauses.join(', ')} WHERE id = $${values.length} 
       RETURNING id, name, email, created_at`,
      values
    );
    res.json({ data: { admin: publicAdmin(result.rows[0]) } });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ error: 'That email is already in use by another admin.' });
    }
    handleError(res, error, 'Update admin profile failed');
  }
});











module.exports = router;
module.exports.requireAdmin = requireAdmin;