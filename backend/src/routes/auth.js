const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const pool = require('../db');
const { sendExpoPush } = require('../utils/expoPush');
const { sendEmail } = require('../utils/email');
const { passwordResetEmail, welcomeEmail } = require('../utils/emailTemplates');

const router = express.Router();

const BCRYPT_COST = 10;
const EMAIL_MAX = 180;
const NAME_MAX = 120;
const PASSWORD_MIN = 8;
const PASSWORD_MAX = 72;
const PHONE_MAX = 40;

function publicUser(row) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone || null,
    created_at: row.created_at,
  };
}

function isValidEmail(value) {
  if (typeof value !== 'string') return false;
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > EMAIL_MAX) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
}

function isValidPhone(value) {
  if (typeof value !== 'string') return false;
  if (value.length > PHONE_MAX) return false;
  const digits = value.replace(/\D/g, '');
  return digits.length >= 10 && digits.length <= 15;
}

function signToken(user) {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET is not configured');
  return jwt.sign(
    { sub: String(user.id), email: user.email },
    secret,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}

function handleError(res, error, operation) {
  console.error(`${operation}:`, error.message);

  if (error.code === '23505') {
    return res.status(409).json({ error: 'That email is already registered.' });
  }

  return res.status(500).json({ error: 'An unexpected server error occurred.' });
}

async function loadCustomerFromAuthHeader(req, res) {
  const header = req.headers.authorization || '';
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match) {
    res.status(401).json({ error: 'Missing or malformed Authorization header.' });
    return null;
  }

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    res.status(500).json({ error: 'Server auth is not configured.' });
    return null;
  }

  let payload;
  try {
    payload = jwt.verify(match[1], secret);
  } catch {
    res.status(401).json({ error: 'Invalid or expired token.' });
    return null;
  }

  if (payload.role === 'admin') {
    res.status(403).json({ error: 'Customer access required.' });
    return null;
  }

  const result = await pool.query(
    'SELECT id, name, email, phone, created_at FROM users WHERE id = $1',
    [payload.sub]
  );
  if (result.rows.length === 0) {
    res.status(401).json({ error: 'Account no longer exists.' });
    return null;
  }
  return result.rows[0];
}

// ---------------------------------------------------------------------------
// POST /api/auth/register
// ---------------------------------------------------------------------------
router.post('/auth/register', async (req, res) => {
  const { name, email, password } = req.body || {};

  if (typeof name !== 'string' || !name.trim() || name.trim().length > NAME_MAX) {
    return res.status(400).json({
      error: `Name is required and must not exceed ${NAME_MAX} characters.`,
    });
  }

  if (!isValidEmail(email)) {
    return res.status(400).json({ error: 'A valid email address is required.' });
  }

  if (
    typeof password !== 'string' ||
    password.length < PASSWORD_MIN ||
    password.length > PASSWORD_MAX
  ) {
    return res.status(400).json({
      error: `Password must be between ${PASSWORD_MIN} and ${PASSWORD_MAX} characters.`,
    });
  }

  const cleanName = name.trim();
  const cleanEmail = email.trim();
  const lowerEmail = cleanEmail.toLowerCase();

  try {
    const existing = await pool.query(
      'SELECT id FROM users WHERE LOWER(email) = $1',
      [lowerEmail]
    );
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'That email is already registered.' });
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_COST);

    const result = await pool.query(
      `INSERT INTO users (name, email, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id, name, email, phone, created_at`,
      [cleanName, cleanEmail, passwordHash]
    );

    const user = result.rows[0];
    const token = signToken(user);

    // In-app notification (bell icon)
    await pool.query(
      `INSERT INTO notifications (customer_id, title, message, type)
       VALUES ($1, $2, $3, 'account')`,
      [user.id, 'Welcome to SKY OPTICLES!', 'Your account is ready. Start exploring our collection today.']
    );

    // Welcome email — AWAITED. Fire-and-forget Nodemailer sends drop silently
    // because the SMTP transaction gets reaped before it completes.
    try {
      const tpl = welcomeEmail({ name: user.name });
      const emailResult = await sendEmail({
        to: user.email,
        subject: tpl.subject,
        html: tpl.html,
      });
      if (!emailResult.ok) {
        console.warn('[register] Welcome email failed:', emailResult.error);
      } else {
        console.log(`[register] Welcome email sent to ${user.email}`);
      }
    } catch (err) {
      console.warn('[register] Welcome email error:', err.message);
    }

    res.status(201).json({ data: { user: publicUser(user), token } });
  } catch (error) {
    handleError(res, error, 'Register failed');
  }
});

// ---------------------------------------------------------------------------
// POST /api/auth/login
// ---------------------------------------------------------------------------
router.post('/auth/login', async (req, res) => {
  const { email, password } = req.body || {};

  if (!isValidEmail(email) || typeof password !== 'string' || !password) {
    return res.status(401).json({ error: 'Invalid email or password.' });
  }

  const lowerEmail = email.trim().toLowerCase();

  try {
    const result = await pool.query(
      'SELECT id, name, email, phone, password_hash, created_at FROM users WHERE LOWER(email) = $1',
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

    const token = signToken(row);
    res.json({ data: { user: publicUser(row), token } });
  } catch (error) {
    handleError(res, error, 'Login failed');
  }
});

// ---------------------------------------------------------------------------
// GET /api/auth/me
// ---------------------------------------------------------------------------
router.get('/auth/me', async (req, res) => {
  try {
    const user = await loadCustomerFromAuthHeader(req, res);
    if (!user) return;

    res.json({ data: { user: publicUser(user) } });
  } catch (error) {
    handleError(res, error, 'Me failed');
  }
});

// ---------------------------------------------------------------------------
// PATCH /api/auth/me
// ---------------------------------------------------------------------------
router.patch('/auth/me', async (req, res) => {
  const { name, phone, email } = req.body || {};

  const setClauses = [];
  const values = [];

  if (name !== undefined) {
    if (typeof name !== 'string' || !name.trim() || name.trim().length > NAME_MAX) {
      return res.status(400).json({
        error: `Name must be 1–${NAME_MAX} characters.`,
      });
    }
    values.push(name.trim());
    setClauses.push(`name = $${values.length}`);
  }

  if (phone !== undefined) {
    if (phone === null || phone === '') {
      values.push(null);
    } else {
      if (!isValidPhone(phone)) {
        return res.status(400).json({ error: 'Phone must contain 10–15 digits.' });
      }
      values.push(phone.trim());
    }
    setClauses.push(`phone = $${values.length}`);
  }

  if (email !== undefined) {
    if (!isValidEmail(email)) {
      return res.status(400).json({ error: 'A valid email address is required.' });
    }
    values.push(email.trim());
    setClauses.push(`email = $${values.length}`);
  }

  if (setClauses.length === 0) {
    return res.status(400).json({ error: 'No fields to update.' });
  }

  let user;
  try {
    user = await loadCustomerFromAuthHeader(req, res);
    if (!user) return;
  } catch (error) {
    return handleError(res, error, 'Update profile auth failed');
  }

  setClauses.push('updated_at = NOW()');
  values.push(user.id);

  try {
    const result = await pool.query(
      `UPDATE users
       SET ${setClauses.join(', ')}
       WHERE id = $${values.length}
       RETURNING id, name, email, phone, created_at`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Account not found.' });
    }

    res.json({ data: { user: publicUser(result.rows[0]) } });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({
        error: 'That email is already registered to another account.',
      });
    }
    handleError(res, error, 'Update profile failed');
  }
});

// ---------------------------------------------------------------------------
// PATCH /api/auth/push-token
// ---------------------------------------------------------------------------
router.patch('/auth/push-token', async (req, res) => {
  const header = req.headers.authorization || '';
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match) return res.status(401).json({ error: 'Missing auth header.' });

  let payload;
  try { payload = jwt.verify(match[1], process.env.JWT_SECRET); }
  catch { return res.status(401).json({ error: 'Invalid token.' }); }

  const { pushToken } = req.body;
  if (!pushToken) return res.status(400).json({ error: 'pushToken required.' });

  try {
    await pool.query('UPDATE users SET expo_push_token = $1 WHERE id = $2', [pushToken, payload.sub]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to save token.' });
  }
});

// ---------------------------------------------------------------------------
// POST /api/auth/forgot-password
// ---------------------------------------------------------------------------
router.post('/auth/forgot-password', async (req, res) => {
  const { email } = req.body || {};
  if (!isValidEmail(email)) {
    return res.status(400).json({ error: 'Valid email is required.' });
  }

  try {
    // Select `name` too so we can personalise the email greeting
    const userRes = await pool.query(
      'SELECT id, email, name FROM users WHERE LOWER(email) = $1',
      [email.trim().toLowerCase()]
    );

    // Security: Always return success even if the email doesn't exist
    if (userRes.rows.length === 0) {
      return res.json({ success: true, message: 'If that email exists, a reset code has been sent.' });
    }

    const user = userRes.rows[0];

    // 6-char uppercase alphanumeric code
    const token = crypto.randomBytes(3).toString('hex').toUpperCase();

    // Expire in 15 minutes
    const expiresAt = new Date(Date.now() + 15 * 60000);

    // Save to database
    await pool.query('DELETE FROM password_reset_tokens WHERE user_id = $1', [user.id]);
    await pool.query(
      'INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
      [user.id, token, expiresAt]
    );

    // Send the reset code via email — AWAITED
    try {
      const tpl = passwordResetEmail({ name: user.name, code: token });
      const emailResult = await sendEmail({
        to: user.email,
        subject: tpl.subject,
        html: tpl.html,
      });
      if (!emailResult.ok) {
        console.warn('[forgot-password] Reset email failed:', emailResult.error);
      } else {
        console.log(`[forgot-password] Reset email sent to ${user.email}`);
      }
    } catch (err) {
      console.warn('[forgot-password] Reset email error:', err.message);
    }

    // In dev, also print the code so you can test without checking email
    if (process.env.NODE_ENV !== 'production') {
      console.log('\n=============================================');
      console.log(`🔐 PASSWORD RESET CODE for ${user.email}`);
      console.log(`👉 CODE: ${token}`);
      console.log('=============================================\n');
    }

    res.json({ success: true, message: 'If that email exists, a reset code has been sent.' });
  } catch (error) {
    handleError(res, error, 'Forgot password failed');
  }
});

// ---------------------------------------------------------------------------
// POST /api/auth/reset-password
// ---------------------------------------------------------------------------
router.post('/auth/reset-password', async (req, res) => {
  const { email, token, newPassword } = req.body || {};

  if (!isValidEmail(email) || !token || typeof newPassword !== 'string') {
    return res.status(400).json({ error: 'Email, reset code, and new password are required.' });
  }

  if (newPassword.length < PASSWORD_MIN || newPassword.length > PASSWORD_MAX) {
    return res.status(400).json({ error: `Password must be between ${PASSWORD_MIN} and ${PASSWORD_MAX} characters.` });
  }

  try {
    const userRes = await pool.query('SELECT id FROM users WHERE LOWER(email) = $1', [email.trim().toLowerCase()]);
    if (userRes.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired reset code.' });
    }
    const userId = userRes.rows[0].id;

    const tokenRes = await pool.query(
      `SELECT id FROM password_reset_tokens
       WHERE user_id = $1 AND token = $2 AND expires_at > NOW()`,
      [userId, token.trim().toUpperCase()]
    );

    if (tokenRes.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired reset code.' });
    }

    const passwordHash = await bcrypt.hash(newPassword, BCRYPT_COST);

    await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [passwordHash, userId]);
    await pool.query('DELETE FROM password_reset_tokens WHERE user_id = $1', [userId]);

    res.json({ success: true, message: 'Password updated successfully.' });
  } catch (error) {
    handleError(res, error, 'Reset password failed');
  }
});

module.exports = router;