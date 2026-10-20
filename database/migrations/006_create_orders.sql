-- 006_create_orders.sql
-- Customer orders. Additive only.
--
-- Snapshot principle: customer identity and shipping address are COPIED into
-- each order. They are NOT live-joined to the users table. If a customer
-- later changes their name, email, or address, past orders still show what
-- was true at purchase time. Same for order_items in migration 007.
--
-- Status model — Option B:
--   payment_status:      unpaid | paid | refunded
--                        (only the gateway or a test-mode admin action sets this)
--   fulfillment_status:  pending | processing | shipped | delivered | cancelled
--                        (only the admin sets this)
--
-- archived + deleted_at implement soft-delete. Deleted rows stay for
-- accounting and are hidden from the admin by default.

BEGIN;

-- Order numbers are formatted SO-YYYY-NNNNN in application code.
-- A dedicated sequence keeps them monotonically increasing and unique.
-- Gaps are expected: rolled-back transactions still consume a value. That
-- is normal and correct for real-world order numbering.
CREATE SEQUENCE orders_number_seq START 1;

CREATE TABLE orders (
    id                    BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    order_number          VARCHAR(20) NOT NULL UNIQUE,
    user_id               BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,

    -- Customer snapshot
    customer_name         VARCHAR(120) NOT NULL,
    customer_email        VARCHAR(180) NOT NULL,
    customer_phone        VARCHAR(40)  NOT NULL,

    -- Shipping address snapshot
    shipping_line1        VARCHAR(200) NOT NULL,
    shipping_line2        VARCHAR(200),
    shipping_city         VARCHAR(100) NOT NULL,
    shipping_postal_code  VARCHAR(20)  NOT NULL,
    shipping_province     VARCHAR(100) NOT NULL,
    shipping_country      VARCHAR(80)  NOT NULL DEFAULT 'South Africa',

    -- Money
    subtotal              NUMERIC(12,2) NOT NULL CHECK (subtotal >= 0),
    shipping_cost         NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (shipping_cost >= 0),
    total                 NUMERIC(12,2) NOT NULL CHECK (total >= 0),

    -- Status
    payment_status        VARCHAR(20) NOT NULL DEFAULT 'unpaid'
        CHECK (payment_status IN ('unpaid', 'paid', 'refunded')),
    fulfillment_status    VARCHAR(20) NOT NULL DEFAULT 'pending'
        CHECK (fulfillment_status IN ('pending', 'processing', 'shipped', 'delivered', 'cancelled')),
    paid_at               TIMESTAMPTZ,

    -- Soft-delete + archive
    archived              BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at            TIMESTAMPTZ,

    created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for the queries the app actually makes:
--  - list orders for one customer, newest first
--  - admin list, newest first, excluding soft-deleted
--  - admin filter by payment or fulfillment status
CREATE INDEX idx_orders_user_created
    ON orders(user_id, created_at DESC);

CREATE INDEX idx_orders_created
    ON orders(created_at DESC);

CREATE INDEX idx_orders_payment_status
    ON orders(payment_status);

CREATE INDEX idx_orders_fulfillment_status
    ON orders(fulfillment_status);

CREATE INDEX idx_orders_live
    ON orders(created_at DESC)
    WHERE deleted_at IS NULL;

COMMIT;