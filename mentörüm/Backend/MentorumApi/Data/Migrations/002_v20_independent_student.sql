-- ============================================================================
-- [V20] Bağımsız Öğrenci Modu, Yönetici Rol/Koç Atama, Çift Yönlü İstekler
--       ve 6'lı Öğrenci Özerklik (Yetki) Matrisi
-- ============================================================================

-- 1. students tablosuna 6 adet özerklik (izin) kolonu ekle
-- Başlangıç varsayılanları (koç–öğrenci eşleştiğinde):
--   Açık (1): can_complete_topics, can_complete_homework, can_edit_goals
--   Kapalı (0): can_add_exam_results, can_manage_resources, can_self_assign_work
ALTER TABLE students
    ADD COLUMN IF NOT EXISTS can_complete_topics INTEGER NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS can_complete_homework INTEGER NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS can_edit_goals INTEGER NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS can_add_exam_results INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS can_manage_resources INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS can_self_assign_work INTEGER NOT NULL DEFAULT 0;

-- 2. coaches tablosuna telefon araması için phone kolonu ekle
ALTER TABLE coaches
    ADD COLUMN IF NOT EXISTS phone TEXT NULL;

-- 3. Öğrenci konu tamamlama ilerleme tablosu (ödevden bağımsız doğrudan konu işaretleme)
CREATE TABLE IF NOT EXISTS student_topic_progress (
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    curriculum_topic_id UUID NOT NULL REFERENCES curriculum_topics(id) ON DELETE CASCADE,
    is_completed INTEGER NOT NULL DEFAULT 1,
    updated_by VARCHAR(16) NOT NULL DEFAULT 'Student'
        CHECK (updated_by IN ('Student', 'Coach')),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (student_id, curriculum_topic_id)
);

CREATE INDEX IF NOT EXISTS idx_student_topic_progress_student
    ON student_topic_progress(student_id);

-- 4. Koç <-> Öğrenci çift yönlü bağlantı istekleri tablosu
CREATE TABLE IF NOT EXISTS coach_student_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    coach_id UUID NOT NULL REFERENCES coaches(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    initiated_by VARCHAR(16) NOT NULL
        CHECK (initiated_by IN ('Coach', 'Student')),
    status VARCHAR(16) NOT NULL DEFAULT 'PENDING'
        CHECK (status IN ('PENDING', 'ACCEPTED', 'REJECTED', 'CANCELLED')),
    note TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved_at TIMESTAMPTZ NULL
);

CREATE INDEX IF NOT EXISTS idx_coach_student_requests_coach
    ON coach_student_requests(coach_id, status);
CREATE INDEX IF NOT EXISTS idx_coach_student_requests_student
    ON coach_student_requests(student_id, status);

-- 5. Öğrenci bireysel kaynak ve video ders takip tablosu
CREATE TABLE IF NOT EXISTS student_resources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    program_id UUID NOT NULL REFERENCES coaching_programs(id) ON DELETE CASCADE,
    subject_id UUID NULL REFERENCES subjects(id) ON DELETE SET NULL,
    resource_type VARCHAR(16) NOT NULL DEFAULT 'BOOK'
        CHECK (resource_type IN ('BOOK', 'VIDEO', 'OTHER')),
    title TEXT NOT NULL,
    url_or_author TEXT NULL,
    total_units INTEGER NOT NULL DEFAULT 0,
    completed_units INTEGER NOT NULL DEFAULT 0,
    created_by VARCHAR(16) NOT NULL DEFAULT 'Student'
        CHECK (created_by IN ('Student', 'Coach')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_student_resources_student
    ON student_resources(student_id, created_at DESC);

-- 6. notifications.type CHECK kısıtını CONNECTION_REQUEST ve CONNECTION_ACCEPTED ile genişlet
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'notifications_type_check' AND conrelid = 'notifications'::regclass) THEN
        ALTER TABLE notifications DROP CONSTRAINT notifications_type_check;
    END IF;
END $$;
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check CHECK (
    type IN (
        'HOMEWORK_ASSIGNED','HOMEWORK_DUE','HOMEWORK_OVERDUE','HOMEWORK_DONE',
        'SCHEDULE_UPDATED','TEACHER_ASSIGNED','RESOURCE_ASSIGNED',
        'COACH_APPROVAL_REQUESTED','COACH_APPROVED','COACH_REJECTED',
        'TEACHER_DEACTIVATED','PROGRAM_COACH_ADDED','PROGRAM_ADMIN_TRANSFERRED',
        'CONNECTION_REQUEST','CONNECTION_ACCEPTED'
    )
);

-- 7. Kayıt modu sistem ayarı (ADMIN_APPROVAL | SELF_SERVICE)
INSERT INTO system_settings (key, value)
VALUES ('registration_mode', 'ADMIN_APPROVAL')
ON CONFLICT (key) DO NOTHING;

