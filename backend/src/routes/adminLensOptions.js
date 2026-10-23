const express = require('express');
const pool = require('../db');
const { requireAdmin } = require('./adminAuth');

const router = express.Router();

// ---------------------------------------------------------------------------
// LENS GROUPS (e.g., Lens Type, Tint, Coating)
// ---------------------------------------------------------------------------

// POST /api/admin/lens-groups
router.post('/admin/lens-groups', requireAdmin, async (req, res) => {
  const { group_key, label, help_title, help_body, applies_to, sort_order = 0 } = req.body;

  if (!group_key || !label || !Array.isArray(applies_to)) {
    return res.status(400).json({ error: 'Missing required fields or applies_to is not an array.' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO lens_option_groups 
        (group_key, label, help_title, help_body, applies_to, sort_order)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [group_key, label, help_title || null, help_body || null, applies_to, sort_order]
    );
    res.status(201).json({ data: result.rows[0] });
  } catch (error) {
    if (error.code === '23505') return res.status(409).json({ error: 'Group key already exists.' });
    res.status(500).json({ error: 'Failed to create lens group.' });
  }
});

// PATCH /api/admin/lens-groups/:id
router.patch('/admin/lens-groups/:id', requireAdmin, async (req, res) => {
  const { label, help_title, help_body, applies_to, sort_order } = req.body;
  
  try {
    const updates = [];
    const values = [];
    
    if (label !== undefined) { values.push(label); updates.push(`label = $${values.length}`); }
    if (help_title !== undefined) { values.push(help_title); updates.push(`help_title = $${values.length}`); }
    if (help_body !== undefined) { values.push(help_body); updates.push(`help_body = $${values.length}`); }
    if (applies_to !== undefined) { values.push(applies_to); updates.push(`applies_to = $${values.length}`); }
    if (sort_order !== undefined) { values.push(sort_order); updates.push(`sort_order = $${values.length}`); }

    if (updates.length === 0) return res.status(400).json({ error: 'No fields to update.' });

    values.push(req.params.id);
    const result = await pool.query(
      `UPDATE lens_option_groups SET ${updates.join(', ')} WHERE id = $${values.length} RETURNING *`,
      values
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Group not found.' });
    res.json({ data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update lens group.' });
  }
});

// DELETE /api/admin/lens-groups/:id
router.delete('/admin/lens-groups/:id', requireAdmin, async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM lens_option_groups WHERE id = $1 RETURNING id', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Group not found.' });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete lens group. (It may be referenced in existing orders).' });
  }
});

// ---------------------------------------------------------------------------
// LENS OPTIONS (e.g., Grey Tint, 1.61 Index)
// ---------------------------------------------------------------------------

// POST /api/admin/lens-options
router.post('/admin/lens-options', requireAdmin, async (req, res) => {
  const { group_id, option_key, label, price_delta, overlay_color, sort_order = 0 } = req.body;

  if (!group_id || !option_key || !label || price_delta === undefined) {
    return res.status(400).json({ error: 'Missing required fields.' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO lens_options 
        (group_id, option_key, label, price_delta, overlay_color, sort_order)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [group_id, option_key, label, price_delta, overlay_color || null, sort_order]
    );
    res.status(201).json({ data: result.rows[0] });
  } catch (error) {
    if (error.code === '23505') return res.status(409).json({ error: 'Option key already exists in this group.' });
    res.status(500).json({ error: 'Failed to create lens option.' });
  }
});

// PATCH /api/admin/lens-options/:id
router.patch('/admin/lens-options/:id', requireAdmin, async (req, res) => {
  const { label, price_delta, overlay_color, sort_order } = req.body;

  try {
    const updates = [];
    const values = [];

    if (label !== undefined) { values.push(label); updates.push(`label = $${values.length}`); }
    if (price_delta !== undefined) { values.push(price_delta); updates.push(`price_delta = $${values.length}`); }
    if (overlay_color !== undefined) { values.push(overlay_color); updates.push(`overlay_color = $${values.length}`); }
    if (sort_order !== undefined) { values.push(sort_order); updates.push(`sort_order = $${values.length}`); }

    if (updates.length === 0) return res.status(400).json({ error: 'No fields to update.' });

    values.push(req.params.id);
    const result = await pool.query(
      `UPDATE lens_options SET ${updates.join(', ')} WHERE id = $${values.length} RETURNING *`,
      values
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Option not found.' });
    res.json({ data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update lens option.' });
  }
});

// DELETE /api/admin/lens-options/:id
router.delete('/admin/lens-options/:id', requireAdmin, async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM lens_options WHERE id = $1 RETURNING id', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Option not found.' });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete lens option.' });
  }
});

module.exports = router;