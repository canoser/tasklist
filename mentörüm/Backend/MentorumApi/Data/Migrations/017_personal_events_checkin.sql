-- 017_personal_events_checkin.sql
-- Ders dışı aktivite check-in + gerçekleşen süre.
ALTER TABLE personal_events ADD COLUMN IF NOT EXISTS checked_in INTEGER NOT NULL DEFAULT 0;
ALTER TABLE personal_events ADD COLUMN IF NOT EXISTS actual_minutes INTEGER NULL;
