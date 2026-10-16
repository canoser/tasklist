-- 002_teacher_process_homework.sql
-- Öğretmenin ödevi işleme (onay/geri bildirim/tamamlama) yetkisi + ödev geri bildirim alanı.
ALTER TABLE courses ADD COLUMN IF NOT EXISTS teacher_can_process_homework INTEGER NOT NULL DEFAULT 0;
ALTER TABLE homework_assignments ADD COLUMN IF NOT EXISTS feedback TEXT NOT NULL DEFAULT '';

-- completed_by CHECK genişlet: 'Teacher' ekle (idempotent)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'homework_assignments_completed_by_check' AND conrelid = 'homework_assignments'::regclass) THEN
        ALTER TABLE homework_assignments DROP CONSTRAINT homework_assignments_completed_by_check;
    END IF;
END $$;
ALTER TABLE homework_assignments ADD CONSTRAINT homework_assignments_completed_by_check CHECK (completed_by IN ('Student','Coach','Teacher'));
