-- 012_PersonalEvents.sql
-- Koç ve öğrencinin kendi kişisel etkinlikleri: görüşme, müsaitlik bloğu, öğrenci çalışma bloğu.
CREATE TABLE IF NOT EXISTS personal_events (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    event_type TEXT NOT NULL DEFAULT 'PERSONAL_BLOCK'
        CHECK(event_type IN ('COACHING_SESSION','PARENT_MEETING','PERSONAL_BLOCK','STUDENT_EVENT')),
    start_at TIMESTAMP WITH TIME ZONE NOT NULL,
    end_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
