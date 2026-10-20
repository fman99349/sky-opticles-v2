-- 013_create_notifications.sql
BEGIN;

-- 1. Add Expo Push Token to users
ALTER TABLE users ADD COLUMN expo_push_token VARCHAR(255);

-- 2. Create notifications table
CREATE TABLE notifications (
    id             BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    -- A notification belongs to EITHER a customer OR an admin
    customer_id    BIGINT REFERENCES users(id) ON DELETE CASCADE,
    admin_id       BIGINT REFERENCES admins(id) ON DELETE CASCADE,
    title          VARCHAR(200) NOT NULL,
    message        TEXT NOT NULL,
    type           VARCHAR(50) NOT NULL DEFAULT 'system', -- 'order', 'account', 'system'
    is_read        BOOLEAN NOT NULL DEFAULT FALSE,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Ensure it belongs to one or the other, never both, never neither
    CONSTRAINT check_one_recipient CHECK (
        (customer_id IS NOT NULL AND admin_id IS NULL) OR
        (customer_id IS NULL AND admin_id IS NOT NULL)
    )
);

-- Index for fast fetching of a user's notification history
CREATE INDEX idx_notifications_customer ON notifications(customer_id, created_at DESC) WHERE customer_id IS NOT NULL;
CREATE INDEX idx_notifications_admin ON notifications(admin_id, created_at DESC) WHERE admin_id IS NOT NULL;

COMMIT;