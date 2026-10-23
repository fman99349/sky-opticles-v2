-- 016_order_delivery_date.sql
BEGIN;

-- Add the column. Nullable so existing orders don't break,
-- but the backend will populate it for all new orders.
ALTER TABLE orders 
ADD COLUMN estimated_delivery_date TIMESTAMPTZ;

COMMIT;