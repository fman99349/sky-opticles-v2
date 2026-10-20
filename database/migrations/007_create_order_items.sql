-- 007_create_order_items.sql
-- Individual line items belonging to an order. Additive only.
--
-- Snapshot principle, most important here:
--
--   product_name, product_slug, variant_sku, base_price, lens_delta,
--   unit_price, lens_config
--
-- are COPIED at purchase time and never re-read from the catalogue.
-- A product can be renamed, repriced, or deleted entirely and past orders
-- remain accurate. That is what customers and accountants need.
--
-- product_id and variant_id are kept as WEAK references (ON DELETE SET NULL).
-- They exist so the admin can offer a "view current product" link, but the
-- order's own numbers never depend on them.
--
-- prescription_id is also a weak reference. If the prescription row is ever
-- deleted, the order still knows what was ordered.

BEGIN;

CREATE TABLE order_items (
    id                BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    order_id          BIGINT NOT NULL
        REFERENCES orders(id) ON DELETE CASCADE,

    -- Weak references — survive product/variant/prescription deletion
    product_id        BIGINT REFERENCES products(id)          ON DELETE SET NULL,
    variant_id        BIGINT REFERENCES product_variants(id)  ON DELETE SET NULL,
    prescription_id   BIGINT REFERENCES prescriptions(id)     ON DELETE SET NULL,

    -- Snapshot at purchase time
    product_name      VARCHAR(200) NOT NULL,
    product_slug      VARCHAR(220),
    variant_sku       VARCHAR(80),
    lens_config       JSONB NOT NULL DEFAULT '{}'::jsonb,

    -- Money at purchase time
    base_price        NUMERIC(12,2) NOT NULL CHECK (base_price >= 0),
    lens_delta        NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (lens_delta >= 0),
    unit_price        NUMERIC(12,2) NOT NULL CHECK (unit_price >= 0),
    quantity          INTEGER NOT NULL CHECK (quantity > 0),
    line_total        NUMERIC(12,2) NOT NULL CHECK (line_total >= 0),

    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_order_items_order ON order_items(order_id);
CREATE INDEX idx_order_items_product ON order_items(product_id);

COMMIT;