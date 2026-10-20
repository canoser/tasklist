-- 021_question_collections.sql
-- Koç "çözülemeyen soru" koleksiyonları.

CREATE TABLE IF NOT EXISTS coach_question_collections (
    id UUID PRIMARY KEY,
    coach_id UUID NOT NULL REFERENCES coaches(id) ON DELETE CASCADE,
    program_id UUID NOT NULL REFERENCES coaching_programs(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS coach_question_collection_items (
    id UUID PRIMARY KEY,
    collection_id UUID NOT NULL REFERENCES coach_question_collections(id) ON DELETE CASCADE,
    student_question_id UUID NOT NULL REFERENCES student_questions(id) ON DELETE CASCADE,
    added_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(collection_id, student_question_id)
);

CREATE INDEX IF NOT EXISTS idx_collections_coach ON coach_question_collections(coach_id, program_id);
