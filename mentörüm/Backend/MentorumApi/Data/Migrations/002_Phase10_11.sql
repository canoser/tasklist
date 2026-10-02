-- 002_Phase10_11.sql (Revize Edilmiş Seed Verisi)
-- Sadece 001_InitialSchema.sql ile uyumlu seed verilerini içerir. Şema değişiklikleri iptal edildi.

-- 1. Sistem Dersleri Seed
INSERT INTO subjects (id, name, short_code, default_color, is_system_subject) VALUES 
('11111111-1111-1111-1111-111111111111', 'Matematik', 'MAT', '#3B82F6', 1),
('22222222-2222-2222-2222-222222222222', 'Fizik', 'FIZ', '#8B5CF6', 1)
ON CONFLICT (id) DO NOTHING;

-- 2. Müfredat Yılı Seed (curriculum_topics için foreign key)
INSERT INTO curriculum_years (id, year_label, is_active) VALUES
('99999999-9999-9999-9999-999999999999', '2026-2027', 1)
ON CONFLICT (id) DO NOTHING;

-- 3. Konular Seed
-- Limit, Türev, İntegral (Örnek: Matematik, 12. Sınıf)
INSERT INTO curriculum_topics (
    id, 
    curriculum_year_id, 
    subject_id, 
    grade, 
    curriculum_type, 
    unit_number, 
    unit_name, 
    topic_number, 
    topic_name, 
    is_active, 
    sort_order
) VALUES
('33333333-3333-3333-3333-333333333331', '99999999-9999-9999-9999-999999999999', '11111111-1111-1111-1111-111111111111', 12, 'NEW', 1, 'Limit ve Türev', '1.1', 'Limit ve Süreklilik', 1, 1),
('33333333-3333-3333-3333-333333333332', '99999999-9999-9999-9999-999999999999', '11111111-1111-1111-1111-111111111111', 12, 'NEW', 1, 'Limit ve Türev', '1.2', 'Sağdan ve Soldan Limit', 1, 2),
('33333333-3333-3333-3333-333333333333', '99999999-9999-9999-9999-999999999999', '11111111-1111-1111-1111-111111111111', 12, 'NEW', 2, 'Türev Uygulamaları', '2.1', 'Türev', 1, 3),
('33333333-3333-3333-3333-333333333334', '99999999-9999-9999-9999-999999999999', '11111111-1111-1111-1111-111111111111', 12, 'NEW', 2, 'Türev Uygulamaları', '2.2', 'Türev Alma Kuralları', 1, 4)
ON CONFLICT (id) DO NOTHING;
