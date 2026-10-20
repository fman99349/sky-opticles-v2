-- 011_platform_pivot.sql
-- Prepares the platform to sell anything, not just eyewear.
--
-- Changes:
--   1. Create product_types lookup table + seed the current eyewear types.
--   2. Drop the closed CHECK constraint on products.product_type.
--   3. Widen products.product_type to VARCHAR(50).
--   4. Add products.has_configurator (default TRUE so existing eyewear
--      products keep running the wizard).
--   5. Add product_variants.attributes JSONB for non-eyewear specs.
--   6. Add order_items.variant_attributes JSONB so a purchase snapshots
--      the attributes the customer actually ordered.
--
-- Backward compatible: existing products, variants, and orders are
-- unaffected. Non-eyewear products are opt-in (admin turns the configurator
-- off per product).

BEGIN;

-- 1. Product types lookup
CREATE TABLE product_types (
    id                        BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    key                       VARCHAR(50) NOT NULL UNIQUE,
    label                     VARCHAR(100) NOT NULL,
    default_has_configurator  BOOLEAN NOT NULL DEFAULT FALSE,
    sort_order                INTEGER NOT NULL DEFAULT 0,
    created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed the current eyewear types so admin sees them immediately.
INSERT INTO product_types (key, label, default_has_configurator, sort_order)
VALUES
    ('optical_frame',  'Optical Frame',   TRUE, 1),
    ('sunglasses',     'Sunglasses',      TRUE, 2),
    ('lenses',         'Lenses',          TRUE, 3),
    ('contact_lenses', 'Contact Lenses',  TRUE, 4),
    ('accessory',      'Accessory',       TRUE, 5);

-- 2. Drop the closed enum. IF EXISTS protects against a differently named
--    constraint (PostgreSQL auto-names it products_product_type_check).
ALTER TABLE products
    DROP CONSTRAINT IF EXISTS products_product_type_check;

-- 3. Widen the column so longer keys like 'kitchen_equipment' fit.
ALTER TABLE products
    ALTER COLUMN product_type TYPE VARCHAR(50);

-- 4. Per-product toggle: run the configurator wizard or not.
--    Default TRUE keeps every existing eyewear product working as today.
ALTER TABLE products
    ADD COLUMN has_configurator BOOLEAN NOT NULL DEFAULT TRUE;

-- 5. Key/value specs for non-eyewear variants.
--    Empty {} means "use the legacy color/frame_material/frame_shape/
--    size_label columns" — nothing breaks for existing variants.
ALTER TABLE product_variants
    ADD COLUMN attributes JSONB NOT NULL DEFAULT '{}'::jsonb;

-- 6. Snapshot of variant attributes at order time.
--    NULL for existing orders and for eyewear lines that carry only the
--    legacy fields.
ALTER TABLE order_items
    ADD COLUMN variant_attributes JSONB;

COMMIT;