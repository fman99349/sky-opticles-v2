const express = require('express');
const pool = require('../db');
const { requireAdmin } = require('./adminAuth');
const { requireShopAccess, accessibleShopIds } = require('../middleware/shopAccess');

const router = express.Router();

// ===========================================================================
// GET /api/admin/stats
//
// Owner: marketplace-wide aggregates (unchanged behaviour).
// Seller: scoped to the caller's shop — products filtered by shop_id,
//         orders/revenue/chart/fulfillment filtered via order_items →
//         products.shop_id, categories limited to categories the shop's
//         products actually use.
// ===========================================================================
router.get('/admin/stats', requireAdmin, requireShopAccess, async (req, res) => {
  const isOwner = req.admin.is_platform_owner === true;
  const shopIds = accessibleShopIds(req); // null for owner, [id] for seller

  // Defensive: a seller with no shop should never reach here (requireShopAccess
  // 403s first), but if that ever changes, fail closed with zeros rather than
  // marketplace-wide data.
  if (!isOwner && (!Array.isArray(shopIds) || shopIds.length === 0)) {
    return res.json({
      data: {
        totalProducts: 0,
        totalOrders: 0,
        totalRevenue: 0,
        aov: 0,
        totalCategories: 0,
        chartData: emptyLast7Days(),
        fulfillmentData: [],
      },
    });
  }

  try {
    const [
      productsRes,
      ordersRes,
      revenueRes,
      categoriesRes,
      recentOrdersRes,
      fulfillmentRes,
    ] = await Promise.all([
      // 1. Total Active Products
      isOwner
        ? pool.query(
            "SELECT COUNT(*)::int AS count FROM products WHERE status = 'active'"
          )
        : pool.query(
            `SELECT COUNT(*)::int AS count
               FROM products
              WHERE status = 'active'
                AND shop_id = ANY($1::bigint[])`,
            [shopIds]
          ),

      // 2. Total Orders (excluding deleted)
      isOwner
        ? pool.query(
            'SELECT COUNT(*)::int AS count FROM orders WHERE deleted_at IS NULL'
          )
        : pool.query(
            `SELECT COUNT(DISTINCT o.id)::int AS count
               FROM orders o
               JOIN order_items oi ON oi.order_id = o.id
               JOIN products p ON p.id = oi.product_id
              WHERE o.deleted_at IS NULL
                AND p.shop_id = ANY($1::bigint[])`,
            [shopIds]
          ),

      // 3. Total Revenue (Paid orders only)
      isOwner
        ? pool.query(
            `SELECT COALESCE(SUM(base_total), 0)::float AS revenue
               FROM orders
              WHERE payment_status = 'paid' AND deleted_at IS NULL`
          )
        : pool.query(
            `SELECT COALESCE(SUM(oi.line_total), 0)::float AS revenue
               FROM order_items oi
               JOIN orders o ON o.id = oi.order_id
               JOIN products p ON p.id = oi.product_id
              WHERE o.payment_status = 'paid'
                AND o.deleted_at IS NULL
                AND p.shop_id = ANY($1::bigint[])`,
            [shopIds]
          ),

      // 4. Total Categories
      //    Owner: all active categories.
      //    Seller: only categories their products actually use.
      isOwner
        ? pool.query(
            'SELECT COUNT(*)::int AS count FROM categories WHERE is_active = TRUE'
          )
        : pool.query(
            `SELECT COUNT(DISTINCT c.id)::int AS count
               FROM categories c
               JOIN products p ON p.category_id = c.id
              WHERE c.is_active = TRUE
                AND p.shop_id = ANY($1::bigint[])`,
            [shopIds]
          ),

      // 5. Last 7 days revenue & orders (Line Chart)
      isOwner
        ? pool.query(`
            WITH last_7_days AS (
              SELECT generate_series(
                CURRENT_DATE - INTERVAL '6 days',
                CURRENT_DATE,
                '1 day'::interval
              )::date AS date
            )
            SELECT
              to_char(d.date, 'Dy') AS day,
              COALESCE(COUNT(o.id), 0)::int AS orders,
              COALESCE(SUM(o.base_total), 0)::float AS revenue
            FROM last_7_days d
            LEFT JOIN orders o
              ON DATE(o.created_at) = d.date AND o.deleted_at IS NULL
            GROUP BY d.date
            ORDER BY d.date ASC
          `)
        : pool.query(
            `
            WITH last_7_days AS (
              SELECT generate_series(
                CURRENT_DATE - INTERVAL '6 days',
                CURRENT_DATE,
                '1 day'::interval
              )::date AS date
            )
            SELECT
              to_char(d.date, 'Dy') AS day,
              COALESCE(COUNT(DISTINCT oi.order_id), 0)::int AS orders,
              COALESCE(
                SUM(CASE WHEN o.payment_status = 'paid' THEN oi.line_total ELSE 0 END),
                0
              )::float AS revenue
            FROM last_7_days d
            LEFT JOIN orders o
              ON DATE(o.created_at) = d.date AND o.deleted_at IS NULL
            LEFT JOIN order_items oi
              ON oi.order_id = o.id
             AND oi.product_id IN (
               SELECT id FROM products WHERE shop_id = ANY($1::bigint[])
             )
            GROUP BY d.date
            ORDER BY d.date ASC
            `,
            [shopIds]
          ),

      // 6. Orders by Fulfillment Status (Bar Chart)
      isOwner
        ? pool.query(`
            SELECT fulfillment_status AS status, COUNT(*)::int AS count
            FROM orders
            WHERE deleted_at IS NULL
            GROUP BY fulfillment_status
          `)
        : pool.query(
            `SELECT o.fulfillment_status AS status,
                    COUNT(DISTINCT o.id)::int AS count
               FROM orders o
               JOIN order_items oi ON oi.order_id = o.id
               JOIN products p ON p.id = oi.product_id
              WHERE o.deleted_at IS NULL
                AND p.shop_id = ANY($1::bigint[])
              GROUP BY o.fulfillment_status`,
            [shopIds]
          ),
    ]);

    const totalOrders = ordersRes.rows[0].count;
    const totalRevenue = revenueRes.rows[0].revenue;
    const aov = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    res.json({
      data: {
        totalProducts: productsRes.rows[0].count,
        totalOrders,
        totalRevenue,
        aov,
        totalCategories: categoriesRes.rows[0].count,
        chartData: recentOrdersRes.rows,
        fulfillmentData: fulfillmentRes.rows,
      },
    });
  } catch (error) {
    console.error('Admin stats failed:', error.message);
    res.status(500).json({ error: 'An unexpected server error occurred.' });
  }
});

// Returns 7 zeroed rows for the last week, used only by the defensive
// "no shop" path above so the frontend chart doesn't render blank.
function emptyLast7Days() {
  const labels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const out = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    out.push({ day: labels[d.getDay()], orders: 0, revenue: 0 });
  }
  return out;
}

// ===========================================================================
// GET /api/admin/me/stats — seller-scoped dashboard
//
// Already shop-scoped; kept unchanged so the seller dashboard keeps its
// richer payload (scope, has_shop, paidOrders, topProducts).
// ===========================================================================
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