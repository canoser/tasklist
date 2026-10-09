-- 007_AdminAndPrograms.sql
-- V5 Koçluk Programı — coaching_programs, program_coaches, program_teachers, system_settings,
-- süper yönetici (Admin) rolü, koç onayı, program_id kolonları + backfill.
-- "expand + backfill" fazı. coach_id 008_ContractCoachId.sql'de kaldırılır.

-- 1. Yeni tablolar
CREATE TABLE IF NOT EXISTS coaching_programs (
    id UUID PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    color TEXT,
    is_active INTEGER DEFAULT 1,
    archived_at TIMESTAMP WITH TIME ZONE NULL,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS program_coaches (
    id UUID PRIMARY KEY,
    program_id UUID NOT NULL REFERENCES coaching_programs(id) ON DELETE CASCADE,
    coach_id UUID NOT NULL REFERENCES coaches(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK(role IN ('YONETICI','YARDIMCI')),
    added_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(program_id, coach_id)
);
-- Tek yönetici garantisi (DB seviyesinde)
CREATE UNIQUE INDEX IF NOT EXISTS ux_program_one_admin ON program_coaches(program_id) WHERE role = 'YONETICI';

CREATE TABLE IF NOT EXISTS program_teachers (
    id UUID PRIMARY KEY,
    program_id UUID NOT NULL REFERENCES coaching_programs(id) ON DELETE CASCADE,
    teacher_id UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
    is_active INTEGER DEFAULT 1,
    added_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(program_id, teacher_id)
);

CREATE TABLE IF NOT EXISTS system_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_by UUID REFERENCES users(id) ON DELETE SET NULL
);

-- 2. users.role CHECK'e 'Admin' ekle (idempotent)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_role_check' AND conrelid = 'users'::regclass) THEN
        ALTER TABLE users DROP CONSTRAINT users_role_check;
    END IF;
END $$;
ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('Coach','Student','Parent','Teacher','Admin'));

-- 3. invite_tokens.role CHECK'e 'Coach' ekle (yardımcı koç daveti) — idempotent
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'invite_tokens_role_check' AND conrelid = 'invite_tokens'::regclass) THEN
        ALTER TABLE invite_tokens DROP CONSTRAINT invite_tokens_role_check;
    END IF;
END $$;
ALTER TABLE invite_tokens ADD CONSTRAINT invite_tokens_role_check CHECK (role IN ('Student','Parent','Teacher','Coach'));

-- 4. notifications.type CHECK genişlet (koç onay + program tipleri) — idempotent
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'notifications_type_check' AND conrelid = 'notifications'::regclass) THEN
        ALTER TABLE notifications DROP CONSTRAINT notifications_type_check;
    END IF;
END $$;
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check CHECK (type IN ('HOMEWORK_ASSIGNED','HOMEWORK_DUE','HOMEWORK_OVERDUE','HOMEWORK_DONE','SCHEDULE_UPDATED','TEACHER_ASSIGNED','RESOURCE_ASSIGNED','COACH_APPROVAL_REQUESTED','COACH_APPROVED','PROGRAM_COACH_ADDED','PROGRAM_ADMIN_TRANSFERRED'));

-- 5. coaches'a onay + program limiti kolonları
ALTER TABLE coaches
    ADD COLUMN IF NOT EXISTS approval_status TEXT NOT NULL DEFAULT 'APPROVED' CHECK(approval_status IN ('PENDING','APPROVED','REJECTED')),
    ADD COLUMN IF NOT EXISTS max_programs INTEGER NULL,
    ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE;

-- 6. program_id kolonları (NULL) ekle — mevcut V4 tabloları
ALTER TABLE students ADD COLUMN IF NOT EXISTS program_id UUID REFERENCES coaching_programs(id) ON DELETE SET NULL;
ALTER TABLE coach_notes ADD COLUMN IF NOT EXISTS program_id UUID REFERENCES coaching_programs(id) ON DELETE SET NULL;
ALTER TABLE exam_results ADD COLUMN IF NOT EXISTS program_id UUID REFERENCES coaching_programs(id) ON DELETE SET NULL;
ALTER TABLE student_subjects ADD COLUMN IF NOT EXISTS program_id UUID REFERENCES coaching_programs(id) ON DELETE SET NULL;
ALTER TABLE homework_assignments ADD COLUMN IF NOT EXISTS program_id UUID REFERENCES coaching_programs(id) ON DELETE SET NULL;

-- 7. program_id kolonları ekle — V5 okul modeli tabloları (006'da coach_id ile oluştu)
ALTER TABLE teachers ADD COLUMN IF NOT EXISTS program_id UUID REFERENCES coaching_programs(id) ON DELETE SET NULL;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS program_id UUID REFERENCES coaching_programs(id) ON DELETE SET NULL;
ALTER TABLE course_students ADD COLUMN IF NOT EXISTS program_id UUID REFERENCES coaching_programs(id) ON DELETE SET NULL;
ALTER TABLE student_groups ADD COLUMN IF NOT EXISTS program_id UUID REFERENCES coaching_programs(id) ON DELETE SET NULL;
ALTER TABLE student_group_members ADD COLUMN IF NOT EXISTS program_id UUID REFERENCES coaching_programs(id) ON DELETE SET NULL;
ALTER TABLE course_groups ADD COLUMN IF NOT EXISTS program_id UUID REFERENCES coaching_programs(id) ON DELETE SET NULL;
ALTER TABLE schedule_slots ADD COLUMN IF NOT EXISTS program_id UUID REFERENCES coaching_programs(id) ON DELETE SET NULL;
ALTER TABLE course_resources ADD COLUMN IF NOT EXISTS program_id UUID REFERENCES coaching_programs(id) ON DELETE SET NULL;
ALTER TABLE course_resource_progress ADD COLUMN IF NOT EXISTS program_id UUID REFERENCES coaching_programs(id) ON DELETE SET NULL;

-- 8. Backfill (idempotent): her mevcut koç için "Koçluk Programım" aç, koçu YÖNETİCİ yap.
DO $$
DECLARE c RECORD;
BEGIN
    FOR c IN SELECT id FROM coaches LOOP
        IF NOT EXISTS (SELECT 1 FROM coaching_programs WHERE created_by = c.id) THEN
            INSERT INTO coaching_programs (id, name, created_by) VALUES (gen_random_uuid(), 'Koçluk Programım', c.id);
        END IF;
        INSERT INTO program_coaches (id, program_id, coach_id, role, added_by)
        SELECT gen_random_uuid(), id, c.id, 'YONETICI', c.id FROM coaching_programs WHERE created_by = c.id
        ON CONFLICT (program_id, coach_id) DO NOTHING;
    END LOOP;
END $$;

-- 9. program_id backfill (kocun YONETICI programi uzerinden) -- idempotent (WHERE program_id IS NULL ve coach_id varsa)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'students' AND column_name = 'coach_id') THEN
        EXECUTE 'UPDATE students s SET program_id = pc.program_id FROM program_coaches pc WHERE pc.coach_id = s.coach_id AND pc.role = ''YONETICI'' AND s.program_id IS NULL';
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'coach_notes' AND column_name = 'coach_id') THEN
        EXECUTE 'UPDATE coach_notes cn SET program_id = pc.program_id FROM program_coaches pc WHERE pc.coach_id = cn.coach_id AND pc.role = ''YONETICI'' AND cn.program_id IS NULL';
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'exam_results' AND column_name = 'coach_id') THEN
        EXECUTE 'UPDATE exam_results er SET program_id = pc.program_id FROM program_coaches pc WHERE pc.coach_id = er.coach_id AND pc.role = ''YONETICI'' AND er.program_id IS NULL';
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'student_subjects' AND column_name = 'coach_id') THEN
        EXECUTE 'UPDATE student_subjects ss SET program_id = pc.program_id FROM program_coaches pc WHERE pc.coach_id = ss.coach_id AND pc.role = ''YONETICI'' AND ss.program_id IS NULL';
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'homework_assignments' AND column_name = 'coach_id') THEN
        EXECUTE 'UPDATE homework_assignments ha SET program_id = pc.program_id FROM program_coaches pc WHERE pc.coach_id = ha.coach_id AND pc.role = ''YONETICI'' AND ha.program_id IS NULL';
    END IF;
END $$;

-- 10. Mevcut (V4) koçları APPROVED yap (backfill) — idempotent (programı olan PENDING koçlar APPROVED)
UPDATE coaches c
SET approval_status = 'APPROVED'
WHERE c.approval_status = 'PENDING'
  AND EXISTS (SELECT 1 FROM coaching_programs cp WHERE cp.created_by = c.id);


