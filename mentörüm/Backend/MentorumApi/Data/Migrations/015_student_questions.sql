-- 015_student_questions.sql
-- Öğrencinin "takıldığım konular / sorulacaklar" listesi.
CREATE TABLE IF NOT EXISTS student_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    program_id UUID NOT NULL,
    student_id UUID NOT NULL,
    subject_id UUID NULL,
    topic_text TEXT NOT NULL DEFAULT '',
    status VARCHAR(16) NOT NULL DEFAULT 'OPEN',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_student_questions_student ON student_questions(student_id, created_at DESC);
