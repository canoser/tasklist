-- 016_school_schedules.sql
-- Öğrencinin haftalık tekrarlayan okul şablonu.
CREATE TABLE IF NOT EXISTS school_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    program_id UUID NOT NULL,
    student_id UUID NOT NULL,
    day_of_week INTEGER NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    label TEXT NOT NULL DEFAULT 'Okul',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_school_schedules_student ON school_schedules(student_id, day_of_week);
