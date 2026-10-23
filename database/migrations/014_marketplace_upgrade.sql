-- 014_marketplace_upgrade.sql
BEGIN;

-- 1. Add parent_id to categories for Parent -> Child hierarchy
ALTER TABLE categories 
ADD COLUMN parent_id BIGINT REFERENCES categories(id) ON DELETE SET NULL;

-- Index for fast lookup of sub-categories
CREATE INDEX idx_categories_parent ON categories(parent_id);

-- 2. Add condition to products (new or used)
ALTER TABLE products 
ADD COLUMN condition VARCHAR(20) NOT NULL DEFAULT 'new' 
CHECK (condition IN ('new', 'used'));

COMMIT;