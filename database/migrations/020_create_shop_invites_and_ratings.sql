-- 020_create_shop_invites_and_ratings.sql
--
-- Adds:
--   1. shops.avg_rating + review_count (cheap to add now; painful to backfill later)
--   2. shop_invites — one-time-use invite tokens for seller onboarding
--
-- Run once. Do not re-run.

BEGIN;

-- 1. Shop ratings (no reviews system yet — columns stay at 0 until that exists)
ALTER TABLE shops
  ADD COLUMN avg_rating   NUMERIC(3,2) NOT NULL DEFAULT 0
    CHECK (avg_rating >= 0 AND avg_rating <= 5),
  ADD COLUMN review_count INTEGER      NOT NULL DEFAULT 0
    CHECK (review_count >= 0);

-- 2. Shop invites
CREATE TABLE shop_invites (
  id                     BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  token                  VARCHAR(64)  NOT NULL UNIQUE,
  email                  VARCHAR(180) NOT NULL,
  invited_by_admin_id    BIGINT       NOT NULL REFERENCES admins(id) ON DELETE RESTRICT,
  expires_at             TIMESTAMPTZ  NOT NULL,
  accepted_at            TIMESTAMPTZ,
  accepted_admin_id      BIGINT       REFERENCES admins(id) ON DELETE SET NULL,
  revoked_at             TIMESTAMPTZ,
  created_at             TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Prevent two pending invites for the same email
CREATE UNIQUE INDEX one_pending_invite_per_email
  ON shop_invites(LOWER(email))
  WHERE accepted_at IS NULL AND revoked_at IS NULL;

-- Fast lookup for pending invites list
CREATE INDEX idx_shop_invites_pending
  ON shop_invites(created_at DESC)
  WHERE accepted_at IS NULL AND revoked_at IS NULL;

COMMIT;