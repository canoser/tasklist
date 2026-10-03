-- 005_HomeworkDirect.sql
-- Doğrudan ödev ataması (şablon olmadan) için ders/konu bilgisini atamaya ekler.
-- ON DELETE SET NULL: ders/konu silinse bile ödev (ve istatistik) korunur.
ALTER TABLE homework_assignments
    ADD COLUMN IF NOT EXISTS subject_id UUID REFERENCES subjects(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS curriculum_topic_id UUID REFERENCES curriculum_topics(id) ON DELETE SET NULL;
