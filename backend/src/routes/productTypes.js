// Product types — read + admin CRUD.
//
// The GET endpoint is public (same as categories, brands). The write
// endpoints follow the current project convention: no auth guard on
// catalogue write routes (categories, brands, products all work the same
// way). Authentication hardening for admin routes is a separate, later pass.

const express = require('express');
const pool = require('../db');

const router = express.Router();

const KEY_PATTERN = /^[a-z][a-z0-9_]*$/;

function validateKey(key) {
  if (typeof key !== 'string') return 'key must be a string.';
  const trimmed = key.trim();
  if (!trimmed) return 'key is required.';
  if (trimmed.length > 50) return 'key must be at most 50 characters.';
  if (!KEY_PATTERN.test(trimmed)) {
    return 'key must start with a letter and contain only a-z, 0-9, and underscores.';
  }
  return null;
}

function validateLabel(label) {
  if (typeof label !== 'string') return 'label must be a string.';
  const trimmed = label.trim();
  if (!trimmed) return 'label is required.';
  if (trimmed.length > 100) return 'label must be at most 100 characters.';
  return null;
}

function handleError(res, error, operation) {
  console.error(`${operation}:`, error.message);
  if (error.code === '23505') {
    return res
      .status(409)
      .json({ error: 'A product type with this key already exists.' });
  }
  return res
    .status(500)
    .json({ error: 'An unexpected server error occurred.' });
}

// GET /api/product-types
router.get('/product-types', async (_req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, key, label, default_has_configurator, sort_order, created_at
       FROM product_types
       ORDER BY sort_order ASC, label ASC`
    );
    res.json({ data: result.rows });
  } catch (error) {
    handleError(res, error, 'List product types failed');
  }
});

// POST /api/product-types
router.post('/product-types', async (req, res) => {
  const { key, label, defaultHasConfigurator, sortOrder } = req.body || {};

  const keyError = validateKey(key);
  if (keyError) return res.status(400).json({ error: keyError });

  const labelError = validateLabel(label);
  if (labelError) return res.status(400).json({ error: labelError });

  if (
    defaultHasConfigurator !== undefined &&
    typeof defaultHasConfigurator !== 'boolean'
  ) {
    return res
      .status(400)
      .json({ error: 'defaultHasConfigurator must be true or false.' });
  }

  const order = sortOrder === undefined ? 0 : Number(sortOrder);
  if (!Number.isInteger(order) || order < 0) {
    return res
      .status(400)
      .json({ error: 'sortOrder must be a non-negative integer.' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO product_types
         (key, label, default_has_configurator, sort_order)
       VALUES ($1, $2, $3, $4)
       RETURNING id, key, label, default_has_configurator, sort_order, created_at`,
      [
        key.trim(),
        label.trim(),
        defaultHasConfigurator === undefined ? false : defaultHasConfigurator,
        order,
      ]
    );
    res.status(201).json({ data: result.rows[0] });
  } catch (error) {
    handleError(res, error, 'Create product type failed');
  }
});

// PATCH /api/product-types/:id
router.patch('/product-types/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: 'Invalid product type ID.' });
  }

  const { key, label, defaultHasConfigurator, sortOrder } = req.body || {};

  const updates = {};
  const values = [];

  if (key !== undefined) {
    const keyError = validateKey(key);
    if (keyError) return res.status(400).json({ error: keyError });
    updates.key = key.trim();
  }

  if (label !== undefined) {
    const labelError = validateLabel(label);
    if (labelError) return res.status(400).json({ error: labelError });
    updates.label = label.trim();
  }

  if (defaultHasConfigurator !== undefined) {
    if (typeof defaultHasConfigurator !== 'boolean') {
      return res
        .status(400)
        .json({ error: 'defaultHasConfigurator must be true or false.' });
    }
    updates.default_has_configurator = defaultHasConfigurator;
  }

  if (sortOrder !== undefined) {
    const order = Number(sortOrder);
    if (!Number.isInteger(order) || order < 0) {
      return res
        .status(400)
        .json({ error: 'sortOrder must be a non-negative integer.' });
    }
    updates.sort_order = order;
  }

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ error: 'No fields to update.' });
  }

  const setClauses = [];
  for (const [col, val] of Object.entries(updates)) {
    values.push(val);
    setClauses.push(`${col} = $${values.length}`);
  }
  values.push(id);

  try {
    const result = await pool.query(
      `UPDATE product_types
       SET ${setClauses.join(', ')}
       WHERE id = $${values.length}
       RETURNING id, key, label, default_has_configurator, sort_order, created_at`,
      values
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Product type not found.' });
    }
    res.json({ data: result.rows[0] });
  } catch (error) {
    handleError(res, error, 'Update product type failed');
  }
});

// DELETE /api/product-types/:id
//
// Removing a type does not affect any products. Because products store
// product_type as a plain string (not a foreign key), existing products
// keep working with their current type label. The row disappears from the
// admin suggestion list, and new products cannot pick it from the dropdown.
// Admin can still type the same key manually if they change their mind.
router.delete('/product-types/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: 'Invalid product type ID.' });
  }

  try {
    const result = await pool.query(
      'DELETE FROM product_types WHERE id = $1 RETURNING id, key, label',
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Product type not found.' });
    }
    res.json({ data: { ...result.rows[0], deleted: true } });
  } catch (error) {
    handleError(res, error, 'Delete product type failed');
  }
});

module.exports = router;