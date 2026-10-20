-- 003_create_admins.sql
-- Adds the administrator account table for the desktop app.
-- Additive only. Does not touch categories, brands, products, variants,
-- product_images, or users.
--
-- Admins are a separate account model from customers (users table).
-- They are never created by the desktop app or the mobile app.
-- They are created by the one-time script backend/scripts/create-admin.js.

BEGIN;

CREATE TABLE admins (
    id             BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name           VARCHAR(120) NOT NULL,
    email          VARCHAR(180) NOT NULL,
    password_hash  TEXT NOT NULL,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Case-insensitive uniqueness: A@x.com and a@x.com are the same admin.
CREATE UNIQUE INDEX admins_email_lower_idx ON admins (LOWER(email));

COMMIT;