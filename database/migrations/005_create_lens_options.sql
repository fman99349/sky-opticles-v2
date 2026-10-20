-- 005_create_lens_options.sql
-- Lens option catalogue, authoritative for backend order validation.
-- Additive only. Does not touch categories, brands, products, variants,
-- images, prescriptions, users, or admins.
--
-- Structure:
--   lens_option_groups  — one row per configurable group (Lens type, Tint, etc.)
--   lens_options        — one row per option within a group, with price
--
-- Two tables because group metadata (label, help text, applies_to) is shared
-- by every option in the group — denormalising into one table would repeat
-- that text once per option.

BEGIN;

CREATE TABLE lens_option_groups (
    id             BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    group_key      VARCHAR(50) NOT NULL UNIQUE,
    label          VARCHAR(100) NOT NULL,
    help_title     VARCHAR(200),
    help_body      TEXT,
    applies_to     TEXT[] NOT NULL,
    sort_order     INTEGER NOT NULL DEFAULT 0,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE lens_options (
    id             BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    group_id       BIGINT NOT NULL
        REFERENCES lens_option_groups(id) ON DELETE CASCADE,
    option_key     VARCHAR(50) NOT NULL,
    label          VARCHAR(100) NOT NULL,
    price_delta    NUMERIC(10,2) NOT NULL CHECK (price_delta >= 0),
    overlay_color  VARCHAR(60),
    sort_order     INTEGER NOT NULL DEFAULT 0,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (group_id, option_key)
);

CREATE INDEX idx_lens_options_group ON lens_options(group_id);

COMMIT;