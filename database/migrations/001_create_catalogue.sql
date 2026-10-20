
BEGIN;

-- 1. Product categories
CREATE TABLE categories (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    slug VARCHAR(120) NOT NULL UNIQUE,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Product brands
CREATE TABLE brands (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name VARCHAR(120) NOT NULL UNIQUE,
    slug VARCHAR(140) NOT NULL UNIQUE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Main product records
CREATE TABLE products (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    category_id BIGINT NOT NULL REFERENCES categories(id)
        ON DELETE RESTRICT,
    brand_id BIGINT REFERENCES brands(id)
        ON DELETE RESTRICT,
    name VARCHAR(200) NOT NULL,
    slug VARCHAR(220) NOT NULL UNIQUE,
    description TEXT,
    product_type VARCHAR(30) NOT NULL
        CHECK (product_type IN (
            'optical_frame',
            'sunglasses',
            'lenses',
            'contact_lenses',
            'accessory'
        )),
    price NUMERIC(12, 2) NOT NULL CHECK (price >= 0),
    status VARCHAR(20) NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft', 'active', 'archived')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Product variants: different colours, sizes and SKUs
CREATE TABLE product_variants (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    product_id BIGINT NOT NULL REFERENCES products(id)
        ON DELETE RESTRICT,
    sku VARCHAR(80) NOT NULL UNIQUE,
    color VARCHAR(80),
    frame_material VARCHAR(100),
    frame_shape VARCHAR(80),
    size_label VARCHAR(50),
    price_override NUMERIC(12, 2)
        CHECK (price_override IS NULL OR price_override >= 0),
    stock_quantity INTEGER NOT NULL DEFAULT 0
        CHECK (stock_quantity >= 0),
    reorder_level INTEGER NOT NULL DEFAULT 5
        CHECK (reorder_level >= 0),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Product images
CREATE TABLE product_images (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    product_id BIGINT NOT NULL REFERENCES products(id)
        ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    alt_text VARCHAR(250),
    is_primary BOOLEAN NOT NULL DEFAULT FALSE,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Prevent multiple primary images for the same product.
CREATE UNIQUE INDEX one_primary_image_per_product
    ON product_images(product_id)
    WHERE is_primary = TRUE;

-- Performance indexes
CREATE INDEX idx_products_category
    ON products(category_id);

CREATE INDEX idx_products_brand
    ON products(brand_id);

CREATE INDEX idx_products_status
    ON products(status);

CREATE INDEX idx_variants_product
    ON product_variants(product_id);

CREATE INDEX idx_variants_stock
    ON product_variants(stock_quantity);

CREATE INDEX idx_images_product
    ON product_images(product_id);

COMMIT;
