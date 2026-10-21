-- 022_student_flexibility.sql
-- V13: Öğrenci ekleme esnekliği (gölge profil) & bireysel/grup geçişi.

-- M1: users.email nullable (e-postasız gölge profil)
ALTER TABLE users ALTER COLUMN email DROP NOT NULL;

-- M2: students.invite_status
ALTER TABLE students ADD COLUMN IF NOT EXISTS invite_status VARCHAR(16) NOT NULL DEFAULT 'NOT_INVITED';

-- M3: courses.type CHECK'e 'OZEL_DERS' ekle (idempotent)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'courses_type_check' AND conrelid = 'courses'::regclass) THEN
        ALTER TABLE courses DROP CONSTRAINT courses_type_check;
    END IF;
END $$;
ALTER TABLE courses ADD CONSTRAINT courses_type_check CHECK (type IN ('DERS','OZEL_DERS','SORU_COZUMU','DENEME','KITAP','VIDEO','DIGER'));

-- M4: student_group_members.is_active (soft-delete)
ALTER TABLE student_group_members ADD COLUMN IF NOT EXISTS is_active INTEGER NOT NULL DEFAULT 1;
