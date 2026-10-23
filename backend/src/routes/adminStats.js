const express = require('express');
const pool = require('../db');
const { requireAdmin } = require('./adminAuth');

const router = express.Router();

// GET /api/admin/stats
router.get('/admin/stats', requireAdmin, async (req, res) => {
  try {
    const [
      productsRes,
      ordersRes,
      revenueRes,
      categoriesRes,
      recentOrdersRes,
      fulfillmentRes
    ] = await Promise.all([
      // 1. Total Active Products
      pool.query("SELECT COUNT(*)::int AS count FROM products WHERE status = 'active'"),
      
      // 2. Total Orders (excluding deleted)
      pool.query("SELECT COUNT(*)::int AS count FROM orders WHERE deleted_at IS NULL"),
      
      // 3. Total Revenue (Paid orders only, using base_total for accurate ZAR accounting)
      pool.query("SELECT COALESCE(SUM(base_total), 0)::float AS revenue FROM orders WHERE payment_status = 'paid' AND deleted_at IS NULL"),
      
      // 4. Total Categories
      pool.query("SELECT COUNT(*)::int AS count FROM categories WHERE is_active = TRUE"),
      
      // 5. Revenue & Orders over the last 7 days (for the Line Chart)
      pool.query(`
        WITH last_7_days AS (
          SELECT generate_series(CURRENT_DATE - INTERVAL '6 days', CURRENT_DATE, '1 day'::interval)::date AS date
        )
        SELECT 
          to_char(d.date, 'Dy') AS day,
          COALESCE(COUNT(o.id), 0)::int AS orders,
          COALESCE(SUM(o.base_total), 0)::float AS revenue
        FROM last_7_days d
        LEFT JOIN orders o ON DATE(o.created_at) = d.date AND o.deleted_at IS NULL
        GROUP BY d.date
        ORDER BY d.date ASC
      `),
      
      // 6. Orders by Fulfillment Status (for the Bar Chart)
      pool.query(`
        SELECT fulfillment_status AS status, COUNT(*)::int AS count 
        FROM orders 
        WHERE deleted_at IS NULL 
        GROUP BY fulfillment_status
      `)
    ]);

    const totalOrders = ordersRes.rows[0].count;
    const totalRevenue = revenueRes.rows[0].revenue;
    
    // Calculate Average Order Value
    const aov = totalOrders > 0 ? (totalRevenue / totalOrders) : 0;

    res.json({
      data: {
        totalProducts: productsRes.rows[0].count,
        totalOrders,
        totalRevenue,
        aov,
        totalCategories: categoriesRes.rows[0].count,
        chartData: recentOrdersRes.rows,
        fulfillmentData: fulfillmentRes.rows
      }
    });
  } catch (error) {
    console.error('Admin stats failed:', error.message);
    res.status(500).json({ error: 'An unexpected server error occurred.' });
  }
});

module.exports = router;