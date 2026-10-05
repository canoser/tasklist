-- 008_ContractCoachId.sql
-- "contract" fazı: canlıda doğrulandıktan SONRA coach_id kaldırılır.
-- (bkz. V5_OKUL_MODELI.md §1.5.9 — aynı migration'da DROP yasak; bu ayrı migration'dır.)

-- 0. Yazar bilgisini koru: coach_id'yi created_by'ye taşı (idempotent)
ALTER TABLE coach_notes ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE student_subjects ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id) ON DELETE SET NULL;

UPDATE coach_notes SET created_by = coach_id WHERE created_by IS NULL AND coach_id IS NOT NULL;
UPDATE student_subjects SET created_by = coach_id WHERE created_by IS NULL AND coach_id IS NOT NULL;
UPDATE homework_assignments SET created_by = coach_id WHERE created_by IS NULL AND coach_id IS NOT NULL;
UPDATE exam_results SET created_by = coach_id WHERE created_by IS NULL AND coach_id IS NOT NULL;

-- 1. program_id NOT NULL (007 backfill'i tamamlandı)
ALTER TABLE students ALTER COLUMN program_id SET NOT NULL;
ALTER TABLE coach_notes ALTER COLUMN program_id SET NOT NULL;
ALTER TABLE exam_results ALTER COLUMN program_id SET NOT NULL;
ALTER TABLE student_subjects ALTER COLUMN program_id SET NOT NULL;
ALTER TABLE homework_assignments ALTER COLUMN program_id SET NOT NULL;
ALTER TABLE teachers ALTER COLUMN program_id SET NOT NULL;
ALTER TABLE courses ALTER COLUMN program_id SET NOT NULL;
ALTER TABLE course_students ALTER COLUMN program_id SET NOT NULL;
ALTER TABLE student_groups ALTER COLUMN program_id SET NOT NULL;
ALTER TABLE student_group_members ALTER COLUMN program_id SET NOT NULL;
ALTER TABLE course_groups ALTER COLUMN program_id SET NOT NULL;
ALTER TABLE schedule_slots ALTER COLUMN program_id SET NOT NULL;
ALTER TABLE course_resources ALTER COLUMN program_id SET NOT NULL;
ALTER TABLE course_resource_progress ALTER COLUMN program_id SET NOT NULL;

-- 2. coach_id DROP (homework_templates.coach_id KALIR — kişisel kütüphane)
ALTER TABLE students DROP COLUMN IF EXISTS coach_id;
ALTER TABLE coach_notes DROP COLUMN IF EXISTS coach_id;
ALTER TABLE exam_results DROP COLUMN IF EXISTS coach_id;
ALTER TABLE student_subjects DROP COLUMN IF EXISTS coach_id;
ALTER TABLE homework_assignments DROP COLUMN IF EXISTS coach_id;
ALTER TABLE teachers DROP COLUMN IF EXISTS coach_id;
ALTER TABLE courses DROP COLUMN IF EXISTS coach_id;
ALTER TABLE course_students DROP COLUMN IF EXISTS coach_id;
ALTER TABLE student_groups DROP COLUMN IF EXISTS coach_id;
ALTER TABLE student_group_members DROP COLUMN IF EXISTS coach_id;
ALTER TABLE course_groups DROP COLUMN IF EXISTS coach_id;
ALTER TABLE schedule_slots DROP COLUMN IF EXISTS coach_id;
ALTER TABLE course_resources DROP COLUMN IF EXISTS coach_id;
ALTER TABLE course_resource_progress DROP COLUMN IF EXISTS coach_id;
