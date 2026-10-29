-- 027_v16_ux_communications_and_coaching_tools.sql
-- M1: Mükerrer OZEL_DERS kayıtlarını temizle ve birleştir
DO $$
DECLARE
    rec RECORD;
BEGIN
    FOR rec IN
        WITH ranked_courses AS (
            SELECT
                cs.student_id,
                c.program_id,
                c.id AS course_id,
                FIRST_VALUE(c.id) OVER (
                    PARTITION BY cs.student_id, c.program_id
                    ORDER BY c.created_at ASC, c.id ASC
                ) AS canonical_course_id,
                ROW_NUMBER() OVER (
                    PARTITION BY cs.student_id, c.program_id
                    ORDER BY c.created_at ASC, c.id ASC
                ) AS rn
            FROM courses c
            JOIN course_students cs ON cs.course_id = c.id
            WHERE c.type = 'OZEL_DERS'
              AND c.is_active = 1
        )
        SELECT student_id, program_id, course_id AS dup_course_id, canonical_course_id
        FROM ranked_courses
        WHERE rn > 1
    LOOP
        UPDATE homework_assignments SET course_id = rec.canonical_course_id WHERE course_id = rec.dup_course_id;
        UPDATE schedule_slots SET course_id = rec.canonical_course_id WHERE course_id = rec.dup_course_id;
        UPDATE exam_results SET course_id = rec.canonical_course_id WHERE course_id = rec.dup_course_id;
        UPDATE course_resources SET course_id = rec.canonical_course_id WHERE course_id = rec.dup_course_id;
        UPDATE teacher_notes SET course_id = rec.canonical_course_id WHERE course_id = rec.dup_course_id;
        UPDATE uploads SET course_id = rec.canonical_course_id WHERE course_id = rec.dup_course_id;

        UPDATE course_students SET is_active = 0 WHERE course_id = rec.dup_course_id AND student_id = rec.student_id;
        UPDATE courses SET is_active = 0, updated_at = NOW() WHERE id = rec.dup_course_id;
    END LOOP;
END $$;

-- M2: Öğrenci iletişim (phone, OKR), soru yanıtı, ödev önceliği, assigned_via, sınav hata nedenleri
ALTER TABLE students
    ADD COLUMN IF NOT EXISTS phone TEXT NULL,
    ADD COLUMN IF NOT EXISTS monthly_milestone TEXT NULL,
    ADD COLUMN IF NOT EXISTS weekly_target_minutes INTEGER NULL,
    ADD COLUMN IF NOT EXISTS weekly_target_questions INTEGER NULL;

ALTER TABLE student_questions
    ADD COLUMN IF NOT EXISTS coach_reply TEXT NULL,
    ADD COLUMN IF NOT EXISTS replied_by UUID NULL REFERENCES users(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS replied_at TIMESTAMP WITH TIME ZONE NULL;

ALTER TABLE homework_assignments
    ADD COLUMN IF NOT EXISTS priority TEXT NOT NULL DEFAULT 'NORMAL'
        CHECK (priority IN ('HIGH', 'NORMAL', 'LOW')),
    ADD COLUMN IF NOT EXISTS assigned_via TEXT NOT NULL DEFAULT 'INDIVIDUAL'
        CHECK (assigned_via IN ('INDIVIDUAL', 'GROUP'));

-- Mevcut grup kurslarına bağlı ödevler için assigned_via backfill
UPDATE homework_assignments
SET assigned_via = 'GROUP'
WHERE course_id IN (SELECT course_id FROM course_groups)
  AND assigned_via = 'INDIVIDUAL';

ALTER TABLE exam_results
    ADD COLUMN IF NOT EXISTS error_reasons TEXT NULL;

-- M3: Koçluk araçları tablosu
CREATE TABLE IF NOT EXISTS student_coaching_tools (
    student_id UUID PRIMARY KEY REFERENCES students(id) ON DELETE CASCADE,
    swot_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    wheel_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    habits_data JSONB NOT NULL DEFAULT '[]'::jsonb,
    updated_by UUID NULL REFERENCES users(id) ON DELETE SET NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

