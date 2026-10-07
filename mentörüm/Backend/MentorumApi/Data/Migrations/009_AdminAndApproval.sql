-- 009_AdminAndApproval.sql
-- Süper yönetici (admin = koç + admin bayrağı) + jenerik onay durumu (tüm roller).

-- 1. Admin bayrağı
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT FALSE;

-- 2. Jenerik onay durumu (Koç/Öğrenci/Veli hepsi onaya düşer)
ALTER TABLE users ADD COLUMN IF NOT EXISTS approval_status TEXT NOT NULL DEFAULT 'APPROVED'
    CHECK(approval_status IN ('PENDING','APPROVED','REJECTED'));

-- 3. Mevcut koç onay durumunu users tablosuna taşı (idempotent)
UPDATE users SET approval_status = 'PENDING' WHERE id IN (SELECT id FROM coaches WHERE approval_status = 'PENDING');
UPDATE users SET approval_status = 'REJECTED' WHERE id IN (SELECT id FROM coaches WHERE approval_status = 'REJECTED');

-- 4. Şifre sıfırlama tokenları
CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token TEXT NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    is_used BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);