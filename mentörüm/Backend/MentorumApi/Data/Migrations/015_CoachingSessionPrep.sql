-- 015_CoachingSessionPrep.sql
-- M-157: öğrencinin görüşme öncesi hazırlık/öz-değerlendirme notu.
ALTER TABLE coaching_sessions
    ADD COLUMN IF NOT EXISTS prep_notes TEXT NULL;
