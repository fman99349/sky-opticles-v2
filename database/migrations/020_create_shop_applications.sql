-- Migration: shop_applications
-- Stores seller applications from the public "Sell on DD Marketplace" form.
-- Applications are reviewed manually by admin, then converted into invites.

CREATE TABLE IF NOT EXISTS shop_applications (
  id                SERIAL PRIMARY KEY,
  reference_code    VARCHAR(20) UNIQUE NOT NULL,

  full_name         VARCHAR(120) NOT NULL,
  email             VARCHAR(180) NOT NULL,
  phone             VARCHAR(40)  NOT NULL,
  whatsapp          VARCHAR(40)  NOT NULL,
  business_name     VARCHAR(120),

  city              VARCHAR(100) NOT NULL,
  province          VARCHAR(100) NOT NULL,
  country           VARCHAR(80)  NOT NULL DEFAULT 'South Africa',

  shop_types        JSONB NOT NULL DEFAULT '[]'::jsonb,
  currencies        JSONB NOT NULL DEFAULT '[]'::jsonb,
  time_frame        VARCHAR(50) NOT NULL,

  description       TEXT,

  status            VARCHAR(20) NOT NULL DEFAULT 'pending',
  admin_notes       TEXT,
  invited_at        TIMESTAMPTZ,
  rejection_reason  TEXT,

  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT shop_applications_status_check
    CHECK (status IN ('pending', 'contacted', 'invited', 'rejected'))
);

CREATE INDEX IF NOT EXISTS idx_shop_applications_email
  ON shop_applications (LOWER(email));
CREATE INDEX IF NOT EXISTS idx_shop_applications_status
  ON shop_applications (status);
CREATE INDEX IF NOT EXISTS idx_shop_applications_created
  ON shop_applications (created_at DESC);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION set_shop_applications_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_shop_applications_updated ON shop_applications;
CREATE TRIGGER trg_shop_applications_updated
  BEFORE UPDATE ON shop_applications
  FOR EACH ROW EXECUTE FUNCTION set_shop_applications_updated_at();