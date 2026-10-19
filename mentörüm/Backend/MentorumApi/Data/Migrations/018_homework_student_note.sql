-- 018_homework_student_note.sql
-- Öğrencinin ödevi işaretlerken bıraktığı "Zorlandım notu".
ALTER TABLE homework_assignments ADD COLUMN IF NOT EXISTS student_note TEXT NULL;
