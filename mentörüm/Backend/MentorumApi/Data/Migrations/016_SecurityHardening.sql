-- 016_SecurityHardening.sql
-- Güvenlik sertleştirme: kullanıcı bazlı DB idempotency + kalıcı auth rate limiting.

-- 1. Idempotency (kullanıcı bazlı, in-flight durum yönetimi)
CREATE TABLE IF NOT EXISTS idempotency_keys (
    user_id TEXT NOT NULL,
    key VARCHAR(100) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','COMPLETED')),
    status_code INT NULL,
    response_body TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, key)
);
CREATE INDEX IF NOT EXISTS idx_idempotency_created ON idempotency_keys(created_at);

-- 2. Auth rate limiting (atomik upsert ile kalıcı, işlem sırasında kilitsiz)
CREATE TABLE IF NOT EXISTS auth_attempts (
    bucket TEXT PRIMARY KEY,
    window_start BIGINT NOT NULL,
    attempts INT NOT NULL
);
