-- 004_Curriculum2026.sql
-- Müfredat: yıl + tip (NEW=Maarif / OLD=eski) + seviye (4..12, TYT, AYT) destekli.
-- 1. grade kolonunu TEXT'e çevir (TYT/AYT gibi sınav seviyelerini tutabilmek için) — idempotent
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'curriculum_topics' AND column_name = 'grade' AND data_type = 'integer') THEN
        ALTER TABLE curriculum_topics ALTER COLUMN grade TYPE TEXT USING grade::text;
    END IF;
END $$;

-- 2. Sistem Dersleri (8 YENİ ders — Matematik/Fizik 002'de zaten var)
INSERT INTO subjects (id, name, short_code, default_color, is_system_subject) VALUES
('44444444-4444-4444-4444-444444444444', 'Türkçe', 'TUR', '#DC2626', 1),
('55555555-5555-5555-5555-555555555555', 'Fen Bilimleri', 'FEN', '#16A34A', 1),
('66666666-6666-6666-6666-666666666666', 'T.C. İnkılap Tarihi', 'INK', '#EA580C', 1),
('77777777-7777-7777-7777-777777777777', 'İngilizce', 'ING', '#9333EA', 1),
('88888888-8888-8888-8888-888888888888', 'Türk Dili ve Edebiyatı', 'TDE', '#DC2626', 1),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Kimya', 'KIM', '#0891B2', 1),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Biyoloji', 'BIY', '#15803D', 1),
('cccccccc-cccc-cccc-cccc-cccccccccccc', 'Tarih', 'TAR', '#B45309', 1)
ON CONFLICT (id) DO NOTHING;

-- 3. Konular (seviye + tip + yıl ile)
-- 3.1 8. Sınıf (LGS) — YENİ Maarif müfredatı
INSERT INTO curriculum_topics (id, curriculum_year_id, subject_id, grade, curriculum_type, unit_number, unit_name, topic_number, topic_name, is_active, sort_order) VALUES
('d0000000-0000-0000-0000-000000000101', '99999999-9999-9999-9999-999999999999', '11111111-1111-1111-1111-111111111111', '8', 'NEW', 1, 'Çarpanlar ve Katlar', '1.1', 'Çarpanlar ve Katlar', 1, 101),
('d0000000-0000-0000-0000-000000000102', '99999999-9999-9999-9999-999999999999', '11111111-1111-1111-1111-111111111111', '8', 'NEW', 1, 'Çarpanlar ve Katlar', '1.2', 'Üslü İfadeler', 1, 102),
('d0000000-0000-0000-0000-000000000103', '99999999-9999-9999-9999-999999999999', '11111111-1111-1111-1111-111111111111', '8', 'NEW', 2, 'Kareköklü İfadeler', '2.1', 'Kareköklü İfadeler', 1, 103),
('d0000000-0000-0000-0000-000000000201', '99999999-9999-9999-9999-999999999999', '44444444-4444-4444-4444-444444444444', '8', 'NEW', 1, 'Sözcükte Anlam', '1.1', 'Çok Anlamlılık', 1, 201),
('d0000000-0000-0000-0000-000000000202', '99999999-9999-9999-9999-999999999999', '44444444-4444-4444-4444-444444444444', '8', 'NEW', 1, 'Sözcükte Anlam', '1.2', 'Deyim ve Atasözleri', 1, 202),
('d0000000-0000-0000-0000-000000000203', '99999999-9999-9999-9999-999999999999', '44444444-4444-4444-4444-444444444444', '8', 'NEW', 2, 'Cümlede Anlam', '2.1', 'Öznel-Nesnel Yargı', 1, 203),
('d0000000-0000-0000-0000-000000000301', '99999999-9999-9999-9999-999999999999', '55555555-5555-5555-5555-555555555555', '8', 'NEW', 1, 'Mevsimler ve İklim', '1.1', 'Mevsimlerin Oluşumu', 1, 301),
('d0000000-0000-0000-0000-000000000302', '99999999-9999-9999-9999-999999999999', '55555555-5555-5555-5555-555555555555', '8', 'NEW', 1, 'Mevsimler ve İklim', '1.2', 'İklim ve Hava Olayları', 1, 302),
('d0000000-0000-0000-0000-000000000303', '99999999-9999-9999-9999-999999999999', '55555555-5555-5555-5555-555555555555', '8', 'NEW', 2, 'DNA ve Genetik Kod', '2.1', 'DNA ve Genetik Kod', 1, 303),
('d0000000-0000-0000-0000-000000000401', '99999999-9999-9999-9999-999999999999', '66666666-6666-6666-6666-666666666666', '8', 'NEW', 1, 'Bir Kahraman Doğuyor', '1.1', 'Mustafa Kemal''in Hayatı', 1, 401),
('d0000000-0000-0000-0000-000000000402', '99999999-9999-9999-9999-999999999999', '66666666-6666-6666-6666-666666666666', '8', 'NEW', 1, 'Bir Kahraman Doğuyor', '1.2', 'Milli Mücadele Hazırlık Dönemi', 1, 402),
('d0000000-0000-0000-0000-000000000501', '99999999-9999-9999-9999-999999999999', '77777777-7777-7777-7777-777777777777', '8', 'NEW', 1, 'Friendship', '1.1', 'Expressing Likes and Dislikes', 1, 501),
('d0000000-0000-0000-0000-000000000502', '99999999-9999-9999-9999-999999999999', '77777777-7777-7777-7777-777777777777', '8', 'NEW', 1, 'Friendship', '1.2', 'Making Invitations', 1, 502)
ON CONFLICT (id) DO NOTHING;

-- 3.2 12. Sınıf (Okul) — YENİ Maarif müfredatı
INSERT INTO curriculum_topics (id, curriculum_year_id, subject_id, grade, curriculum_type, unit_number, unit_name, topic_number, topic_name, is_active, sort_order) VALUES
('d0000000-0000-0000-0000-000000000601', '99999999-9999-9999-9999-999999999999', '22222222-2222-2222-2222-222222222222', '12', 'NEW', 1, 'Kuvvet ve Hareket', '1.1', 'Vektörler', 1, 601),
('d0000000-0000-0000-0000-000000000602', '99999999-9999-9999-9999-999999999999', '22222222-2222-2222-2222-222222222222', '12', 'NEW', 1, 'Kuvvet ve Hareket', '1.2', 'Newton Hareket Yasaları', 1, 602),
('d0000000-0000-0000-0000-000000000603', '99999999-9999-9999-9999-999999999999', '22222222-2222-2222-2222-222222222222', '12', 'NEW', 2, 'Elektrik ve Manyetizma', '2.1', 'Elektrik Alan', 1, 603),
('d0000000-0000-0000-0000-000000000701', '99999999-9999-9999-9999-999999999999', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '12', 'NEW', 1, 'Kimya Bilimi', '1.1', 'Atom ve Periyodik Sistem', 1, 701),
('d0000000-0000-0000-0000-000000000702', '99999999-9999-9999-9999-999999999999', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '12', 'NEW', 1, 'Kimya Bilimi', '1.2', 'Kimyasal Türler Arası Etkileşim', 1, 702),
('d0000000-0000-0000-0000-000000000801', '99999999-9999-9999-9999-999999999999', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '12', 'NEW', 1, 'Canlıların Ortak Özellikleri', '1.1', 'Hücre ve Organeller', 1, 801),
('d0000000-0000-0000-0000-000000000802', '99999999-9999-9999-9999-999999999999', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '12', 'NEW', 1, 'Canlıların Ortak Özellikleri', '1.2', 'Madde Geçişleri', 1, 802),
('d0000000-0000-0000-0000-000000000901', '99999999-9999-9999-9999-999999999999', '88888888-8888-8888-8888-888888888888', '12', 'NEW', 1, 'Hikaye', '1.1', 'Cumhuriyet Dönemi Hikayesi', 1, 901),
('d0000000-0000-0000-0000-000000000902', '99999999-9999-9999-9999-999999999999', '88888888-8888-8888-8888-888888888888', '12', 'NEW', 1, 'Hikaye', '1.2', 'Hikaye İnceleme', 1, 902),
('d0000000-0000-0000-0000-000000001001', '99999999-9999-9999-9999-999999999999', 'cccccccc-cccc-cccc-cccc-cccccccccccc', '12', 'NEW', 1, '20. Yüzyıl Başlarında Osmanlı', '1.1', 'Trablusgarp ve Balkan Savaşları', 1, 1001),
('d0000000-0000-0000-0000-000000001002', '99999999-9999-9999-9999-999999999999', 'cccccccc-cccc-cccc-cccc-cccccccccccc', '12', 'NEW', 1, '20. Yüzyıl Başlarında Osmanlı', '1.2', 'I. Dünya Savaşı', 1, 1002)
ON CONFLICT (id) DO NOTHING;

-- 3.3 TYT — ESKİ müfredat (bu yıl YKS hâlâ eski)
INSERT INTO curriculum_topics (id, curriculum_year_id, subject_id, grade, curriculum_type, unit_number, unit_name, topic_number, topic_name, is_active, sort_order) VALUES
('d0000000-0000-0000-0000-000000001101', '99999999-9999-9999-9999-999999999999', '44444444-4444-4444-4444-444444444444', 'TYT', 'OLD', 1, 'Sözcükte Anlam', '1.1', 'Sözcükte Anlam', 1, 1101),
('d0000000-0000-0000-0000-000000001102', '99999999-9999-9999-9999-999999999999', '44444444-4444-4444-4444-444444444444', 'TYT', 'OLD', 2, 'Paragraf', '2.1', 'Paragrafta Anlam', 1, 1102),
('d0000000-0000-0000-0000-000000001201', '99999999-9999-9999-9999-999999999999', '11111111-1111-1111-1111-111111111111', 'TYT', 'OLD', 1, 'Temel Kavramlar', '1.1', 'Sayılar ve Temel Kavramlar', 1, 1201),
('d0000000-0000-0000-0000-000000001202', '99999999-9999-9999-9999-999999999999', '11111111-1111-1111-1111-111111111111', 'TYT', 'OLD', 2, 'Problemler', '2.1', 'Sayı Problemleri', 1, 1202),
('d0000000-0000-0000-0000-000000001301', '99999999-9999-9999-9999-999999999999', '55555555-5555-5555-5555-555555555555', 'TYT', 'OLD', 1, 'Fizik Bilimine Giriş', '1.1', 'Madde ve Özellikleri', 1, 1301),
('d0000000-0000-0000-0000-000000001401', '99999999-9999-9999-9999-999999999999', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'TYT', 'OLD', 1, 'Tarih Bilimine Giriş', '1.1', 'İlk Türk Devletleri', 1, 1401),
('d0000000-0000-0000-0000-000000001402', '99999999-9999-9999-9999-999999999999', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'TYT', 'OLD', 2, 'Osmanlı Devleti', '2.1', 'Osmanlı Kuruluş Dönemi', 1, 1402)
ON CONFLICT (id) DO NOTHING;

-- 3.4 AYT — ESKİ müfredat (bu yıl YKS hâlâ eski)
INSERT INTO curriculum_topics (id, curriculum_year_id, subject_id, grade, curriculum_type, unit_number, unit_name, topic_number, topic_name, is_active, sort_order) VALUES
('d0000000-0000-0000-0000-000000001501', '99999999-9999-9999-9999-999999999999', '11111111-1111-1111-1111-111111111111', 'AYT', 'OLD', 1, 'Fonksiyonlar', '1.1', 'Fonksiyonlar', 1, 1501),
('d0000000-0000-0000-0000-000000001502', '99999999-9999-9999-9999-999999999999', '11111111-1111-1111-1111-111111111111', 'AYT', 'OLD', 2, 'Limit ve Türev', '2.1', 'Limit', 1, 1502),
('d0000000-0000-0000-0000-000000001503', '99999999-9999-9999-9999-999999999999', '11111111-1111-1111-1111-111111111111', 'AYT', 'OLD', 3, 'İntegral', '3.1', 'İntegral', 1, 1503),
('d0000000-0000-0000-0000-000000001601', '99999999-9999-9999-9999-999999999999', '22222222-2222-2222-2222-222222222222', 'AYT', 'OLD', 1, 'Kuvvet ve Hareket', '1.1', 'Bağıl Hareket', 1, 1601),
('d0000000-0000-0000-0000-000000001701', '99999999-9999-9999-9999-999999999999', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'AYT', 'OLD', 1, 'Modern Atom Teorisi', '1.1', 'Atom Modelleri', 1, 1701),
('d0000000-0000-0000-0000-000000001801', '99999999-9999-9999-9999-999999999999', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'AYT', 'OLD', 1, 'Sinir Sistemi', '1.1', 'Sinir Sistemi', 1, 1801),
('d0000000-0000-0000-0000-000000001901', '99999999-9999-9999-9999-999999999999', '88888888-8888-8888-8888-888888888888', 'AYT', 'OLD', 1, 'Şiir', '1.1', 'Cumhuriyet Dönemi Şiiri', 1, 1901),
('d0000000-0000-0000-0000-000000002001', '99999999-9999-9999-9999-999999999999', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'AYT', 'OLD', 1, 'İnkılap Tarihi', '1.1', 'Atatürk İlkeleri', 1, 2001)
ON CONFLICT (id) DO NOTHING;
