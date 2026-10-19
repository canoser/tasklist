-- 013_student_checkins.sql
-- Öğrenci günlük durum (mood) check-in'i.
CREATE TABLE IF NOT EXISTS student_checkins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    program_id UUID NOT NULL,
    student_id UUID NOT NULL,
    checkin_date DATE NOT NULL,
    mood VARCHAR(16) NOT NULL,
    note TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (student_id, checkin_date)
);
CREATE INDEX IF NOT EXISTS idx_student_checkins_student ON student_checkins(student_id, checkin_date DESC);
