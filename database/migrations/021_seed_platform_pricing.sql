-- 021_seed_platform_pricing.sql
--
-- Seeds the platform_settings rows used by the seller paywall:
--   monthly_price      — ZAR, whole number
--   yearly_price       — ZAR, whole number (usually 10× monthly)
--   contact_email      — where sellers email to subscribe
--   contact_whatsapp   — optional international format, e.g. 27821234567
--
-- These are editable at any time via SQL:
--   UPDATE platform_settings SET value = '249' WHERE key = 'monthly_price';
-- No code change or redeploy needed.

BEGIN;

INSERT INTO platform_settings (key, value) VALUES
  ('monthly_price',    '199'),
  ('yearly_price',     '1999'),
  ('contact_email',    'admin1@gmail.com'),
  ('contact_whatsapp', '')
ON CONFLICT (key) DO NOTHING;

COMMIT;