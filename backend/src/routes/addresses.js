const express = require('express');
const jwt = require('jsonwebtoken');
const pool = require('../db');

const router = express.Router();

// Reusable auth middleware (customer only)
async function requireCustomer(req, res, next) {
  const header = req.headers.authorization || '';
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match) return res.status(401).json({ error: 'Missing Authorization header.' });

  const secret = process.env.JWT_SECRET;
  if (!secret) return res.status(500).json({ error: 'Server auth not configured.' });

  let payload;
  try {
    payload = jwt.verify(match[1], secret);
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token.' });
  }

  if (payload.role === 'admin') return res.status(403).json({ error: 'Customer access required.' });

  try {
    const result = await pool.query('SELECT id FROM users WHERE id = $1', [payload.sub]);
    if (result.rows.length === 0) return res.status(401).json({ error: 'Account not found.' });
    req.userId = result.rows[0].id;
    next();
  } catch (error) {
    res.status(500).json({ error: 'Auth check failed.' });
  }
}

function handleError(res, error, operation) {
  console.error(`${operation}:`, error.message);
  if (error.code === '23505') return res.status(409).json({ error: 'A default address already exists.' });
  return res.status(500).json({ error: 'An unexpected server error occurred.' });
}

// GET /api/addresses
router.get('/addresses', requireCustomer, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM user_addresses 
       WHERE user_id = $1 
       ORDER BY is_default DESC, created_at DESC`,
      [req.userId]
    );
    res.json({ data: result.rows });
  } catch (error) {
    handleError(res, error, 'List addresses failed');
  }
});

// POST /api/addresses
router.post('/addresses', requireCustomer, async (req, res) => {
  const { label, recipientName, phone, line1, line2, city, postalCode, province, country, isDefault } = req.body;

  if (!recipientName || !phone || !line1 || !city || !postalCode || !province) {
    return res.status(400).json({ error: 'Missing required address fields.' });
  }

  const client = await pool.connect();
  let tx = false;

  try {
    await client.query('BEGIN');
    tx = true;

    if (isDefault) {
      await client.query('UPDATE user_addresses SET is_default = FALSE WHERE user_id = $1', [req.userId]);
    }

    const result = await client.query(
      `INSERT INTO user_addresses 
        (user_id, label, recipient_name, phone, line1, line2, city, postal_code, province, country, is_default)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [req.userId, label || null, recipientName, phone, line1, line2 || null, city, postalCode, province, country || 'South Africa', isDefault || false]
    );

    await client.query('COMMIT');
    tx = false;
    res.status(201).json({ data: result.rows[0] });
  } catch (error) {
    if (tx) await client.query('ROLLBACK').catch(() => {});
    handleError(res, error, 'Create address failed');
  } finally {
    client.release();
  }
});

// PATCH /api/addresses/:id
router.patch('/addresses/:id', requireCustomer, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'Invalid address ID.' });

  const { label, recipientName, phone, line1, line2, city, postalCode, province, country, isDefault } = req.body;

  const client = await pool.connect();
  let tx = false;

  try {
    await client.query('BEGIN');
    tx = true;

    // Verify ownership
    const check = await client.query('SELECT id FROM user_addresses WHERE id = $1 AND user_id = $2', [id, req.userId]);
    if (check.rows.length === 0) {
      await client.query('ROLLBACK'); tx = false;
      return res.status(404).json({ error: 'Address not found.' });
    }

    if (isDefault) {
      await client.query('UPDATE user_addresses SET is_default = FALSE WHERE user_id = $1', [req.userId]);
    }

    const updates = [];
    const values = [];
    
    if (label !== undefined) { values.push(label); updates.push(`label = $${values.length}`); }
    if (recipientName !== undefined) { values.push(recipientName); updates.push(`recipient_name = $${values.length}`); }
    if (phone !== undefined) { values.push(phone); updates.push(`phone = $${values.length}`); }
    if (line1 !== undefined) { values.push(line1); updates.push(`line1 = $${values.length}`); }
    if (line2 !== undefined) { values.push(line2); updates.push(`line2 = $${values.length}`); }
    if (city !== undefined) { values.push(city); updates.push(`city = $${values.length}`); }
    if (postalCode !== undefined) { values.push(postalCode); updates.push(`postal_code = $${values.length}`); }
    if (province !== undefined) { values.push(province); updates.push(`province = $${values.length}`); }
    if (country !== undefined) { values.push(country); updates.push(`country = $${values.length}`); }
    if (isDefault !== undefined) { values.push(isDefault); updates.push(`is_default = $${values.length}`); }

    if (updates.length === 0) {
      await client.query('ROLLBACK'); tx = false;
      return res.status(400).json({ error: 'No fields to update.' });
    }

    updates.push('updated_at = NOW()');
    values.push(id);
    values.push(req.userId);

    const result = await client.query(
      `UPDATE user_addresses SET ${updates.join(', ')} 
       WHERE id = $${values.length - 1} AND user_id = $${values.length} RETURNING *`,
      values
    );

    await client.query('COMMIT');
    tx = false;
    res.json({ data: result.rows[0] });
  } catch (error) {
    if (tx) await client.query('ROLLBACK').catch(() => {});
    handleError(res, error, 'Update address failed');
  } finally {
    client.release();
  }
});

// DELETE /api/addresses/:id
router.delete('/addresses/:id', requireCustomer, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'Invalid address ID.' });

  try {
    const result = await pool.query(
      'DELETE FROM user_addresses WHERE id = $1 AND user_id = $2 RETURNING id',
      [id, req.userId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Address not found.' });
    res.json({ data: { deleted: true } });
  } catch (error) {
    handleError(res, error, 'Delete address failed');
  }
});

module.exports = router;