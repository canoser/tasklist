-- ============================================================================
-- [V21] 6–12. Sınıflar İçin Ayrı Eğitim Koçluğu Raporlama Sistemleri,
--       Kayıt Bazlı Sınıf Damgalama (Grade Stamping) ve Sınıf Geçmişi Arşivi
-- ============================================================================

-- 1. Sınav, ödev, çalışma oturumu ve bireysel kaynak tablolarına grade damgası ekle
ALTER TABLE exam_results
    ADD COLUMN IF NOT EXISTS grade SMALLINT NULL;

ALTER TABLE homework_assignments
    ADD COLUMN IF NOT EXISTS grade SMALLINT NULL;

ALTER TABLE study_sessions
    ADD COLUMN IF NOT EXISTS grade SMALLINT NULL;

ALTER TABLE student_resources
    ADD COLUMN IF NOT EXISTS grade SMALLINT NULL;

-- 2. Mevcut kayıtların NULL-güvenli geriye dönük doldurulması (Backfill)
-- Yalnızca öğrencinin students.grade değeri doluysa damgalanır; NULL ise NULL kalır (keyfi 12 atanmaz)
UPDATE exam_results er
SET grade = s.grade
FROM students s
WHERE er.student_id = s.id
  AND er.grade IS NULL
  AND s.grade IS NOT NULL;

UPDATE homework_assignments ha
SET grade = s.grade
FROM students s
WHERE ha.student_id = s.id
  AND ha.grade IS NULL
  AND s.grade IS NOT NULL;

UPDATE study_sessions ss
SET grade = s.grade
FROM students s
WHERE ss.student_id = s.id
  AND ss.grade IS NULL
  AND s.grade IS NOT NULL;

UPDATE student_resources sr
SET grade = s.grade
FROM students s
WHERE sr.student_id = s.id
  AND sr.grade IS NULL
  AND s.grade IS NOT NULL;

-- 3. Ders bazlı hedef net ve yazılı puan tablosu (4..13 sınıf aralığı)
CREATE TABLE IF NOT EXISTS student_subject_targets (
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    grade SMALLINT NOT NULL CHECK (grade BETWEEN 4 AND 13),
    subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    target_net NUMERIC(6,2) NOT NULL DEFAULT 0,
    target_score NUMERIC(6,2) NULL,
    updated_by VARCHAR(16) NOT NULL DEFAULT 'Coach'
        CHECK (updated_by IN ('Student', 'Coach')),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (student_id, grade, subject_id)
);

CREATE INDEX IF NOT EXISTS idx_student_subject_targets_student_grade
    ON student_subject_targets(student_id, grade);

-- 4. Kurum bazlı net hesaplama modu ayarı (OFFICIAL | NO_PENALTY)
INSERT INTO system_settings (key, value)
VALUES ('net_penalty_mode', 'OFFICIAL')
ON CONFLICT (key) DO NOTHING;

-- 5. Sınıf filtreli analitik sorgular için performans indeksleri
CREATE INDEX IF NOT EXISTS idx_exam_results_student_grade_date
    ON exam_results(student_id, grade, exam_date DESC);

CREATE INDEX IF NOT EXISTS idx_homework_student_grade_due
    ON homework_assignments(student_id, grade, due_date DESC);

CREATE INDEX IF NOT EXISTS idx_study_sessions_student_grade_date
    ON study_sessions(student_id, grade, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_student_resources_student_grade
    ON student_resources(student_id, grade);

