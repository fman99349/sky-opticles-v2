-- 012_create_user_addresses.sql
BEGIN;

CREATE TABLE user_addresses (
    id             BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id        BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    label          VARCHAR(50), -- e.g., 'Home', 'Work'
    recipient_name VARCHAR(120) NOT NULL,
    phone          VARCHAR(40) NOT NULL,
    line1          VARCHAR(200) NOT NULL,
    line2          VARCHAR(200),
    city           VARCHAR(100) NOT NULL,
    postal_code    VARCHAR(20) NOT NULL,
    province       VARCHAR(100) NOT NULL,
    country        VARCHAR(80) NOT NULL DEFAULT 'South Africa',
    is_default     BOOLEAN NOT NULL DEFAULT FALSE,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Prevent a user from having multiple default addresses
CREATE UNIQUE INDEX user_addresses_default_idx 
    ON user_addresses(user_id) 
    WHERE is_default = TRUE;

CREATE INDEX idx_user_addresses_user ON user_addresses(user_id);

COMMIT;