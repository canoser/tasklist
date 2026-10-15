-- 014_CoachingSessions.sql
-- Koçluk görüşmeleri: not + aksiyon öğeleri (M kalemi — görüşme döngüsü çekirdeği).
CREATE TABLE IF NOT EXISTS coaching_sessions (
    id UUID PRIMARY KEY,
    coach_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_date TIMESTAMP WITH TIME ZONE,
    title TEXT NOT NULL DEFAULT 'Koçluk Görüşmesi',
    notes TEXT,
    action_items TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
