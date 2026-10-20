-- 004_create_prescriptions.sql
-- Stores uploaded prescription files (JPG/PNG/PDF) for signed-in customers.
-- Additive only. Does not touch categories, brands, products, variants,
-- product_images, users, or admins.
--
-- A prescription row is owned by one customer (user_id). Files live on
-- disk under backend/uploads/prescriptions/ with a randomised name; the
-- original filename is preserved in original_name for reference.
-- Deletion of the owning user cascades to their prescriptions, but the
-- physical file is NOT deleted automatically — that cleanup is a future
-- concern. For now, files are kept while the row exists.

BEGIN;

CREATE TABLE prescriptions (
    id             BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id        BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    filename       VARCHAR(255) NOT NULL,
    original_name  VARCHAR(255) NOT NULL,
    mime_type      VARCHAR(100) NOT NULL,
    size_bytes     INTEGER NOT NULL CHECK (size_bytes > 0),
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_prescriptions_user ON prescriptions(user_id);

COMMIT;