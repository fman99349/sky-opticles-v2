// backend/src/routes/shopInvites.js
//
// Seller onboarding via one-time invite links.
//
// Flow (dev mode):
//   1. Platform owner POSTs /api/admin/invites { email }
//   2. Backend returns { invite_url } AND prints it to the terminal
//   3. Platform owner sends the URL via WhatsApp/SMS manually
//   4. Recipient opens /accept-invite/<token> in a browser
//   5. Page POSTs /api/invites/<token>/accept { name, password }
//   6. Admin row is created; the recipient can now log in to the seller app
//
// Tokens are stored hashed (SHA-256). If the URL is lost, the platform owner
// must revoke the invite and create a new one — we cannot recover the token
// from the DB.

const express = require('express');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const pool = require('../db');
const { requireAdmin, requirePlatformOwner } = require('./adminAuth');

const router = express.Router();

const EMAIL_MAX = 180;
const NAME_MAX = 120;
const PASSWORD_MIN = 8;
const PASSWORD_MAX = 72;
const BCRYPT_COST = 10;
const INVITE_TTL_HOURS = 72;

function isValidEmail(value) {
  if (typeof value !== 'string') return false;
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > EMAIL_MAX) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
}

function hashToken(raw) {
  return crypto.createHash('sha256').update(raw).digest('hex');
}

function baseUrl(req) {
  const proto = req.headers['x-forwarded-proto'] || req.protocol || 'http';
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  return `${proto}://${host}`;
}

// ---------------------------------------------------------------------------
// POST /api/admin/invites — platform owner creates an invite
// ---------------------------------------------------------------------------
router.post('/admin/invites', requireAdmin, requirePlatformOwner, async (req, res) => {
  const { email } = req.body || {};
  if (!isValidEmail(email)) {
    return res.status(400).json({ error: 'A valid email address is required.' });
  }
  const cleanEmail = email.trim();
  const lower = cleanEmail.toLowerCase();

  try {
    const existingAdmin = await pool.query(
      'SELECT id FROM admins WHERE LOWER(email) = $1',
      [lower]
    );
    if (existingAdmin.rows.length > 0) {
      return res.status(409).json({ error: 'An admin with that email already exists.' });
    }

    const existingInvite = await pool.query(
      `SELECT id, expires_at FROM shop_invites
        WHERE LOWER(email) = $1 AND accepted_at IS NULL AND revoked_at IS NULL`,
      [lower]
    );
    if (existingInvite.rows.length > 0) {
      return res.status(409).json({
        error:
          'A pending invite already exists for that email. Revoke it first or use a different email.',
        existing_invite_id: existingInvite.rows[0].id,
        expires_at: existingInvite.rows[0].expires_at,
      });
    }

    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = hashToken(rawToken);
    const expiresAt = new Date(Date.now() + INVITE_TTL_HOURS * 3600 * 1000);

    const insert = await pool.query(
      `INSERT INTO shop_invites (token, email, invited_by_admin_id, expires_at)
       VALUES ($1, $2, $3, $4)
       RETURNING id, email, expires_at, created_at`,
      [tokenHash, cleanEmail, req.admin.id, expiresAt]
    );

    const inviteUrl = `${baseUrl(req)}/accept-invite/${rawToken}`;

    // Mirror of the reset-code pattern — dev-friendly copy-paste target.
    console.log('\n=============================================');
    console.log(`📨 SELLER INVITE for ${cleanEmail}`);
    console.log(`👉 URL: ${inviteUrl}`);
    console.log(`⏰ Expires: ${expiresAt.toISOString()}`);
    console.log('=============================================\n');

    res.status(201).json({
      data: {
        ...insert.rows[0],
        invite_url: inviteUrl,
        expires_in_hours: INVITE_TTL_HOURS,
      },
    });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ error: 'A pending invite already exists for that email.' });
    }
    console.error('Create invite failed:', error.message);
    res.status(500).json({ error: 'An unexpected server error occurred.' });
  }
});

// ---------------------------------------------------------------------------
// GET /api/admin/invites — platform owner lists all invites
// ---------------------------------------------------------------------------
router.get('/admin/invites', requireAdmin, requirePlatformOwner, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, email, invited_by_admin_id, expires_at, accepted_at,
              accepted_admin_id, revoked_at, created_at
         FROM shop_invites
        ORDER BY created_at DESC`
    );
    res.json({ data: result.rows });
  } catch (error) {
    console.error('List invites failed:', error.message);
    res.status(500).json({ error: 'An unexpected server error occurred.' });
  }
});

// ---------------------------------------------------------------------------
// DELETE /api/admin/invites/:id — platform owner revokes a pending invite
// ---------------------------------------------------------------------------
router.delete('/admin/invites/:id', requireAdmin, requirePlatformOwner, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) {
    return res.status(400).json({ error: 'Invalid invite ID.' });
  }
  try {
    const result = await pool.query(
      `UPDATE shop_invites
          SET revoked_at = NOW()
        WHERE id = $1 AND accepted_at IS NULL AND revoked_at IS NULL
        RETURNING id, email, revoked_at`,
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'No active invite with that ID.' });
    }
    res.json({ data: result.rows[0] });
  } catch (error) {
    console.error('Revoke invite failed:', error.message);
    res.status(500).json({ error: 'An unexpected server error occurred.' });
  }
});

// ---------------------------------------------------------------------------
// GET /api/invites/:token/validate — public; used by the accept page
// ---------------------------------------------------------------------------
router.get('/invites/:token/validate', async (req, res) => {
  const raw = String(req.params.token || '');
  if (!/^[a-f0-9]{64}$/i.test(raw)) {
    return res.status(400).json({ valid: false, error: 'Invalid invite token.' });
  }
  try {
    const hash = hashToken(raw);
    const result = await pool.query(
      `SELECT id, email, expires_at, accepted_at, revoked_at
         FROM shop_invites WHERE token = $1`,
      [hash]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ valid: false, error: 'Invite not found.' });
    }
    const inv = result.rows[0];
    if (inv.revoked_at) return res.status(410).json({ valid: false, error: 'Invite was revoked.' });
    if (inv.accepted_at) return res.status(410).json({ valid: false, error: 'Invite already used.' });
    if (new Date(inv.expires_at) <= new Date()) {
      return res.status(410).json({ valid: false, error: 'Invite expired.' });
    }
    res.json({ valid: true, email: inv.email, expires_at: inv.expires_at });
  } catch (error) {
    console.error('Validate invite failed:', error.message);
    res.status(500).json({ valid: false, error: 'An unexpected server error occurred.' });
  }
});

// ---------------------------------------------------------------------------
// POST /api/invites/:token/accept — public; creates the admin account
// ---------------------------------------------------------------------------
router.post('/invites/:token/accept', async (req, res) => {
  const raw = String(req.params.token || '');
  if (!/^[a-f0-9]{64}$/i.test(raw)) {
    return res.status(400).json({ error: 'Invalid invite token.' });
  }

  const { name, password } = req.body || {};
  if (typeof name !== 'string' || !name.trim() || name.trim().length > NAME_MAX) {
    return res.status(400).json({ error: `Name is required (max ${NAME_MAX} chars).` });
  }
  if (
    typeof password !== 'string' ||
    password.length < PASSWORD_MIN ||
    password.length > PASSWORD_MAX
  ) {
    return res
      .status(400)
      .json({ error: `Password must be between ${PASSWORD_MIN} and ${PASSWORD_MAX} chars.` });
  }

  const hash = hashToken(raw);
  const client = await pool.connect();
  let tx = false;

  try {
    await client.query('BEGIN');
    tx = true;

    // Lock the invite row so two browser tabs can't both accept it
    const inv = await client.query(
      `SELECT id, email, expires_at, accepted_at, revoked_at
         FROM shop_invites WHERE token = $1 FOR UPDATE`,
      [hash]
    );
    if (inv.rows.length === 0) {
      await client.query('ROLLBACK'); tx = false;
      return res.status(404).json({ error: 'Invite not found.' });
    }
    const row = inv.rows[0];
    if (row.revoked_at) { await client.query('ROLLBACK'); tx = false; return res.status(410).json({ error: 'Invite was revoked.' }); }
    if (row.accepted_at) { await client.query('ROLLBACK'); tx = false; return res.status(410).json({ error: 'Invite already used.' }); }
    if (new Date(row.expires_at) <= new Date()) {
      await client.query('ROLLBACK'); tx = false;
      return res.status(410).json({ error: 'Invite expired.' });
    }

    // Defence in depth — email might have been created manually since the invite
    const dupe = await client.query(
      'SELECT id FROM admins WHERE LOWER(email) = LOWER($1)',
      [row.email]
    );
    if (dupe.rows.length > 0) {
      await client.query('ROLLBACK'); tx = false;
      return res.status(409).json({ error: 'An admin with that email already exists.' });
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_COST);

    const newAdmin = await client.query(
      `INSERT INTO admins (name, email, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id, name, email, created_at`,
      [name.trim(), row.email, passwordHash]
    );

    await client.query(
      `UPDATE shop_invites
          SET accepted_at = NOW(), accepted_admin_id = $1
        WHERE id = $2`,
      [newAdmin.rows[0].id, row.id]
    );

    await client.query('COMMIT');
    tx = false;

    res.status(201).json({
      data: {
        admin: newAdmin.rows[0],
        message: 'Account created. You can now sign in to the seller admin app.',
      },
    });
  } catch (error) {
    if (tx) await client.query('ROLLBACK').catch(() => {});
    console.error('Accept invite failed:', error.message);
    res.status(500).json({ error: 'An unexpected server error occurred.' });
  } finally {
    client.release();
  }
});

module.exports = router;