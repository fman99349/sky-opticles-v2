-- 019_create_shops_and_marketplace.sql
-- Marketplace foundation: shops, memberships, product-type declarations,
-- platform settings, admin platform-owner flag, and products.shop_id backfill.
--
-- Run once. Do not re-run.
-- After running, see the two manual UPDATE statements at the bottom.

BEGIN;

-- ============================================================
-- 1. Platform settings (admin-editable key/value)
-- ============================================================
CREATE TABLE platform_settings (
  key VARCHAR(100) PRIMARY KEY,
  value TEXT NOT NULL,
  updated_by_admin_id BIGINT REFERENCES admins(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO platform_settings (key, value) VALUES
  ('trial_days', '14');

-- ============================================================
-- 2. Flag one admin as the platform owner
-- ============================================================
-- The platform owner can create/approve shops and see all shops.
-- Mark the actual admin after this migration — see the bottom of this file.
ALTER TABLE admins ADD COLUMN is_platform_owner BOOLEAN NOT NULL DEFAULT FALSE;

-- ============================================================
-- 3. Shops
-- ============================================================
CREATE TABLE shops (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

  -- Identity
  name        VARCHAR(120) NOT NULL,
  slug        VARCHAR(140) NOT NULL UNIQUE,
  tagline     VARCHAR(140),
  description TEXT,

  -- Branding
  logo_url   TEXT,
  banner_url TEXT,

  -- Type (fixed taxonomy — extends via migration if needed)
  shop_type VARCHAR(20) NOT NULL CHECK (shop_type IN (
    'independent','boutique','brand','reseller','chain'
  )),

  -- Location (v1: city-level, no GPS)
  city        VARCHAR(100) NOT NULL,
  province    VARCHAR(100) NOT NULL,
  country     VARCHAR(80)  NOT NULL DEFAULT 'South Africa',
  postal_code VARCHAR(20),

  -- Contact — nullable at DB level so drafts can be saved; app enforces
  -- presence at submit-for-approval time. Platform shop keeps these NULL.
  contact_email VARCHAR(180),
  contact_phone VARCHAR(40),

  -- Platform's own storefront: bypasses billing and approval, cannot be
  -- edited by sellers, always visible.
  is_platform_owned BOOLEAN NOT NULL DEFAULT FALSE,

  -- Lifecycle
  status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN (
    'draft',      -- seller editing, not yet submitted
    'pending',    -- submitted, awaiting platform approval
    'active',     -- approved; visible if trial/paid valid
    'rejected',   -- platform rejected; seller can edit and resubmit
    'suspended',  -- platform suspended; not visible
    'closed'      -- seller closed the shop
  )),
  rejection_reason      TEXT,
  approved_at           TIMESTAMPTZ,
  approved_by_admin_id  BIGINT REFERENCES admins(id) ON DELETE SET NULL,

  -- Billing — visibility computed from these + status, no cron needed
  trial_ends_at     TIMESTAMPTZ,
  paid_until        TIMESTAMPTZ,
  subscription_plan VARCHAR(50),

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Exactly one platform-owned shop
CREATE UNIQUE INDEX only_one_platform_shop
  ON shops(is_platform_owned) WHERE is_platform_owned = TRUE;

-- Discovery query: filter by shop_type, sort by created_at
CREATE INDEX idx_shops_active
  ON shops(shop_type, created_at DESC) WHERE status = 'active';

-- Admin approval queue
CREATE INDEX idx_shops_pending
  ON shops(created_at DESC) WHERE status = 'pending';

-- ============================================================
-- 4. Shop memberships — one shop per seller in v1
-- ============================================================
CREATE TABLE shop_memberships (
  id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  shop_id    BIGINT NOT NULL REFERENCES shops(id)  ON DELETE CASCADE,
  admin_id   BIGINT NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
  role       VARCHAR(20) NOT NULL CHECK (role IN ('owner','staff')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (shop_id, admin_id)
);

-- Enforces "one seller, one shop": an admin can own at most one shop.
-- Drop this index later if you decide to allow multi-shop sellers.
CREATE UNIQUE INDEX one_shop_per_admin_owner
  ON shop_memberships(admin_id) WHERE role = 'owner';

-- ============================================================
-- 5. Declared product types per shop (Option B enforcement)
-- ============================================================
-- Products created by a shop must have product_type IN this set.
-- Enforced in the catalogue route, not by a DB constraint (the
-- products table is shared with the platform shop).
CREATE TABLE shop_product_types (
  shop_id      BIGINT      NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  product_type VARCHAR(30) NOT NULL CHECK (product_type IN (
    'optical_frame','sunglasses','lenses','contact_lenses','accessory'
  )),
  PRIMARY KEY (shop_id, product_type)
);

-- ============================================================
-- 6. Default platform shop + backfill products.shop_id
-- ============================================================
-- The platform's own storefront. Exempt from billing, approval, and
-- category restriction (can list any product type).
INSERT INTO shops (
  name, slug, shop_type, city, province, country,
  is_platform_owned, status, approved_at,
  trial_ends_at, paid_until
) VALUES (
  'SKY OPTICLES', 'sky-opticles', 'brand',
  'Johannesburg', 'Gauteng', 'South Africa',
  TRUE, 'active', NOW(),
  NOW() + INTERVAL '100 years',
  NOW() + INTERVAL '100 years'
);

ALTER TABLE products
  ADD COLUMN shop_id BIGINT REFERENCES shops(id) ON DELETE RESTRICT;

UPDATE products
   SET shop_id = (SELECT id FROM shops WHERE slug = 'sky-opticles')
 WHERE shop_id IS NULL;

ALTER TABLE products ALTER COLUMN shop_id SET NOT NULL;
CREATE INDEX idx_products_shop ON products(shop_id);

-- Platform shop declares every product type (it's the platform itself).
INSERT INTO shop_product_types (shop_id, product_type)
SELECT s.id, t.pt
  FROM shops s,
       (VALUES
         ('optical_frame'),
         ('sunglasses'),
         ('lenses'),
         ('contact_lenses'),
         ('accessory')
       ) AS t(pt)
 WHERE s.slug = 'sky-opticles';

COMMIT;

-- ============================================================
-- AFTER RUNNING THIS MIGRATION — run these manually
-- ============================================================
--
-- 1. Mark yourself as the platform owner (edit the email):
--
--    UPDATE admins SET is_platform_owner = TRUE
--     WHERE LOWER(email) = LOWER('you@example.com');
--
-- 2. Give the platform owner ownership of the platform shop
--    (so the shop appears in their admin alongside their own products):
--
--    INSERT INTO shop_memberships (shop_id, admin_id, role)
--    SELECT s.id, a.id, 'owner'
--      FROM shops s, admins a
--     WHERE s.is_platform_owned = TRUE
--       AND a.is_platform_owner  = TRUE;
--
--
--