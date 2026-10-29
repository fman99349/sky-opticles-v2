// backend/src/middleware/shopAccess.js
//
// Authorization layer for the multi-seller marketplace.
//
// Sits AFTER requireAdmin. Every route that touches shop-owned data
// (products, variants, images, 3D models, orders, shop profile) must
// use requireShopAccess and then scope its queries via accessibleShopIds(req).
//
// Platform owners bypass the shop restriction entirely — they see and act
// on every shop. Sellers (non-platform-owners) are confined to their own
// shop (v1: exactly one shop per seller).

const pool = require('../db');

// Loads the caller's shop context. Requires req.admin (set by requireAdmin).
// Sets:
//   req.admin.shops - shops this admin can access
//                     (platform owner: all; seller: their one shop)
//   req.shop        - seller's shop row, or null for platform owner
async function requireShopAccess(req, res, next) {
  if (!req.admin) {
    return res.status(401).json({ error: 'Authentication required.' });
  }

  try {
    if (req.admin.is_platform_owner) {
      const { rows } = await pool.query(
        `SELECT * FROM shops ORDER BY created_at ASC`
      );
      req.admin.shops = rows;
      req.shop = null;
      return next();
    }

    const { rows } = await pool.query(
      `SELECT s.*, sm.role
         FROM shop_memberships sm
         JOIN shops s ON s.id = sm.shop_id
        WHERE sm.admin_id = $1
        ORDER BY sm.created_at ASC`,
      [req.admin.id]
    );

    if (rows.length === 0) {
      return res.status(403).json({
        error: 'No shop is assigned to this account. Contact the platform administrator.',
      });
    }
    if (rows.length > 1) {
      // v1 contract: one shop per seller. If we later allow many, swap to
      // a shop_id query param validated against this list.
      return res.status(409).json({
        error: 'Multiple shops per account are not supported yet.',
      });
    }

    req.admin.shops = rows;
    req.shop = rows[0];
    return next();
  } catch (err) {
    console.error('requireShopAccess failed:', err.message);
    return res.status(500).json({ error: 'An unexpected server error occurred.' });
  }
}

// Returns null for platform owner (no restriction), else array of shop IDs.
function accessibleShopIds(req) {
  if (req.admin?.is_platform_owner) return null;
  return (req.admin?.shops || []).map((s) => Number(s.id));
}

// Boolean check for a single row.
function canAccessShop(req, shopId) {
  if (req.admin?.is_platform_owner) return true;
  return (req.admin?.shops || []).some((s) => Number(s.id) === Number(shopId));
}

// Returns the shop row if accessible, or null. Use for 404 responses so we
// don't leak existence of another seller's shop.
function findAccessibleShop(req, shopId) {
  return (req.admin?.shops || []).find((s) => Number(s.id) === Number(shopId)) || null;
}

// Single source of truth: can this shop appear to customers right now?
// Used by the public Shop endpoints AND by the product listing filter.
//
// Rules:
//   - Platform shop: always visible.
//   - Non-active status (draft/pending/rejected/suspended/closed): hidden.
//   - Trial still running, OR paid_until in future: visible.
//   - Trial expired and no paid_until: hidden (paywall state).
function isShopVisibleToCustomers(shop) {
  if (!shop) return false;
  if (shop.is_platform_owned) return true;
  if (shop.status !== 'active') return false;
  const now = new Date();
  const trialActive = shop.trial_ends_at && new Date(shop.trial_ends_at) > now;
  const paidActive = shop.paid_until && new Date(shop.paid_until) > now;
  return Boolean(trialActive || paidActive);
}

module.exports = {
  requireShopAccess,
  accessibleShopIds,
  canAccessShop,
  findAccessibleShop,
  isShopVisibleToCustomers,
};