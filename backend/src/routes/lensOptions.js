const express = require('express');
const pool = require('../db');

const router = express.Router();

// GET /api/lens-options
router.get('/lens-options', async (req, res) => {
  const currency = req.query.currency || 'ZAR';
  let rate = 1;

  if (currency !== 'ZAR') {
    const rateRes = await pool.query('SELECT rate_to_base FROM exchange_rates WHERE currency_code = $1', [currency]);
    if (rateRes.rows.length > 0) rate = Number(rateRes.rows[0].rate_to_base);
  }

  try {
    const groupsResult = await pool.query(
      `SELECT id, group_key, label, help_title, help_body,
              applies_to, sort_order
       FROM lens_option_groups
       ORDER BY sort_order ASC, id ASC`
    );

    const optionsResult = await pool.query(
      `SELECT id, group_id, option_key, label, 
              (price_delta * ${rate})::numeric(10,2) AS price_delta,
              overlay_color, sort_order
       FROM lens_options
       ORDER BY group_id ASC, sort_order ASC, id ASC`
    );

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

    res.json({ data: { groups, currency } });
  } catch (error) {
    console.error('List lens options failed:', error.message);
    res.status(500).json({ error: 'An unexpected server error occurred.' });
  }
});

module.exports = router;