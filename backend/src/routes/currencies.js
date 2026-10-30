const express = require('express');
const pool = require('../db');

const router = express.Router();

// GET /api/currencies
// GET /api/currencies
router.get('/currencies', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT currency_code, rate_to_base FROM exchange_rates ORDER BY currency_code ASC`
    );
    
    // Start with ZAR
    const currencies = [{ code: 'ZAR', rate: 1 }];
    
    // Add the rest from the database, skipping ZAR if it exists
    for (const r of result.rows) {
      if (r.currency_code !== 'ZAR') {
        currencies.push({ code: r.currency_code, rate: Number(r.rate_to_base) });
      }
    }
    
    res.json({ data: currencies });
  } catch (error) {
    console.error('Failed to fetch currencies:', error.message);
    res.status(500).json({ error: 'An unexpected server error occurred.' });
  }
});

module.exports = router;