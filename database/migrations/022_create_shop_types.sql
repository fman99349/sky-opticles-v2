-- 022_create_shop_types.sql
BEGIN;

CREATE TABLE shop_types (
    id SERIAL PRIMARY KEY,
    key VARCHAR(50) UNIQUE NOT NULL,
    label VARCHAR(100) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO shop_types (key, label, sort_order) VALUES
  ('independent', 'Independent', 1),
  ('boutique',    'Boutique',    2),
  ('brand',       'Brand',       3),
  ('reseller',    'Reseller',    4),
  ('chain',       'Chain',       5);

COMMIT;