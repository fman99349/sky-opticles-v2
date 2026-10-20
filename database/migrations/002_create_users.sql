-- 002_create_users.sql
-- Adds the customer account table for mobile authentication.
-- Additive only. Does not touch categories, brands, products, variants,
-- or product_images.

BEGIN;

CREATE TABLE users (
    id             BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name           VARCHAR(120) NOT NULL,
    email          VARCHAR(180) NOT NULL,
    password_hash  TEXT NOT NULL,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Case-insensitive uniqueness: A@x.com and a@x.com are the same account.
CREATE UNIQUE INDEX users_email_lower_idx ON users (LOWER(email));

COMMIT;