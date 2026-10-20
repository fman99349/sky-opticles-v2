-- 010_add_lens_layer.sql
-- Adds an optional "lens layer" PNG to product images.
--
-- The lens layer is a transparent PNG the same dimensions as the product
-- photo, with the lens area drawn in WHITE and everything else transparent.
-- The mobile app tints this PNG (via Image tintColor) and overlays it on
-- the product photo — so only the lens changes colour, not the frame.
--
-- When a product image has no lens layer, the mobile app falls back to the
-- old behaviour (a translucent tint covering the whole image).
--
-- Additive only. No existing rows are affected.

BEGIN;

ALTER TABLE product_images ADD COLUMN lens_layer_url TEXT;

COMMIT;