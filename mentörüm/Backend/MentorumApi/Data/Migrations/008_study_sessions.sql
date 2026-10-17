CREATE TABLE IF NOT EXISTS study_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id UUID NOT NULL,
  student_id UUID NOT NULL,
  subject_id UUID NULL,
  curriculum_topic_id UUID NULL,
  minutes INTEGER NOT NULL DEFAULT 0,
  question_count INTEGER NOT NULL DEFAULT 0,
  correct INTEGER NOT NULL DEFAULT 0,
  wrong INTEGER NOT NULL DEFAULT 0,
  blank INTEGER NOT NULL DEFAULT 0,
  source_type VARCHAR(16) NOT NULL DEFAULT 'MANUAL',
  started_at TIMESTAMPTZ NULL,
  ended_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_study_sessions_student ON study_sessions(student_id);
