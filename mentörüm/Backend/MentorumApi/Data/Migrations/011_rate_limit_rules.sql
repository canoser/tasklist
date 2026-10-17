-- 011_rate_limit_rules.sql
-- Hız limiti kuralları (admin panelinden düzenlenebilir) + kota ihlal günlüğü.
CREATE TABLE IF NOT EXISTS rate_limit_rules (
    path TEXT PRIMARY KEY,
    max_attempts INTEGER NOT NULL,
    window_seconds INTEGER NOT NULL DEFAULT 300,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by UUID NULL
);

INSERT INTO rate_limit_rules (path, max_attempts, window_seconds) VALUES
    ('/api/v1/auth/login', 40, 300),
    ('/api/v1/auth/register', 40, 300),
    ('/api/v1/auth/google', 40, 300),
    ('/api/v1/invites/send', 20, 300)
ON CONFLICT (path) DO NOTHING;

CREATE TABLE IF NOT EXISTS rate_limit_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    path TEXT NOT NULL,
    ip TEXT NOT NULL,
    attempts INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_rate_limit_events_created ON rate_limit_events(created_at DESC);
