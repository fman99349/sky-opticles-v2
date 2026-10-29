// backend/src/routes/shopsSeller.js
//
// Seller-side shop management.
//
// Every route uses requireAdmin, then resolves the caller's shop via
// shop_memberships INSIDE the handler. This is deliberate: the platform
// owner has a shop too (SKY OPTICLES), and requireShopAccess nulls req.shop
// for platform owners, so it's not the right tool here.
//
// Rules (confirmed with product owner):
//   - One shop per seller admin (enforced by DB index)
//   - seller creates draft → edits → submits → platform approves → active
//   - editing name/tagline/description/logo/banner/location/shop_type is free
//     once active
//   - ADDING product types to an active shop sets status back to 'pending'
//     (re-approval). Removing types is immediate.
//   - trial starts when platform owner approves (not on creation)

const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const pool = require('../db');
const { requireAdmin } = require('./adminAuth');
const { isShopVisibleToCustomers } = require('../middleware/shopAccess');

// Reads the 4 paywall-related settings. Falls back to safe defaults if the
// migration hasn't run — sellers see something sensible instead of an error.
async function getPlatformPricing() {
  const r = await pool.query(
    `SELECT key, value FROM platform_settings
      WHERE key IN ('monthly_price','yearly_price','contact_email','contact_whatsapp')`
  );
  const map = Object.fromEntries(r.rows.map((row) => [row.key, row.value]));
  return {
    monthly_price: Number(map.monthly_price) || 199,
    yearly_price: Number(map.yearly_price) || 1999,
    contact_email: map.contact_email || '',
    contact_whatsapp: map.contact_whatsapp || '',
  };
}
const { toAbsoluteUrl } = require('../utils/url');

const router = express.Router();

const SHOPS_DIR = path.join(__dirname, '..', '..', 'uploads', 'shops');
fs.mkdirSync(SHOPS_DIR, { recursive: true });

const ALLOWED_PRODUCT_TYPES = [
  'optical_frame',
  'sunglasses',
  'lenses',
  'contact_lenses',
  'accessory',
];
const ALLOWED_SHOP_TYPES = ['independent', 'boutique', 'brand', 'reseller', 'chain'];
const ALLOWED_IMAGE_MIMES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const EXT_BY_IMAGE_MIME = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp' };
const MAX_IMAGE_BYTES = 2 * 1024 * 1024;

// ---------------------------------------------------------------------------
// Upload storage — folder per shop, one filename per asset kind
// ---------------------------------------------------------------------------
const shopImageStorage = multer.diskStorage({
  destination: (req, _file, cb) => {
    const shopId = req._myShop?.id;
    if (!shopId) return cb(new Error('No shop context for upload.'));
    const dir = path.join(SHOPS_DIR, String(shopId));
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const kind = req._uploadKind || 'asset';
    const ext = EXT_BY_IMAGE_MIME[file.mimetype] || '.bin';
    const rand = crypto.randomBytes(6).toString('hex');
    cb(null, `${kind}-${Date.now()}-${rand}${ext}`);
  },
});

const shopImageUpload = multer({
  storage: shopImageStorage,
  limits: { fileSize: MAX_IMAGE_BYTES },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_IMAGE_MIMES.has(file.mimetype)) {
      return cb(new Error('Only JPG, PNG, and WebP files are allowed.'));
    }
    cb(null, true);
  },
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function isValidEmail(v) {
  return typeof v === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
}

function makeSlug(value) {
  return String(value)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function findUniqueSlug(baseSlug) {
  let slug = baseSlug;
  let n = 1;
  for (;;) {
    const r = await pool.query('SELECT 1 FROM shops WHERE slug = $1', [slug]);
    if (r.rows.length === 0) return slug;
    n++;
    slug = `${baseSlug}-${n}`;
    if (n > 100) throw new Error('Could not allocate unique shop slug.');
  }
}

async function getMyShop(adminId) {
  const r = await pool.query(
    `SELECT s.*, sm.role
       FROM shop_memberships sm
       JOIN shops s ON s.id = sm.shop_id
      WHERE sm.admin_id = $1
      ORDER BY sm.created_at ASC
      LIMIT 1`,
    [adminId]
  );
  return r.rows[0] || null;
}

async function loadShopProductTypes(shopId) {
  const r = await pool.query(
    'SELECT product_type FROM shop_product_types WHERE shop_id = $1 ORDER BY product_type',
    [shopId]
  );
  return r.rows.map((x) => x.product_type);
}

function computeBilling(shop) {
  const now = new Date();
  const trialActive = shop.trial_ends_at && new Date(shop.trial_ends_at) > now;
  const paidActive = shop.paid_until && new Date(shop.paid_until) > now;
  const isPlatformOwned = !!shop.is_platform_owned;

  const daysLeftInTrial = trialActive
    ? Math.max(
        0,
        Math.ceil((new Date(shop.trial_ends_at) - now) / (1000 * 60 * 60 * 24))
      )
    : null;

  return {
    is_visible_to_customers: isShopVisibleToCustomers(shop),
    requires_payment: !isPlatformOwned && shop.status === 'active' && !trialActive && !paidActive,
    trial_active: !!trialActive,
    trial_expired: !!shop.trial_ends_at && !trialActive,
    paid_active: !!paidActive,
    trial_ends_at: shop.trial_ends_at,
    paid_until: shop.paid_until,
    days_left_in_trial: daysLeftInTrial,
  };
}

async function formatShopResponse(shop) {
  const productTypes = await loadShopProductTypes(shop.id);
  return {
    shop: { ...shop, product_types: productTypes },
    billing: computeBilling(shop),
  };
}

function validateShopFields(body, { partial = false } = {}) {
  const out = {};
  const errors = [];

  if (!partial || body.name !== undefined) {
    if (typeof body.name !== 'string' || body.name.trim().length < 2 || body.name.trim().length > 120) {
      errors.push('name must be 2-120 characters.');
    } else out.name = body.name.trim();
  }

  if (body.tagline !== undefined) {
    if (body.tagline === null || body.tagline === '') out.tagline = null;
    else if (typeof body.tagline !== 'string' || body.tagline.length > 140) errors.push('tagline max 140 chars.');
    else out.tagline = body.tagline.trim();
  }

  if (body.description !== undefined) {
    if (body.description === null || body.description === '') out.description = null;
    else if (typeof body.description !== 'string' || body.description.length > 5000) errors.push('description max 5000 chars.');
    else out.description = body.description.trim();
  }

  if (!partial || body.shop_type !== undefined) {
    if (!ALLOWED_SHOP_TYPES.includes(body.shop_type)) errors.push(`shop_type must be one of: ${ALLOWED_SHOP_TYPES.join(', ')}.`);
    else out.shop_type = body.shop_type;
  }

  if (!partial || body.city !== undefined) {
    if (typeof body.city !== 'string' || !body.city.trim() || body.city.trim().length > 100) errors.push('city is required (max 100).');
    else out.city = body.city.trim();
  }

  if (!partial || body.province !== undefined) {
    if (typeof body.province !== 'string' || !body.province.trim() || body.province.trim().length > 100) errors.push('province is required (max 100).');
    else out.province = body.province.trim();
  }

  if (!partial || body.country !== undefined) {
    if (typeof body.country !== 'string' || !body.country.trim() || body.country.trim().length > 80) errors.push('country is required (max 80).');
    else out.country = body.country.trim();
  }

  if (body.postal_code !== undefined) {
    if (body.postal_code === null || body.postal_code === '') out.postal_code = null;
    else if (typeof body.postal_code !== 'string' || body.postal_code.length > 20) errors.push('postal_code max 20 chars.');
    else out.postal_code = body.postal_code.trim();
  }

  if (body.contact_email !== undefined) {
    if (body.contact_email === null || body.contact_email === '') out.contact_email = null;
    else if (!isValidEmail(body.contact_email)) errors.push('contact_email must be a valid email.');
    else out.contact_email = body.contact_email.trim();
  }

  if (body.contact_phone !== undefined) {
    if (body.contact_phone === null || body.contact_phone === '') out.contact_phone = null;
    else if (typeof body.contact_phone !== 'string' || body.contact_phone.length > 40) errors.push('contact_phone max 40 chars.');
    else out.contact_phone = body.contact_phone.trim();
  }

  return { ok: errors.length === 0, errors, data: out };
}

// ---------------------------------------------------------------------------
// GET /api/admin/me/shop — read own shop (or null)
// ---------------------------------------------------------------------------
router.get('/admin/me/shop', requireAdmin, async (req, res) => {
  try {
    const shop = await getMyShop(req.admin.id);
    if (!shop) {
      return res.json({ data: { shop: null, billing: null, platform: await getPlatformPricing() } });
    }
    const [formatted, platform] = await Promise.all([
      formatShopResponse(shop),
      getPlatformPricing(),
    ]);
    res.json({ data: { shop: formatted.shop, billing: formatted.billing, platform } });
  } catch (error) {
    console.error('Get my shop failed:', error.message);
    res.status(500).json({ error: 'An unexpected server error occurred.' });
  }
});

// ---------------------------------------------------------------------------
// POST /api/admin/me/shop — create draft shop
// ---------------------------------------------------------------------------
router.post('/admin/me/shop', requireAdmin, async (req, res) => {
  const existing = await getMyShop(req.admin.id);
  if (existing) {
    return res.status(409).json({ error: 'You already have a shop.' });
  }

  const v = validateShopFields(req.body, { partial: false });
  if (!v.ok) return res.status(400).json({ error: v.errors.join(' ') });

  const { product_types } = req.body || {};
  const validProductTypes = Array.isArray(product_types) ? [...new Set(product_types.filter((t) => ALLOWED_PRODUCT_TYPES.includes(t)))] : [];

  const slug = await findUniqueSlug(makeSlug(v.data.name));

  const client = await pool.connect();
  let tx = false;
  try {
    await client.query('BEGIN');
    tx = true;

    const shopRes = await client.query(
      `INSERT INTO shops
         (name, slug, tagline, description, shop_type,
          city, province, country, postal_code,
          contact_email, contact_phone, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'draft')
       RETURNING *`,
      [
        v.data.name, slug, v.data.tagline ?? null, v.data.description ?? null,
        v.data.shop_type, v.data.city, v.data.province, v.data.country,
        v.data.postal_code ?? null, v.data.contact_email ?? null, v.data.contact_phone ?? null,
      ]
    );
    const shop = shopRes.rows[0];

    await client.query(
      `INSERT INTO shop_memberships (shop_id, admin_id, role) VALUES ($1, $2, 'owner')`,
      [shop.id, req.admin.id]
    );

    for (const pt of validProductTypes) {
      await client.query(
        'INSERT INTO shop_product_types (shop_id, product_type) VALUES ($1, $2)',
        [shop.id, pt]
      );
    }

    await client.query('COMMIT');
    tx = false;

    const { shop: fullShop, billing } = await formatShopResponse(shop);
    res.status(201).json({ data: { shop: fullShop, billing } });
  } catch (error) {
    if (tx) await client.query('ROLLBACK').catch(() => {});
    console.error('Create shop failed:', error.message);
    res.status(500).json({ error: 'An unexpected server error occurred.' });
  } finally {
    client.release();
  }
});

// ---------------------------------------------------------------------------
// PATCH /api/admin/me/shop — edit own shop
// ---------------------------------------------------------------------------
router.patch('/admin/me/shop', requireAdmin, async (req, res) => {
  const shop = await getMyShop(req.admin.id);
  if (!shop) return res.status(404).json({ error: 'You do not have a shop yet.' });

  if (['suspended', 'closed'].includes(shop.status)) {
    return res.status(409).json({ error: `Cannot edit a shop with status "${shop.status}".` });
  }

  const v = validateShopFields(req.body, { partial: true });
  if (!v.ok) return res.status(400).json({ error: v.errors.join(' ') });

  const { product_types } = req.body || {};
  let newProductTypes = null;
  if (product_types !== undefined) {
    if (!Array.isArray(product_types) || product_types.length === 0) {
      return res.status(400).json({ error: 'At least one product type is required.' });
    }
    const invalid = product_types.filter((t) => !ALLOWED_PRODUCT_TYPES.includes(t));
    if (invalid.length > 0) {
      return res.status(400).json({ error: `Invalid product type(s): ${invalid.join(', ')}.` });
    }
    newProductTypes = [...new Set(product_types)];
  }

  const setClauses = [];
  const values = [];
  for (const [col, val] of Object.entries(v.data)) {
    values.push(val);
    setClauses.push(`${col} = $${values.length}`);
  }

  const statusChange = null;

  if (setClauses.length === 0) {
    return res.status(400).json({ error: 'No fields to update.' });
  }
  setClauses.push('updated_at = NOW()');
  values.push(shop.id);

  const client = await pool.connect();
  let tx = false;
  try {
    await client.query('BEGIN');
    tx = true;

    const result = await client.query(
      `UPDATE shops SET ${setClauses.join(', ')} WHERE id = $${values.length} RETURNING *`,
      values
    );

    if (newProductTypes !== null) {
      await client.query('DELETE FROM shop_product_types WHERE shop_id = $1', [shop.id]);
      for (const pt of newProductTypes) {
        await client.query(
          'INSERT INTO shop_product_types (shop_id, product_type) VALUES ($1, $2)',
          [shop.id, pt]
        );
      }
    }

    await client.query('COMMIT');
    tx = false;

    const { shop: fullShop, billing } = await formatShopResponse(result.rows[0]);
    res.json({ data: { shop: fullShop, billing, status_changed_to: statusChange } });
  } catch (error) {
    if (tx) await client.query('ROLLBACK').catch(() => {});
    console.error('Update shop failed:', error.message);
    res.status(500).json({ error: 'An unexpected server error occurred.' });
  } finally {
    client.release();
  }
});

// ---------------------------------------------------------------------------
// POST /api/admin/me/shop/submit — draft/rejected → pending
// ---------------------------------------------------------------------------
router.post('/admin/me/shop/submit', requireAdmin, async (req, res) => {
  const shop = await getMyShop(req.admin.id);
  if (!shop) return res.status(404).json({ error: 'You do not have a shop yet.' });

  if (!['draft', 'rejected'].includes(shop.status)) {
    return res.status(409).json({ error: `Cannot submit from status "${shop.status}".` });
  }
  if (!shop.contact_email) {
    return res.status(400).json({ error: 'Add a contact email before submitting.' });
  }
  // Product-type declaration no longer required for submission.

  const r = await pool.query(
    `UPDATE shops SET status = 'pending', rejection_reason = NULL, updated_at = NOW()
       WHERE id = $1 RETURNING *`,
    [shop.id]
  );

  const { shop: fullShop, billing } = await formatShopResponse(r.rows[0]);
  res.json({ data: { shop: fullShop, billing } });
});

// ---------------------------------------------------------------------------
// POST /api/admin/me/shop/withdraw — pending → draft (seller cancels)
// ---------------------------------------------------------------------------
router.post('/admin/me/shop/withdraw', requireAdmin, async (req, res) => {
  const shop = await getMyShop(req.admin.id);
  if (!shop) return res.status(404).json({ error: 'You do not have a shop yet.' });
  if (shop.status !== 'pending') {
    return res.status(409).json({ error: `Cannot withdraw from status "${shop.status}".` });
  }

  const r = await pool.query(
    `UPDATE shops SET status = 'draft', updated_at = NOW() WHERE id = $1 RETURNING *`,
    [shop.id]
  );
  const { shop: fullShop, billing } = await formatShopResponse(r.rows[0]);
  res.json({ data: { shop: fullShop, billing } });
});

// ---------------------------------------------------------------------------
// POST /api/admin/me/shop/logo and /banner — image uploads
// ---------------------------------------------------------------------------
async function uploadShopAsset(req, res, kind) {
  const shop = await getMyShop(req.admin.id);
  if (!shop) return res.status(404).json({ error: 'You do not have a shop yet.' });
  if (['suspended', 'closed'].includes(shop.status)) {
    return res.status(409).json({ error: `Cannot upload to a shop with status "${shop.status}".` });
  }
  req._myShop = shop;
  req._uploadKind = kind;

  shopImageUpload.single('file')(req, res, async (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') return res.status(413).json({ error: 'File exceeds 2 MB.' });
      return res.status(400).json({ error: err.message || 'Upload failed.' });
    }
    if (!req.file) return res.status(400).json({ error: 'No file uploaded (field name must be "file").' });

    const storedPath = `/uploads/shops/${shop.id}/${req.file.filename}`;
    const col = kind === 'logo' ? 'logo_url' : 'banner_url';
    const previous = shop[col];

    try {
      const r = await pool.query(
        `UPDATE shops SET ${col} = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
        [storedPath, shop.id]
      );

      if (previous && typeof previous === 'string' && previous.startsWith(`/uploads/shops/${shop.id}/`)) {
        try { fs.unlinkSync(path.join(SHOPS_DIR, String(shop.id), path.basename(previous))); } catch {}
      }

      const { shop: fullShop, billing } = await formatShopResponse(r.rows[0]);
      res.status(201).json({ data: { shop: fullShop, billing } });
    } catch (e) {
      try { fs.unlinkSync(req.file.path); } catch {}
      console.error(`Upload ${kind} failed:`, e.message);
      res.status(500).json({ error: 'An unexpected server error occurred.' });
    }
  });
}

router.post('/admin/me/shop/logo', requireAdmin, (req, res) => uploadShopAsset(req, res, 'logo'));
router.post('/admin/me/shop/banner', requireAdmin, (req, res) => uploadShopAsset(req, res, 'banner'));











// ---------------------------------------------------------------------------
// GET /api/admin/me/products — scoped admin product list
// Seller: their own shop's products (all statuses).
// Owner:  all products; can filter by ?shop_id=N.
// ---------------------------------------------------------------------------
router.get('/admin/me/products', requireAdmin, async (req, res) => {
  const isOwner = req.admin.is_platform_owner === true;
  const shop = isOwner ? null : await getMyShop(req.admin.id);

  if (!isOwner && !shop) {
    return res.status(403).json({ error: 'No shop is assigned to this account.' });
  }

  const page = Math.max(1, Number(req.query.page || 1));
  const limit = Math.min(100, Math.max(1, Number(req.query.limit || 50)));
  const offset = (page - 1) * limit;

  const conditions = [];
  const values = [];

  if (isOwner) {
    if (req.query.shop_id) {
      const sid = Number(req.query.shop_id);
      if (!Number.isInteger(sid) || sid < 1) {
        return res.status(400).json({ error: 'Invalid shop_id.' });
      }
      values.push(sid);
      conditions.push(`p.shop_id = $${values.length}`);
    }
  } else {
    values.push(shop.id);
    conditions.push(`p.shop_id = $${values.length}`);
  }

  if (req.query.status) {
    if (!['draft', 'active', 'archived'].includes(req.query.status)) {
      return res.status(400).json({ error: 'Invalid status.' });
    }
    values.push(req.query.status);
    conditions.push(`p.status = $${values.length}`);
  }

  if (req.query.search) {
    if (req.query.search.length > 100) {
      return res.status(400).json({ error: 'Search too long.' });
    }
    values.push(`%${req.query.search}%`);
    conditions.push(
      `(p.name ILIKE $${values.length} OR p.slug ILIKE $${values.length})`
    );
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  try {
    const count = await pool.query(
      `SELECT COUNT(*)::int AS total FROM products p ${where}`,
      values
    );
    const listValues = [...values, limit, offset];
    const list = await pool.query(
      `SELECT p.id, p.name, p.slug, p.status, p.price, p.product_type,
              p.category_id, c.name AS category_name,
              p.brand_id, b.name AS brand_name,
              p.shop_id, s.name AS shop_name, s.slug AS shop_slug,
              (SELECT pi.image_url FROM product_images pi
                WHERE pi.product_id = p.id AND pi.is_primary = TRUE LIMIT 1) AS primary_image,
              (SELECT COUNT(*)::int FROM product_variants pv
                WHERE pv.product_id = p.id) AS variant_count,
              (SELECT COUNT(*)::int FROM product_images pi
                WHERE pi.product_id = p.id) AS image_count
         FROM products p
         JOIN shops s ON s.id = p.shop_id
         JOIN categories c ON c.id = p.category_id
         LEFT JOIN brands b ON b.id = p.brand_id
         ${where}
         ORDER BY p.created_at DESC, p.id DESC
         LIMIT $${listValues.length - 1} OFFSET $${listValues.length}`,
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
    console.error('Admin me products failed:', error.message);
    res.status(500).json({ error: 'An unexpected server error occurred.' });
  }
});

















module.exports = router;