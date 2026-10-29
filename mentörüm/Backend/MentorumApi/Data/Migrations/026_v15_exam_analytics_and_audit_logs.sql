-- 026_v15_exam_analytics_and_audit_logs.sql
-- V15: Dual-Mode Sınav Analitiği, İyimser Kilitleme (version), Denetim İzi (audit_logs) ve Müfredat Snapshot

-- 1. exam_scores PK dönüşümü ve soru analitiği kolonları (M1)
ALTER TABLE exam_scores DROP CONSTRAINT IF EXISTS exam_scores_pkey;
ALTER TABLE exam_scores ADD COLUMN IF NOT EXISTS id UUID NOT NULL DEFAULT gen_random_uuid();
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'exam_scores_pkey' AND conrelid = 'exam_scores'::regclass) THEN
        ALTER TABLE exam_scores ADD CONSTRAINT exam_scores_pkey PRIMARY KEY (id);
    END IF;
END $$;
ALTER TABLE exam_scores ALTER COLUMN subject_code DROP NOT NULL;

ALTER TABLE exam_scores
    ADD COLUMN IF NOT EXISTS question_count INTEGER NULL CHECK (question_count IS NULL OR question_count BETWEEN 1 AND 250),
    ADD COLUMN IF NOT EXISTS correct INTEGER NULL CHECK (correct IS NULL OR correct >= 0),
    ADD COLUMN IF NOT EXISTS wrong INTEGER NULL CHECK (wrong IS NULL OR wrong >= 0),
    ADD COLUMN IF NOT EXISTS blank INTEGER NULL CHECK (blank IS NULL OR blank >= 0),
    ADD COLUMN IF NOT EXISTS net NUMERIC(6,2) NULL;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_score_question_sum' AND conrelid = 'exam_scores'::regclass) THEN
        ALTER TABLE exam_scores
        ADD CONSTRAINT chk_score_question_sum CHECK (
            (correct IS NULL AND wrong IS NULL AND blank IS NULL AND question_count IS NULL) OR
            (correct IS NOT NULL AND wrong IS NOT NULL AND blank IS NOT NULL AND question_count IS NOT NULL AND correct + wrong + blank = question_count)
        );
    END IF;
END $$;

-- 2. homework_assignments tablosuna iyimser kilitleme (version) kolonu (M2)
ALTER TABLE homework_assignments
    ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1;

-- 3. audit_logs tablosu ve indeksleri (M3)
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    program_id UUID NULL REFERENCES coaching_programs(id) ON DELETE CASCADE,
    actor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    action TEXT NOT NULL,
    resource_type TEXT NOT NULL,
    resource_id UUID NOT NULL,
    details JSONB NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_audit_logs_program_time ON audit_logs(program_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON audit_logs(actor_id, created_at DESC);

-- 4. exam_scores ders, konu ve snapshot kolonları (M4 & M5)
ALTER TABLE exam_scores
    ADD COLUMN IF NOT EXISTS subject_id UUID NULL REFERENCES subjects(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS curriculum_topic_id UUID NULL REFERENCES curriculum_topics(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS subject_name TEXT NULL,
    ADD COLUMN IF NOT EXISTS unit_name TEXT NULL,
    ADD COLUMN IF NOT EXISTS topic_name TEXT NULL;

-- Mevcut kayıtlarda subject_code üzerinden subject_id ve subject_name backfill
UPDATE exam_scores es
SET subject_id = s.id,
    subject_name = COALESCE(es.subject_name, s.name)
FROM subjects s
WHERE es.subject_id IS NULL
  AND es.subject_code IS NOT NULL
  AND UPPER(es.subject_code) = UPPER(s.short_code);

CREATE INDEX IF NOT EXISTS idx_exam_scores_exam_id ON exam_scores(exam_id);
CREATE INDEX IF NOT EXISTS idx_exam_scores_subject_id ON exam_scores(subject_id);
CREATE INDEX IF NOT EXISTS idx_exam_scores_topic_id ON exam_scores(curriculum_topic_id);
