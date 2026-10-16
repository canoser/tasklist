-- 003_teacher_notes.sql
-- Öğretmenin ders içi öğrenci performans notu (teacher_can_add_notes / teacher_can_view_notes).
CREATE TABLE IF NOT EXISTS teacher_notes (
    id UUID PRIMARY KEY,
    program_id UUID NOT NULL REFERENCES coaching_programs(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    teacher_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    note TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_teacher_notes_course_student ON teacher_notes(course_id, student_id);
