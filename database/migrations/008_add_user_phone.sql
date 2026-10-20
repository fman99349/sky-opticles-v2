-- 008_add_user_phone.sql
-- Adds an optional phone number to customer accounts.
-- Used by the mobile Account tab (customer-editable) and pre-filled into
-- the checkout form. NULL is allowed and expected for accounts that have
-- not set it yet.
--
-- Additive only. Does not touch categories, brands, products, variants,
-- product_images, admins, or orders.

BEGIN;

ALTER TABLE users ADD COLUMN phone VARCHAR(40);

COMMIT;