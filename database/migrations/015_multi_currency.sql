-- 015_multi_currency.sql
BEGIN;

-- 1. Store manual exchange rates (e.g., 1 ZAR = 0.054 USD)
CREATE TABLE exchange_rates (
    id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    currency_code VARCHAR(3) NOT NULL UNIQUE, -- 'USD', 'GBP', 'EUR'
    rate_to_base  NUMERIC(10,4) NOT NULL,     -- e.g., 0.0540 (1 ZAR = 0.054 USD)
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Insert a starting dummy rate for USD and GBP
INSERT INTO exchange_rates (currency_code, rate_to_base) VALUES ('USD', 0.0530), ('GBP', 0.0420);

-- 2. Add base currency to products (defaulting to ZAR)
ALTER TABLE products ADD COLUMN base_currency VARCHAR(3) NOT NULL DEFAULT 'ZAR';

-- 3. Allow specific price overrides per currency
CREATE TABLE product_currency_prices (
    id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    product_id    BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    currency_code VARCHAR(3) NOT NULL,
    price         NUMERIC(12,2) NOT NULL CHECK (price >= 0),
    UNIQUE(product_id, currency_code)
);

-- 4. Add currency tracking to orders
ALTER TABLE orders ADD COLUMN currency VARCHAR(3) NOT NULL DEFAULT 'ZAR';
ALTER TABLE orders ADD COLUMN exchange_rate NUMERIC(10,4) NOT NULL DEFAULT 1.0000;
ALTER TABLE orders ADD COLUMN base_total NUMERIC(12,2) NOT NULL DEFAULT 0;
-- Note: base_total stores the ZAR equivalent for accounting, even if the customer paid in USD.

COMMIT;