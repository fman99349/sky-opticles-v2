// Public read-only endpoint that serves the lens option catalogue.
// Mobile and backend share this data source for pricing. No auth required:
// browsing lens prices is the same as browsing product prices.
//
// Response shape is snake_case to match the rest of the API (products,
// categories, brands, variants all use snake_case). Mobile converts to its
// own internal camelCase shape at the boundary.

const express = require('express');
const pool = require('../db');

const router = express.Router();

// GET /api/lens-options
// Returns every group with its options nested, ordered by group sort_order
// then option sort_order. One call, no pagination — the total is tiny
// (~10 groups, ~40 options).
router.get('/lens-options', async (_req, res) => {
  try {
    const groupsResult = await pool.query(
      `SELECT id, group_key, label, help_title, help_body,
              applies_to, sort_order
       FROM lens_option_groups
       ORDER BY sort_order ASC, id ASC`
    );

    const optionsResult = await pool.query(
      `SELECT id, group_id, option_key, label, price_delta,
              overlay_color, sort_order
       FROM lens_options
       ORDER BY group_id ASC, sort_order ASC, id ASC`
    );

    // Group options by group_id for O(n) assembly.
    const optionsByGroup = new Map();
    for (const opt of optionsResult.rows) {
      const list = optionsByGroup.get(opt.group_id) || [];
      list.push(opt);
      optionsByGroup.set(opt.group_id, list);
    }

    const groups = groupsResult.rows.map((group) => ({
      id: group.id,
      group_key: group.group_key,
      label: group.label,
      help_title: group.help_title,
      help_body: group.help_body,
      applies_to: group.applies_to,
      sort_order: group.sort_order,
      options: optionsByGroup.get(group.id) || [],
    }));

    res.json({ data: { groups } });
  } catch (error) {
    console.error('List lens options failed:', error.message);
    res.status(500).json({ error: 'An unexpected server error occurred.' });
  }
});

module.exports = router;