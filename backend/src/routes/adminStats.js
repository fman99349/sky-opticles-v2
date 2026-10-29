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






// ---------------------------------------------------------------------------
// GET /api/admin/me/stats — seller-scoped dashboard
//
// Returns stats for the caller's shop only. Platform owner can hit it too,
// but receives the same aggregate view as /admin/stats with scope=owner
// (the frontend uses /admin/stats for owners, so this endpoint is seller-first).
//
// Order stats approximate "orders containing this shop's items" until the
// per-shop fulfillment split lands. Revenue is attributed by line item —
// accurate.
// ---------------------------------------------------------------------------
router.get('/admin/me/stats', requireAdmin, async (req, res) => {
  const isOwner = req.admin.is_platform_owner === true;

  let shopId = null;
  if (!isOwner) {
    const shopRes = await pool.query(
      `SELECT s.id FROM shop_memberships sm
         JOIN shops s ON s.id = sm.shop_id
        WHERE sm.admin_id = $1
        LIMIT 1`,
      [req.admin.id]
    );
    if (shopRes.rows.length === 0) {
      return res.json({
        data: {
          scope: 'seller',
          has_shop: false,
          activeProducts: 0,
          totalProducts: 0,
          totalOrders: 0,
          paidOrders: 0,
          totalRevenue: 0,
          aov: 0,
          chartData: [],
          fulfillmentData: [],
          topProducts: [],
        },
      });
    }
    shopId = shopRes.rows[0].id;
  }

  const shopWhere = isOwner ? '' : 'AND p.shop_id = $1';
  const shopParams = isOwner ? [] : [shopId];

  const shopFilterOnProducts = isOwner ? '' : 'WHERE shop_id = $1';
  const shopFilterOnActive = isOwner
    ? "WHERE status = 'active'"
    : "WHERE status = 'active' AND shop_id = $1";
  const shopFilterOnTotal = isOwner ? '' : 'WHERE shop_id = $1';

  try {
    const [
      activeProductsRes,
      totalProductsRes,
      orderAggRes,
      last7Res,
      fulfillmentRes,
      topProductsRes,
    ] = await Promise.all([
      pool.query(
        `SELECT COUNT(*)::int AS c FROM products ${shopFilterOnActive}`,
        shopParams
      ),
      pool.query(
        `SELECT COUNT(*)::int AS c FROM products ${shopFilterOnTotal}`,
        shopParams
      ),
      pool.query(
        `SELECT
           COUNT(DISTINCT oi.order_id)::int AS total_orders,
           COUNT(DISTINCT CASE WHEN o.payment_status = 'paid' THEN oi.order_id END)::int AS paid_orders,
           COALESCE(SUM(CASE WHEN o.payment_status = 'paid' THEN oi.line_total ELSE 0 END), 0)::float AS revenue
         FROM order_items oi
         JOIN orders o ON o.id = oi.order_id
         JOIN products p ON p.id = oi.product_id
         WHERE o.deleted_at IS NULL ${shopWhere}`,
        shopParams
      ),
      pool.query(
        `WITH last_7_days AS (
           SELECT generate_series(CURRENT_DATE - INTERVAL '6 days', CURRENT_DATE, '1 day'::interval)::date AS date
         )
         SELECT to_char(d.date, 'Dy') AS day,
                COALESCE(COUNT(DISTINCT oi.order_id), 0)::int AS orders,
                COALESCE(SUM(CASE WHEN o.payment_status = 'paid' THEN oi.line_total ELSE 0 END), 0)::float AS revenue
         FROM last_7_days d
         LEFT JOIN orders o ON DATE(o.created_at) = d.date AND o.deleted_at IS NULL
         LEFT JOIN order_items oi ON oi.order_id = o.id AND oi.product_id IN (
           SELECT id FROM products ${shopFilterOnProducts}
         )
         GROUP BY d.date
         ORDER BY d.date ASC`,
        shopParams
      ),
      pool.query(
        `SELECT o.fulfillment_status AS status, COUNT(DISTINCT o.id)::int AS count
           FROM orders o
           JOIN order_items oi ON oi.order_id = o.id
           JOIN products p ON p.id = oi.product_id
          WHERE o.deleted_at IS NULL ${shopWhere}
          GROUP BY o.fulfillment_status`,
        shopParams
      ),
      pool.query(
        `SELECT p.name, p.id AS product_id,
                COUNT(*)::int AS order_count,
                SUM(oi.line_total)::float AS revenue
           FROM order_items oi
           JOIN orders o ON o.id = oi.order_id
           JOIN products p ON p.id = oi.product_id
          WHERE o.payment_status = 'paid' AND o.deleted_at IS NULL ${shopWhere}
          GROUP BY p.id, p.name
          ORDER BY revenue DESC
          LIMIT 5`,
        shopParams
      ),
    ]);

    const totalOrders = orderAggRes.rows[0].total_orders || 0;
    const totalRevenue = orderAggRes.rows[0].revenue || 0;
    const aov = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    res.json({
      data: {
        scope: isOwner ? 'owner' : 'seller',
        has_shop: true,
        activeProducts: activeProductsRes.rows[0].c,
        totalProducts: totalProductsRes.rows[0].c,
        totalOrders,
        paidOrders: orderAggRes.rows[0].paid_orders || 0,
        totalRevenue,
        aov,
        chartData: last7Res.rows,
        fulfillmentData: fulfillmentRes.rows,
        topProducts: topProductsRes.rows,
      },
    });
  } catch (error) {
    console.error('Admin me stats failed:', error.message);
    res.status(500).json({ error: 'An unexpected server error occurred.' });
  }
});





























module.exports = router;