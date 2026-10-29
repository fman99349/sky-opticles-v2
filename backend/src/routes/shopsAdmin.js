// backend/src/routes/shopsAdmin.js
//
// Platform owner shop management: browse, approve, reject, suspend, billing.
// All routes require is_platform_owner=true.

const express = require('express');
const pool = require('../db');
const { requireAdmin, requirePlatformOwner } = require('./adminAuth');
const { isShopVisibleToCustomers } = require('../middleware/shopAccess');

const router = express.Router();

async function loadProductTypes(shopId) {
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
  return {
    is_visible_to_customers: isShopVisibleToCustomers(shop),
    trial_active: !!trialActive,
    trial_expired: !!shop.trial_ends_at && !trialActive,
    paid_active: !!paidActive,
    trial_ends_at: shop.trial_ends_at,
    paid_until: shop.paid_until,
  };
}

// GET /api/admin/shops?status=pending&page=1&limit=20
router.get('/admin/shops', requireAdmin, requirePlatformOwner, async (req, res) => {
  const page = Math.max(1, Number(req.query.page || 1));
  const limit = Math.min(100, Math.max(1, Number(req.query.limit || 20)));
  const offset = (page - 1) * limit;

  const conditions = [];
  const values = [];
  if (req.query.status) {
    values.push(req.query.status);
    conditions.push(`status = $${values.length}`);
  }
  if (req.query.search) {
    values.push(`%${req.query.search}%`);
    conditions.push(`(name ILIKE $${values.length} OR slug ILIKE $${values.length})`);
  }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  try {
    const count = await pool.query(`SELECT COUNT(*)::int AS total FROM shops ${where}`, values);
    const listValues = [...values, limit, offset];
    const rows = await pool.query(
      `SELECT * FROM shops ${where}
         ORDER BY
           CASE status
             WHEN 'pending' THEN 0
             WHEN 'draft'   THEN 1
             WHEN 'active'  THEN 2
             ELSE 3
           END,
           created_at DESC
         LIMIT $${listValues.length - 1} OFFSET $${listValues.length}`,
      listValues
    );

    const data = await Promise.all(
      rows.rows.map(async (s) => ({
        ...s,
        product_types: await loadProductTypes(s.id),
        billing: computeBilling(s),
      }))
    );

    res.json({
      data,
      pagination: {
        page, limit, total: count.rows[0].total,
        totalPages: Math.ceil(count.rows[0].total / limit),
      },
    });
  } catch (error) {
    console.error('Admin list shops failed:', error.message);
    res.status(500).json({ error: 'An unexpected server error occurred.' });
  }
});

// GET /api/admin/shops/:id
router.get('/admin/shops/:id', requireAdmin, requirePlatformOwner, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) return res.status(400).json({ error: 'Invalid shop ID.' });
  try {
    const shopRes = await pool.query('SELECT * FROM shops WHERE id = $1', [id]);
    if (shopRes.rows.length === 0) return res.status(404).json({ error: 'Shop not found.' });
    const shop = shopRes.rows[0];
    const [productTypes, members] = await Promise.all([
      loadProductTypes(shop.id),
      pool.query(
        `SELECT a.id, a.name, a.email, sm.role, sm.created_at
           FROM shop_memberships sm JOIN admins a ON a.id = sm.admin_id
          WHERE sm.shop_id = $1`,
        [shop.id]
      ),
    ]);
    res.json({
      data: {
        shop: { ...shop, product_types: productTypes },
        billing: computeBilling(shop),
        members: members.rows,
      },
    });
  } catch (error) {
    console.error('Admin get shop failed:', error.message);
    res.status(500).json({ error: 'An unexpected server error occurred.' });
  }
});

// POST /api/admin/shops/:id/approve  — pending → active, starts trial
router.post('/admin/shops/:id/approve', requireAdmin, requirePlatformOwner, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) return res.status(400).json({ error: 'Invalid shop ID.' });
  try {
    const settings = await pool.query(`SELECT value FROM platform_settings WHERE key = 'trial_days'`);
    const trialDays = Number(settings.rows[0]?.value || 14);
    const trialEnds = new Date(Date.now() + trialDays * 24 * 3600 * 1000);

    const r = await pool.query(
      `UPDATE shops
          SET status = 'active',
              approved_at = NOW(),
              approved_by_admin_id = $1,
              trial_ends_at = $2,
              rejection_reason = NULL,
              updated_at = NOW()
        WHERE id = $3 AND status = 'pending'
        RETURNING *`,
      [req.admin.id, trialEnds, id]
    );
    if (r.rows.length === 0) {
      return res.status(409).json({ error: 'Shop not found or not in pending status.' });
    }
    const shop = r.rows[0];
    res.json({
      data: {
        shop: { ...shop, product_types: await loadProductTypes(shop.id) },
        billing: computeBilling(shop),
      },
    });
  } catch (error) {
    console.error('Approve shop failed:', error.message);
    res.status(500).json({ error: 'An unexpected server error occurred.' });
  }
});

// POST /api/admin/shops/:id/reject  — pending → rejected (requires reason)
router.post('/admin/shops/:id/reject', requireAdmin, requirePlatformOwner, async (req, res) => {
  const id = Number(req.params.id);
  const { reason } = req.body || {};
  if (!Number.isInteger(id) || id < 1) return res.status(400).json({ error: 'Invalid shop ID.' });
  if (typeof reason !== 'string' || !reason.trim() || reason.trim().length > 2000) {
    return res.status(400).json({ error: 'reason is required (max 2000 chars).' });
  }
  try {
    const r = await pool.query(
      `UPDATE shops SET status = 'rejected', rejection_reason = $1, updated_at = NOW()
         WHERE id = $2 AND status = 'pending' RETURNING *`,
      [reason.trim(), id]
    );
    if (r.rows.length === 0) return res.status(409).json({ error: 'Shop not found or not pending.' });
    res.json({ data: { shop: r.rows[0] } });
  } catch (error) {
    console.error('Reject shop failed:', error.message);
    res.status(500).json({ error: 'An unexpected server error occurred.' });
  }
});

// POST /api/admin/shops/:id/suspend — active → suspended
router.post('/admin/shops/:id/suspend', requireAdmin, requirePlatformOwner, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) return res.status(400).json({ error: 'Invalid shop ID.' });
  try {
    const r = await pool.query(
      `UPDATE shops SET status = 'suspended', updated_at = NOW()
         WHERE id = $1 AND status = 'active' RETURNING *`,
      [id]
    );
    if (r.rows.length === 0) return res.status(409).json({ error: 'Shop not active.' });
    res.json({ data: { shop: r.rows[0] } });
  } catch (error) {
    console.error('Suspend shop failed:', error.message);
    res.status(500).json({ error: 'An unexpected server error occurred.' });
  }
});

// POST /api/admin/shops/:id/unsuspend — suspended → active
router.post('/admin/shops/:id/unsuspend', requireAdmin, requirePlatformOwner, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) return res.status(400).json({ error: 'Invalid shop ID.' });
  try {
    const r = await pool.query(
      `UPDATE shops SET status = 'active', updated_at = NOW()
         WHERE id = $1 AND status = 'suspended' RETURNING *`,
      [id]
    );
    if (r.rows.length === 0) return res.status(409).json({ error: 'Shop not suspended.' });
    res.json({ data: { shop: r.rows[0] } });
  } catch (error) {
    console.error('Unsuspend shop failed:', error.message);
    res.status(500).json({ error: 'An unexpected server error occurred.' });
  }
});

// PATCH /api/admin/shops/:id/billing — edit trial_ends_at / paid_until / plan
router.patch('/admin/shops/:id/billing', requireAdmin, requirePlatformOwner, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) return res.status(400).json({ error: 'Invalid shop ID.' });

  const { trial_ends_at, paid_until, subscription_plan } = req.body || {};
  const updates = [];
  const values = [];

  if (trial_ends_at !== undefined) {
    if (trial_ends_at === null) { values.push(null); updates.push(`trial_ends_at = $${values.length}`); }
    else {
      const d = new Date(trial_ends_at);
      if (isNaN(d)) return res.status(400).json({ error: 'Invalid trial_ends_at.' });
      values.push(d); updates.push(`trial_ends_at = $${values.length}`);
    }
  }
  if (paid_until !== undefined) {
    if (paid_until === null) { values.push(null); updates.push(`paid_until = $${values.length}`); }
    else {
      const d = new Date(paid_until);
      if (isNaN(d)) return res.status(400).json({ error: 'Invalid paid_until.' });
      values.push(d); updates.push(`paid_until = $${values.length}`);
    }
  }
  if (subscription_plan !== undefined) {
    values.push(subscription_plan === null ? null : String(subscription_plan).slice(0, 50));
    updates.push(`subscription_plan = $${values.length}`);
  }
  if (updates.length === 0) return res.status(400).json({ error: 'No fields to update.' });

  updates.push('updated_at = NOW()');
  values.push(id);

  try {
    const r = await pool.query(
      `UPDATE shops SET ${updates.join(', ')} WHERE id = $${values.length} RETURNING *`,
      values
    );
    if (r.rows.length === 0) return res.status(404).json({ error: 'Shop not found.' });
    const shop = r.rows[0];
    res.json({
      data: {
        shop: { ...shop, product_types: await loadProductTypes(shop.id) },
        billing: computeBilling(shop),
      },
    });
  } catch (error) {
    console.error('Update billing failed:', error.message);
    res.status(500).json({ error: 'An unexpected server error occurred.' });
  }
});

// POST /api/admin/shops/:id/mark-paid
// Body: { plan: 'monthly' | 'yearly' }
//
// Marks a seller's subscription as paid. Sets paid_until to NOW() + plan
// interval, activates the shop if it wasn't already, and notifies the
// seller. Idempotent — calling again extends from the current paid_until
// if it's still in the future, otherwise from now.
router.post('/admin/shops/:id/mark-paid', requireAdmin, requirePlatformOwner, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) {
    return res.status(400).json({ error: 'Invalid shop ID.' });
  }

  const { plan } = req.body || {};
  if (!['monthly', 'yearly'].includes(plan)) {
    return res.status(400).json({ error: 'plan must be "monthly" or "yearly".' });
  }

  try {
    const r = await pool.query(
      `UPDATE shops
          SET paid_until = GREATEST(COALESCE(paid_until, NOW()), NOW())
                         + CASE $1
                             WHEN 'monthly' THEN INTERVAL '1 month'
                             WHEN 'yearly'  THEN INTERVAL '1 year'
                           END,
              subscription_plan = $1,
              status = 'active',
              updated_at = NOW()
        WHERE id = $2 AND is_platform_owned = FALSE
        RETURNING *`,
      [plan, id]
    );

    if (r.rows.length === 0) {
      return res.status(404).json({ error: 'Shop not found or is the platform shop.' });
    }

    const shop = r.rows[0];

    // Notify the seller (best-effort — failure does not block the response).
    try {
      const owner = await pool.query(
        `SELECT admin_id FROM shop_memberships
          WHERE shop_id = $1 AND role = 'owner' LIMIT 1`,
        [id]
      );
      if (owner.rows.length > 0) {
        const until = new Date(shop.paid_until).toLocaleDateString('en-ZA', {
          day: '2-digit', month: 'short', year: 'numeric',
        });
        await pool.query(
          `INSERT INTO notifications (admin_id, title, message, type)
           VALUES ($1, $2, $3, 'account')`,
          [
            owner.rows[0].admin_id,
            'Subscription active',
            `Your shop "${shop.name}" is live again. Paid through ${until}.`,
          ]
        );
      }
    } catch (notifyErr) {
      console.warn('mark-paid: notification failed:', notifyErr.message);
    }

    res.json({
      data: {
        shop: { ...shop, product_types: await loadProductTypes(shop.id) },
        billing: computeBilling(shop),
      },
    });
  } catch (error) {
    console.error('Mark-paid failed:', error.message);
    res.status(500).json({ error: 'An unexpected server error occurred.' });
  }
});

module.exports = router;