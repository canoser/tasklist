-- 1. Ödev tablosuna tamamlanma yüzdesi ekleme (Aşama 10)
ALTER TABLE homework_assignments
ADD COLUMN completion_percentage INT NOT NULL DEFAULT 0;

-- Eğer mevcut ödevler varsa DONE olanları 100 yap:
UPDATE homework_assignments
SET completion_percentage = 100
WHERE status = 'DONE';

-- 2. Müfredat Tabloları (Aşama 11)
CREATE TABLE IF NOT EXISTS curriculum_subjects (
    id UUID PRIMARY KEY,
    name VARCHAR(100) NOT NULL, -- Örn: Matematik, Fizik
    grade VARCHAR(20) NOT NULL  -- Örn: 12. Sınıf, LGS
);

CREATE TABLE IF NOT EXISTS curriculum_topics (
    id UUID PRIMARY KEY,
    subject_id UUID NOT NULL REFERENCES curriculum_subjects(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    parent_topic_id UUID REFERENCES curriculum_topics(id) ON DELETE CASCADE, -- Alt konu hiyerarşisi (Ağaç yapısı)
    order_index INT NOT NULL DEFAULT 0
);

-- Ödev şablonlarına (curriculum bağlantısı) opsiyonel subject_id ve topic_id eklentisi
ALTER TABLE homework_templates
ADD COLUMN curriculum_subject_id UUID REFERENCES curriculum_subjects(id) ON DELETE SET NULL,
ADD COLUMN curriculum_topic_id UUID REFERENCES curriculum_topics(id) ON DELETE SET NULL;

-- 3. Seed Data (Örnek Müfredat Verisi)
INSERT INTO curriculum_subjects (id, name, grade) VALUES 
('11111111-1111-1111-1111-111111111111', 'Matematik', '12. Sınıf'),
('22222222-2222-2222-2222-222222222222', 'Fizik', '12. Sınıf');

-- Limit, Türev, İntegral
INSERT INTO curriculum_topics (id, subject_id, name, parent_topic_id, order_index) VALUES
('33333333-3333-3333-3333-333333333331', '11111111-1111-1111-1111-111111111111', 'Limit ve Süreklilik', NULL, 1),
('33333333-3333-3333-3333-333333333332', '11111111-1111-1111-1111-111111111111', 'Sağdan ve Soldan Limit', '33333333-3333-3333-3333-333333333331', 1),
('33333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', 'Türev', NULL, 2),
('33333333-3333-3333-3333-333333333334', '11111111-1111-1111-1111-111111111111', 'Türev Alma Kuralları', '33333333-3333-3333-3333-333333333333', 1);
