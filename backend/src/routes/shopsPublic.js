// backend/src/routes/shopsPublic.js
//
// Public shop endpoints — no auth required, same as the product catalog.
//
// Visibility rule (SQL, used in every list query):
//   s.is_platform_owned = TRUE
//   OR (s.status = 'active' AND (
//        (s.trial_ends_at IS NOT NULL AND s.trial_ends_at > NOW())
//     OR (s.paid_until   IS NOT NULL AND s.paid_until   > NOW())
//   ))
//
// A shop hidden by this rule:
//   - does not appear in GET /shops
//   - its detail returns 404
//   - its products do not appear in GET /shops/:slug/products
//   - its products are also filtered out of GET /api/products (see catalogue.js)

const express = require('express');
const { toAbsoluteUrl } = require('../utils/url');
const pool = require('../db');

const router = express.Router();



const VISIBILITY_SQL = `(
  s.is_platform_owned = TRUE
  OR (
    s.status = 'active' AND (
      (s.trial_ends_at IS NOT NULL AND s.trial_ends_at > NOW())
      OR (s.paid_until IS NOT NULL AND s.paid_until > NOW())
    )
  )
)`;

async function getExchangeRate(client, currency) {
  if (!currency || currency === 'ZAR') return 1;
  const r = await client.query('SELECT rate_to_base FROM exchange_rates WHERE currency_code = $1', [currency]);
  return r.rows.length > 0 ? Number(r.rows[0].rate_to_base) : 1;
}

function isPositiveInteger(v) {
  return /^\d+$/.test(String(v)) && Number(v) > 0;
}

// ---------------------------------------------------------------------------
// GET /api/shops/meta/types — fixed shop type taxonomy for mobile filter chips
// Must be registered BEFORE /shops/:slug or Express treats "meta" as a slug.
// ---------------------------------------------------------------------------
router.get('/shops/meta/types', async (_req, res) => {
  try {
    const result = await pool.query(
      `SELECT key, label FROM shop_types WHERE is_active = TRUE ORDER BY sort_order ASC`
    );
    res.json({ data: result.rows });
  } catch (error) {
    console.error('Failed to fetch shop types:', error.message);
    res.status(500).json({ error: 'An unexpected server error occurred.' });
  }
});

// ---------------------------------------------------------------------------
// GET /api/shops — list visible shops
// Filters: shop_type, city, product_type, search
// ---------------------------------------------------------------------------
router.get('/shops', async (req, res) => {
  const page = Math.max(1, Number(req.query.page || 1));
  const limit = Math.min(100, Math.max(1, Number(req.query.limit || 20)));
  const offset = (page - 1) * limit;

  const conditions = [VISIBILITY_SQL];
  const values = [];

  if (req.query.shop_type) {
    if (!SHOP_TYPES.some((t) => t.key === req.query.shop_type)) {
      return res.status(400).json({ error: 'Invalid shop_type.' });
    }
    values.push(req.query.shop_type);
    conditions.push(`s.shop_type = $${values.length}`);
  }

  if (req.query.city) {
    if (typeof req.query.city !== 'string' || req.query.city.length > 100) {
      return res.status(400).json({ error: 'Invalid city.' });
    }
    values.push(req.query.city.trim());
    conditions.push(`LOWER(s.city) = LOWER($${values.length})`);
  }

  if (req.query.product_type) {
    values.push(req.query.product_type);
    conditions.push(
      `EXISTS (SELECT 1 FROM products p2 WHERE p2.shop_id = s.id AND p2.product_type = $${values.length} AND p2.status = 'active')`
    );
  }

  if (req.query.search) {
    if (typeof req.query.search !== 'string' || req.query.search.length > 100) {
      return res.status(400).json({ error: 'Search too long.' });
    }
    values.push(`%${req.query.search.trim()}%`);
    conditions.push(
      `(s.name ILIKE $${values.length} OR COALESCE(s.tagline,'') ILIKE $${values.length})`
    );
  }

  const where = `WHERE ${conditions.join(' AND ')}`;

  try {
    const count = await pool.query(
      `SELECT COUNT(*)::int AS total FROM shops s ${where}`,
      values
    );
    const listValues = [...values, limit, offset];

    const result = await pool.query(
      `SELECT s.id, s.name, s.slug, s.tagline, s.description,
              s.logo_url, s.banner_url, s.shop_type,
              s.city, s.province, s.country,
              s.avg_rating, s.review_count,
              s.is_platform_owned, s.created_at,
              (s.is_platform_owned = TRUE OR s.status = 'active') AS is_verified,
              (SELECT COUNT(*)::int FROM products p
                WHERE p.shop_id = s.id AND p.status = 'active') AS product_count
         FROM shops s
         ${where}
         ORDER BY s.is_platform_owned DESC, s.avg_rating DESC, s.created_at DESC
         LIMIT $${listValues.length - 1} OFFSET $${listValues.length}`,
      listValues
    );

    res.json({
      data: result.rows.map((r) => ({
        ...r,
        logo_url: toAbsoluteUrl(req, r.logo_url),
        banner_url: toAbsoluteUrl(req, r.banner_url),
      })),
      pagination: {
        page, limit, total: count.rows[0].total,
        totalPages: Math.ceil(count.rows[0].total / limit),
      },
    });
  } catch (error) {
    console.error('List shops (public) failed:', error.message);
    res.status(500).json({ error: 'An unexpected server error occurred.' });
  }
});

// ---------------------------------------------------------------------------
// GET /api/shops/:slug — public shop detail
// ---------------------------------------------------------------------------
router.get('/shops/:slug', async (req, res) => {
  const slug = String(req.params.slug || '');
  if (!slug || slug.length > 140) {
    return res.status(400).json({ error: 'Invalid shop slug.' });
  }
  try {
    const shopRes = await pool.query(
      `SELECT s.*,
              (s.is_platform_owned = TRUE OR s.status = 'active') AS is_verified,
              (SELECT COUNT(*)::int FROM products p
                WHERE p.shop_id = s.id AND p.status = 'active') AS product_count
         FROM shops s
        WHERE s.slug = $1 AND ${VISIBILITY_SQL}`,
      [slug]
    );
    if (shopRes.rows.length === 0) {
      return res.status(404).json({ error: 'Shop not found.' });
    }
    const shop = shopRes.rows[0];

    const typesRes = await pool.query(
      'SELECT product_type FROM shop_product_types WHERE shop_id = $1 ORDER BY product_type',
      [shop.id]
    );

    res.json({
      data: {
        ...shop,
        logo_url: toAbsoluteUrl(req, shop.logo_url),
        banner_url: toAbsoluteUrl(req, shop.banner_url),
        product_types: typesRes.rows.map((r) => r.product_type),
      },
    });
  } catch (error) {
    console.error('Get shop (public) failed:', error.message);
    res.status(500).json({ error: 'An unexpected server error occurred.' });
  }
});

// ---------------------------------------------------------------------------
// GET /api/shops/:slug/products — that shop's active products
// ---------------------------------------------------------------------------
router.get('/shops/:slug/products', async (req, res) => {
  const slug = String(req.params.slug || '');
  if (!slug || slug.length > 140) {
    return res.status(400).json({ error: 'Invalid shop slug.' });
  }

  const page = Math.max(1, Number(req.query.page || 1));
  const limit = Math.min(100, Math.max(1, Number(req.query.limit || 20)));
  const offset = (page - 1) * limit;
  const currency = req.query.currency || 'ZAR';

  try {
    const shopRes = await pool.query(
      `SELECT id FROM shops s WHERE s.slug = $1 AND ${VISIBILITY_SQL}`,
      [slug]
    );
    if (shopRes.rows.length === 0) {
      return res.status(404).json({ error: 'Shop not found.' });
    }
    const shopId = shopRes.rows[0].id;

    const rate = await getExchangeRate(pool, currency);

    const conditions = ["p.status = 'active'", 'p.shop_id = $1'];
    const values = [shopId];

    if (req.query.categoryId) {
      if (!isPositiveInteger(req.query.categoryId)) {
        return res.status(400).json({ error: 'Invalid categoryId.' });
      }
      values.push(Number(req.query.categoryId));
      conditions.push(`p.category_id = $${values.length}`);
    }
    if (req.query.type) {
      if (typeof req.query.type !== 'string' || !req.query.type.trim()) {
        return res.status(400).json({ error: 'Invalid type.' });
      }
      values.push(req.query.type.trim());
      conditions.push(`p.product_type = $${values.length}`);
    }
    if (req.query.search) {
      values.push(`%${req.query.search}%`);
      conditions.push(
        `(p.name ILIKE $${values.length} OR COALESCE(p.description,'') ILIKE $${values.length})`
      );
    }

    const where = `WHERE ${conditions.join(' AND ')}`;

    const count = await pool.query(
      `SELECT COUNT(*)::int AS total FROM products p ${where}`,
      values
    );

    const listValues = [...values, limit, offset, currency];
    const list = await pool.query(
      `SELECT p.id, p.name, p.slug, p.description, p.product_type,
              COALESCE(pcp.price, p.price * ${rate})::numeric(12,2) AS price,
              p.status, p.has_configurator, p.condition, p.created_at,
              c.id AS category_id, c.name AS category_name,
              b.id AS brand_id, b.name AS brand_name,
              (SELECT pi.image_url FROM product_images pi
                WHERE pi.product_id = p.id AND pi.is_primary = TRUE LIMIT 1) AS primary_image
         FROM products p
         JOIN categories c ON c.id = p.category_id
         LEFT JOIN brands b ON b.id = p.brand_id
         LEFT JOIN product_currency_prices pcp
           ON pcp.product_id = p.id AND pcp.currency_code = $${listValues.length}
         ${where}
         ORDER BY p.created_at DESC, p.id DESC
         LIMIT $${listValues.length - 2} OFFSET $${listValues.length - 1}`,
      listValues
    );

    res.json({
      data: list.rows.map((r) => ({
        ...r,
        primary_image: toAbsoluteUrl(req, r.primary_image),
      })),
      pagination: {
        page, limit, total: count.rows[0].total,
        totalPages: Math.ceil(count.rows[0].total / limit),
      },
    });
  } catch (error) {
    console.error('List shop products (public) failed:', error.message);
    res.status(500).json({ error: 'An unexpected server error occurred.' });
  }
});

module.exports = router;