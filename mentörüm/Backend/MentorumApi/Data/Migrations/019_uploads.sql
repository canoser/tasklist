-- 019_uploads.sql
-- Dosya depolama: R2 geçici tampon + alıcı/cihaz bazlı teslimat takibi.

CREATE TABLE IF NOT EXISTS uploads (
    id UUID PRIMARY KEY,
    program_id UUID NOT NULL REFERENCES coaching_programs(id) ON DELETE CASCADE,
    sender_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    recipient_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    course_id UUID NULL REFERENCES courses(id) ON DELETE SET NULL,
    homework_id UUID NULL REFERENCES homework_assignments(id) ON DELETE SET NULL,
    student_question_id UUID NULL REFERENCES student_questions(id) ON DELETE SET NULL,
    object_key TEXT NOT NULL UNIQUE,
    content_type TEXT NOT NULL,
    size_bytes BIGINT NOT NULL,
    original_name TEXT NOT NULL,
    status VARCHAR(16) NOT NULL DEFAULT 'PENDING' CHECK(status IN ('PENDING','UPLOADED','DELETED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS upload_deliveries (
    id UUID PRIMARY KEY,
    upload_id UUID NOT NULL REFERENCES uploads(id) ON DELETE CASCADE,
    recipient_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    direction VARCHAR(8) NOT NULL CHECK(direction IN ('IN','OUT')),
    status VARCHAR(16) NOT NULL DEFAULT 'PENDING' CHECK(status IN ('PENDING','DOWNLOADED')),
    device_id UUID NULL,
    local_path TEXT NULL,
    file_hash TEXT NULL,
    delivered_at TIMESTAMPTZ NULL
);

CREATE TABLE IF NOT EXISTS user_devices (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    device_uid TEXT NOT NULL,
    platform VARCHAR(16) NOT NULL CHECK(platform IN ('web','android','ios')),
    label TEXT NOT NULL,
    first_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, device_uid)
);

CREATE INDEX IF NOT EXISTS idx_uploads_program ON uploads(program_id);
CREATE INDEX IF NOT EXISTS idx_uploads_recipient ON uploads(recipient_user_id);
CREATE INDEX IF NOT EXISTS idx_deliveries_upload ON upload_deliveries(upload_id);
