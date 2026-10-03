-- 003_InviteCode.sql
-- Kısa, insan dostu, yüksek entropili davet kodu (WhatsApp / kopyala-yapıştır paylaşımı için)
-- invite_tokens tablosuna "code" kolonu ekler.
ALTER TABLE invite_tokens ADD COLUMN IF NOT EXISTS code TEXT UNIQUE;
