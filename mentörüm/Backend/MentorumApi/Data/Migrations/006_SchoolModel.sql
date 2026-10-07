-- 006_SchoolModel.sql
-- V5 Okul/Dershane Modeli — Öğretmen, Ders, Öğrenci Grubu, Haftalık Program, Ders Kaynakları.
-- "expand" fazı: yeni tablolar geçici olarak coach_id ile oluşturulur.
-- program_id 007'de eklenir, coach_id 008'de kaldırılır (bkz. V5_OKUL_MODELI.md §1.5.9).

-- 1. Yeni tablolar
CREATE TABLE IF NOT EXISTS teachers (
    id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    coach_id UUID NOT NULL REFERENCES coaches(id) ON DELETE CASCADE,
    is_active INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS courses (
    id UUID PRIMARY KEY,
    coach_id UUID NOT NULL REFERENCES coaches(id) ON DELETE CASCADE,
    subject_id UUID NULL REFERENCES subjects(id) ON DELETE SET NULL,
    teacher_id UUID NULL REFERENCES users(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'DERS' CHECK(type IN ('DERS','SORU_COZUMU','DENEME','KITAP','VIDEO','DIGER')),
    color TEXT,
    is_active INTEGER DEFAULT 1,
    teacher_can_view_profile INTEGER DEFAULT 1,
    teacher_can_view_contact INTEGER DEFAULT 0,
    teacher_can_view_homework INTEGER DEFAULT 1,
    teacher_can_manage_homework INTEGER DEFAULT 1,
    teacher_can_view_exams INTEGER DEFAULT 1,
    teacher_can_manage_exams INTEGER DEFAULT 0,
    teacher_can_view_notes INTEGER DEFAULT 0,
    teacher_can_add_notes INTEGER DEFAULT 0,
    teacher_can_view_schedule INTEGER DEFAULT 1,
    teacher_can_manage_schedule INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS course_students (
    id UUID PRIMARY KEY,
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    coach_id UUID NOT NULL REFERENCES coaches(id) ON DELETE CASCADE,
    enrolled_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    is_active INTEGER DEFAULT 1,
    UNIQUE(course_id, student_id)
);

CREATE TABLE IF NOT EXISTS student_groups (
    id UUID PRIMARY KEY,
    coach_id UUID NOT NULL REFERENCES coaches(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    color TEXT,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS student_group_members (
    id UUID PRIMARY KEY,
    group_id UUID NOT NULL REFERENCES student_groups(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    coach_id UUID NOT NULL REFERENCES coaches(id) ON DELETE CASCADE,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(group_id, student_id)
);

CREATE TABLE IF NOT EXISTS course_groups (
    id UUID PRIMARY KEY,
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    group_id UUID NOT NULL REFERENCES student_groups(id) ON DELETE CASCADE,
    coach_id UUID NOT NULL REFERENCES coaches(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(course_id, group_id)
);

CREATE TABLE IF NOT EXISTS schedule_slots (
    id UUID PRIMARY KEY,
    coach_id UUID NOT NULL REFERENCES coaches(id) ON DELETE CASCADE,
    course_id UUID NULL REFERENCES courses(id) ON DELETE CASCADE,
    group_id UUID NULL REFERENCES student_groups(id) ON DELETE CASCADE,
    student_id UUID NULL REFERENCES students(id) ON DELETE CASCADE,
    day_of_week INTEGER NOT NULL CHECK(day_of_week BETWEEN 1 AND 7),
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    title TEXT NOT NULL,
    type TEXT CHECK(type IN ('DERS','OZEL_DERS','DENEME','TEKRAR','SORU_COZUMU','SERBEST')),
    valid_from DATE,
    valid_to DATE,
    color TEXT,
    is_active INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CHECK ((course_id IS NOT NULL)::int + (group_id IS NOT NULL)::int + (student_id IS NOT NULL)::int = 1),
    CHECK (start_time < end_time)
);

CREATE TABLE IF NOT EXISTS course_resources (
    id UUID PRIMARY KEY,
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    coach_id UUID NOT NULL REFERENCES coaches(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    type TEXT CHECK(type IN ('BOOK','VIDEO','QUESTION_SET','OTHER')),
    resource_ref TEXT,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS course_resource_progress (
    id UUID PRIMARY KEY,
    course_resource_id UUID NOT NULL REFERENCES course_resources(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    coach_id UUID NOT NULL REFERENCES coaches(id) ON DELETE CASCADE,
    progress SMALLINT CHECK(progress BETWEEN 0 AND 100),
    is_done INTEGER DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(course_resource_id, student_id)
);

-- 2. users.role CHECK'e 'Teacher' ekle (idempotent)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_role_check' AND conrelid = 'users'::regclass) THEN
        ALTER TABLE users DROP CONSTRAINT users_role_check;
    END IF;
END $$;
ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('Coach','Student','Parent','Teacher'));

-- 3. invite_tokens.role CHECK'e 'Teacher' ekle (idempotent)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'invite_tokens_role_check' AND conrelid = 'invite_tokens'::regclass) THEN
        ALTER TABLE invite_tokens DROP CONSTRAINT invite_tokens_role_check;
    END IF;
END $$;
ALTER TABLE invite_tokens ADD CONSTRAINT invite_tokens_role_check CHECK (role IN ('Student','Parent','Teacher'));

-- 4. notifications.type CHECK genişlet (idempotent)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'notifications_type_check' AND conrelid = 'notifications'::regclass) THEN
        ALTER TABLE notifications DROP CONSTRAINT notifications_type_check;
    END IF;
END $$;
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check CHECK (type IN ('HOMEWORK_ASSIGNED','HOMEWORK_DUE','HOMEWORK_OVERDUE','HOMEWORK_DONE','SCHEDULE_UPDATED','TEACHER_ASSIGNED','TEACHER_DEACTIVATED','RESOURCE_ASSIGNED'));

-- 5. homework_assignments'a course_id + created_by ekle
ALTER TABLE homework_assignments
    ADD COLUMN IF NOT EXISTS course_id UUID REFERENCES courses(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id) ON DELETE SET NULL;

-- 6. exam_results'a created_by ekle
ALTER TABLE exam_results
    ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id) ON DELETE SET NULL;

