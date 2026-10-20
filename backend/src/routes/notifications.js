const express = require('express');
const jwt = require('jsonwebtoken');
const pool = require('../db');
const { requireAdmin } = require('./adminAuth');

const router = express.Router();

// Reusable customer auth (same as orders.js)
async function requireCustomer(req, res, next) {
  const header = req.headers.authorization || '';
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match) return res.status(401).json({ error: 'Missing Authorization header.' });

  const secret = process.env.JWT_SECRET;
  if (!secret) return res.status(500).json({ error: 'Server auth not configured.' });

  let payload;
  try { payload = jwt.verify(match[1], secret); } 
  catch { return res.status(401).json({ error: 'Invalid token.' }); }

  if (payload.role === 'admin') return res.status(403).json({ error: 'Customer access required.' });

  try {
    const result = await pool.query('SELECT id FROM users WHERE id = $1', [payload.sub]);
    if (result.rows.length === 0) return res.status(401).json({ error: 'Account not found.' });
    req.userId = result.rows[0].id;
    next();
  } catch (error) { res.status(500).json({ error: 'Auth check failed.' }); }
}

// ---------------------------------------------------------------------------
// CUSTOMER ROUTES
// ---------------------------------------------------------------------------

// GET /api/notifications
router.get('/notifications', requireCustomer, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM notifications 
       WHERE customer_id = $1 
       ORDER BY created_at DESC LIMIT 50`,
      [req.userId]
    );
    res.json({ data: result.rows });
  } catch (error) {
    res.status(500).json({ error: 'Failed to load notifications.' });
  }
});

// PATCH /api/notifications/read-all
router.patch('/notifications/read-all', requireCustomer, async (req, res) => {
  try {
    await pool.query('UPDATE notifications SET is_read = TRUE WHERE customer_id = $1', [req.userId]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to mark read.' });
  }
});

// PATCH /api/notifications/:id/read
router.patch('/notifications/:id/read', requireCustomer, async (req, res) => {
  try {
    await pool.query('UPDATE notifications SET is_read = TRUE WHERE id = $1 AND customer_id = $2', [req.params.id, req.userId]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to mark read.' });
  }
});

// ---------------------------------------------------------------------------
// ADMIN ROUTES
// ---------------------------------------------------------------------------

// GET /api/admin/notifications
router.get('/admin/notifications', requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM notifications 
       WHERE admin_id = $1 
       ORDER BY created_at DESC LIMIT 50`,
      [req.admin.id]
    );
    res.json({ data: result.rows });
  } catch (error) {
    res.status(500).json({ error: 'Failed to load notifications.' });
  }
});

// PATCH /api/admin/notifications/read-all
router.patch('/admin/notifications/read-all', requireAdmin, async (req, res) => {
  try {
    await pool.query('UPDATE notifications SET is_read = TRUE WHERE admin_id = $1', [req.admin.id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to mark read.' });
  }
});

// PATCH /api/admin/notifications/:id/read
router.patch('/admin/notifications/:id/read', requireAdmin, async (req, res) => {
  try {
    await pool.query('UPDATE notifications SET is_read = TRUE WHERE id = $1 AND admin_id = $2', [req.params.id, req.admin.id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to mark read.' });
  }
});

module.exports = router;