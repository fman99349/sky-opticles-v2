-- 009_add_variant_images_and_color.sql
-- Two additive nullable columns for the variant colour picker feature.
--
-- 1. product_variants.color_hex
--    Hex colour so the mobile picker can render actual colour swatches
--    (e.g. #1a1a1a for Black, #6b4423 for Brown). Optional — admin chooses
--    when creating or editing a variant.
--
-- 2. product_images.variant_id
--    Optional reference linking an image to a specific variant.
--    NULL means "product-wide" — the image is shown as a fallback for every
--    variant that has no image of its own. Existing images keep working
--    unchanged because their variant_id is NULL by default.
--    ON DELETE SET NULL so deleting a variant does not delete its images.
--
-- Both columns are nullable, so no existing row needs to be updated.

BEGIN;

ALTER TABLE product_variants ADD COLUMN color_hex VARCHAR(7);

ALTER TABLE product_images
    ADD COLUMN variant_id BIGINT
    REFERENCES product_variants(id) ON DELETE SET NULL;

CREATE INDEX idx_images_variant ON product_images(variant_id);

COMMIT;