BEGIN;

CREATE TABLE product_3d_models (
    id                BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    product_id        BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    variant_id        BIGINT REFERENCES product_variants(id) ON DELETE CASCADE,
    model_url         TEXT NOT NULL,
    format            VARCHAR(10) NOT NULL DEFAULT 'glb'
        CHECK (format IN ('glb', 'gltf', 'usdz')),
    poster_url        TEXT,
    file_size_bytes   BIGINT,
    is_primary        BOOLEAN NOT NULL DEFAULT FALSE,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX one_primary_3d_model_per_scope
    ON product_3d_models(product_id, COALESCE(variant_id, 0))
    WHERE is_primary = TRUE;

CREATE INDEX idx_3d_models_product ON product_3d_models(product_id);

COMMIT;