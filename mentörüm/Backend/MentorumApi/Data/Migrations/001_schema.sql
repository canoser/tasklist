-- 001_InitialSchema.sql
-- Mentorum MVP - Veritabanı Şeması (PostgreSQL)

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT,
    google_id TEXT,
    role TEXT CHECK(role IN ('Coach','Student','Parent')),
    full_name TEXT NOT NULL,
    avatar_url TEXT,
    is_active INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS coaches (
    id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    plan_type TEXT DEFAULT 'free'
);

CREATE TABLE IF NOT EXISTS students (
    id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    coach_id UUID REFERENCES users(id),
    grade INTEGER,
    track TEXT CHECK(track IN ('SAY','EA','SOZ','ORTAOKUL', null)),
    target_university TEXT,
    target_department TEXT,
    target_score REAL,
    coaching_start_date DATE,
    is_active INTEGER DEFAULT 1,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS coach_notes (
    id UUID PRIMARY KEY,
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    coach_id UUID REFERENCES coaches(id) ON DELETE CASCADE,
    content TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS parents (
    id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS student_parents (
    id UUID PRIMARY KEY,
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    parent_id UUID REFERENCES parents(id) ON DELETE SET NULL,
    parent_email TEXT NOT NULL,
    relation TEXT CHECK(relation IN ('Anne','Baba','Veli','Diğer')),
    phone TEXT,
    invite_token UUID,
    invite_expiry TIMESTAMP WITH TIME ZONE,
    is_accepted INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS exam_results (
    id UUID PRIMARY KEY,
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    coach_id UUID REFERENCES coaches(id) ON DELETE CASCADE,
    exam_date DATE,
    exam_type TEXT CHECK(exam_type IN ('TYT','AYT','LGS','Okul','Deneme','Diğer')),
    exam_name TEXT,
    total_net REAL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS exam_scores (
    exam_id UUID REFERENCES exam_results(id) ON DELETE CASCADE,
    subject_code TEXT,
    score REAL,
    max_score REAL,
    PRIMARY KEY (exam_id, subject_code)
);

CREATE TABLE IF NOT EXISTS subjects (
    id UUID PRIMARY KEY,
    name TEXT NOT NULL,
    short_code TEXT,
    default_color TEXT,
    is_system_subject INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS student_subjects (
    id UUID PRIMARY KEY,
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
    coach_id UUID REFERENCES coaches(id) ON DELETE CASCADE,
    resource_book TEXT,
    color TEXT,
    is_active INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS curriculum_years (
    id UUID PRIMARY KEY,
    year_label TEXT,
    is_active INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS curriculum_topics (
    id UUID PRIMARY KEY,
    curriculum_year_id UUID REFERENCES curriculum_years(id) ON DELETE CASCADE,
    subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
    grade INTEGER,
    curriculum_type TEXT CHECK(curriculum_type IN ('NEW','OLD')),
    unit_number INTEGER,
    unit_name TEXT,
    topic_number TEXT,
    topic_name TEXT,
    is_active INTEGER DEFAULT 1,
    sort_order INTEGER
);

CREATE TABLE IF NOT EXISTS homework_templates (
    id UUID PRIMARY KEY,
    coach_id UUID REFERENCES coaches(id) ON DELETE CASCADE,
    subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    resource_ref TEXT,
    curriculum_topic_id UUID REFERENCES curriculum_topics(id) ON DELETE SET NULL,
    free_topic TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS homework_assignments (
    id UUID PRIMARY KEY,
    template_id UUID REFERENCES homework_templates(id) ON DELETE SET NULL,
    snapshot_title TEXT NOT NULL,
    snapshot_desc TEXT,
    snapshot_source TEXT,
    template_version INTEGER DEFAULT 1,
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    student_subject_id UUID REFERENCES student_subjects(id) ON DELETE CASCADE,
    coach_id UUID REFERENCES coaches(id) ON DELETE CASCADE,
    due_date DATE NOT NULL,
    status TEXT CHECK(status IN ('PENDING','DONE','OVERDUE','LATE_DONE','CANCELLED')),
    completion_percentage SMALLINT CHECK(completion_percentage BETWEEN 0 AND 100),
    completed_at TIMESTAMP WITH TIME ZONE,
    completed_by TEXT CHECK(completed_by IN ('Student','Coach')),
    cancelled_at TIMESTAMP WITH TIME ZONE,
    cancel_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    type TEXT CHECK(type IN ('HOMEWORK_ASSIGNED','HOMEWORK_DUE','HOMEWORK_OVERDUE','HOMEWORK_DONE')),
    title TEXT,
    body TEXT,
    payload TEXT,
    is_read INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    read_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS invite_tokens (
    id UUID PRIMARY KEY,
    token UUID UNIQUE NOT NULL,
    email TEXT NOT NULL,
    role TEXT CHECK(role IN ('Student','Parent')),
    related_id UUID,
    expires_at TIMESTAMP WITH TIME ZONE,
    is_used INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS refresh_tokens (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    token TEXT UNIQUE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE,
    is_revoked INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_used_at TIMESTAMP WITH TIME ZONE
);

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

-- 003_InviteCode.sql
-- Kısa, insan dostu, yüksek entropili davet kodu (WhatsApp / kopyala-yapıştır paylaşımı için)
-- invite_tokens tablosuna "code" kolonu ekler.
ALTER TABLE invite_tokens ADD COLUMN IF NOT EXISTS code TEXT UNIQUE;

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

-- 005_HomeworkDirect.sql
-- Doğrudan ödev ataması (şablon olmadan) için ders/konu bilgisini atamaya ekler.
-- ON DELETE SET NULL: ders/konu silinse bile ödev (ve istatistik) korunur.
ALTER TABLE homework_assignments
    ADD COLUMN IF NOT EXISTS subject_id UUID REFERENCES subjects(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS curriculum_topic_id UUID REFERENCES curriculum_topics(id) ON DELETE SET NULL;

-- 006_SchoolModel.sql
-- V5 Okul/Dershane Modeli — Öğretmen, Ders, Öğrenci Grubu, Haftalık Program, Ders Kaynakları.
-- "expand" fazı: yeni tablolar geçici olarak coach_id ile oluşturulur.
-- program_id 007'de eklenir, coach_id 008'de kaldırılır (bkz. V5_OKUL_MODELI.md §1.5.9).

-- 1. Yeni tablolar
CREATE TABLE IF NOT EXISTS teachers (
    id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    coach_id UUID NOT NULL REFERENCES coaches(id) ON DELETE CASCADE,
    is_active INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS courses (
    id UUID PRIMARY KEY,
    coach_id UUID NOT NULL REFERENCES coaches(id) ON DELETE CASCADE,
    subject_id UUID NULL REFERENCES subjects(id) ON DELETE SET NULL,
    teacher_id UUID NULL REFERENCES users(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'DERS' CHECK(type IN ('DERS','SORU_COZUMU','DENEME','KITAP','VIDEO','DIGER')),
    color TEXT,
    is_active INTEGER DEFAULT 1,
    teacher_can_view_profile INTEGER DEFAULT 1,
    teacher_can_view_contact INTEGER DEFAULT 0,
    teacher_can_view_homework INTEGER DEFAULT 1,
    teacher_can_manage_homework INTEGER DEFAULT 1,
    teacher_can_view_exams INTEGER DEFAULT 1,
    teacher_can_manage_exams INTEGER DEFAULT 0,
    teacher_can_view_notes INTEGER DEFAULT 0,
    teacher_can_add_notes INTEGER DEFAULT 0,
    teacher_can_view_schedule INTEGER DEFAULT 1,
    teacher_can_manage_schedule INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS course_students (
    id UUID PRIMARY KEY,
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    coach_id UUID NOT NULL REFERENCES coaches(id) ON DELETE CASCADE,
    enrolled_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    is_active INTEGER DEFAULT 1,
    UNIQUE(course_id, student_id)
);

CREATE TABLE IF NOT EXISTS student_groups (
    id UUID PRIMARY KEY,
    coach_id UUID NOT NULL REFERENCES coaches(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    color TEXT,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS student_group_members (
    id UUID PRIMARY KEY,
    group_id UUID NOT NULL REFERENCES student_groups(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    coach_id UUID NOT NULL REFERENCES coaches(id) ON DELETE CASCADE,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(group_id, student_id)
);

CREATE TABLE IF NOT EXISTS course_groups (
    id UUID PRIMARY KEY,
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    group_id UUID NOT NULL REFERENCES student_groups(id) ON DELETE CASCADE,
    coach_id UUID NOT NULL REFERENCES coaches(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(course_id, group_id)
);

CREATE TABLE IF NOT EXISTS schedule_slots (
    id UUID PRIMARY KEY,
    coach_id UUID NOT NULL REFERENCES coaches(id) ON DELETE CASCADE,
    course_id UUID NULL REFERENCES courses(id) ON DELETE CASCADE,
    group_id UUID NULL REFERENCES student_groups(id) ON DELETE CASCADE,
    student_id UUID NULL REFERENCES students(id) ON DELETE CASCADE,
    day_of_week INTEGER NOT NULL CHECK(day_of_week BETWEEN 1 AND 7),
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    title TEXT NOT NULL,
    type TEXT CHECK(type IN ('DERS','OZEL_DERS','DENEME','TEKRAR','SORU_COZUMU','SERBEST')),
    valid_from DATE,
    valid_to DATE,
    color TEXT,
    is_active INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CHECK ((course_id IS NOT NULL)::int + (group_id IS NOT NULL)::int + (student_id IS NOT NULL)::int = 1),
    CHECK (start_time < end_time)
);

CREATE TABLE IF NOT EXISTS course_resources (
    id UUID PRIMARY KEY,
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    coach_id UUID NOT NULL REFERENCES coaches(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    type TEXT CHECK(type IN ('BOOK','VIDEO','QUESTION_SET','OTHER')),
    resource_ref TEXT,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS course_resource_progress (
    id UUID PRIMARY KEY,
    course_resource_id UUID NOT NULL REFERENCES course_resources(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    coach_id UUID NOT NULL REFERENCES coaches(id) ON DELETE CASCADE,
    progress SMALLINT CHECK(progress BETWEEN 0 AND 100),
    is_done INTEGER DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(course_resource_id, student_id)
);

-- 2. users.role CHECK'e 'Teacher' ekle (idempotent)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_role_check' AND conrelid = 'users'::regclass) THEN
        ALTER TABLE users DROP CONSTRAINT users_role_check;
    END IF;
END $$;
ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('Coach','Student','Parent','Teacher','Admin'));

-- 3. invite_tokens.role CHECK'e 'Teacher' ekle (idempotent)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'invite_tokens_role_check' AND conrelid = 'invite_tokens'::regclass) THEN
        ALTER TABLE invite_tokens DROP CONSTRAINT invite_tokens_role_check;
    END IF;
END $$;
ALTER TABLE invite_tokens ADD CONSTRAINT invite_tokens_role_check CHECK (role IN ('Student','Parent','Teacher'));

-- 4. notifications.type CHECK genişlet (idempotent)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'notifications_type_check' AND conrelid = 'notifications'::regclass) THEN
        ALTER TABLE notifications DROP CONSTRAINT notifications_type_check;
    END IF;
END $$;
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check CHECK (type IN ('HOMEWORK_ASSIGNED','HOMEWORK_DUE','HOMEWORK_OVERDUE','HOMEWORK_DONE','SCHEDULE_UPDATED','TEACHER_ASSIGNED','TEACHER_DEACTIVATED','RESOURCE_ASSIGNED'));

-- 5. homework_assignments'a course_id + created_by ekle
ALTER TABLE homework_assignments
    ADD COLUMN IF NOT EXISTS course_id UUID REFERENCES courses(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id) ON DELETE SET NULL;

-- 6. exam_results'a created_by ekle
ALTER TABLE exam_results
    ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id) ON DELETE SET NULL;

-- 007_AdminAndPrograms.sql
-- V5 Koçluk Programı — coaching_programs, program_coaches, program_teachers, system_settings,
-- süper yönetici (Admin) rolü, koç onayı, program_id kolonları + backfill.
-- "expand + backfill" fazı. coach_id 008_ContractCoachId.sql'de kaldırılır.

-- 1. Yeni tablolar
CREATE TABLE IF NOT EXISTS coaching_programs (
    id UUID PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    color TEXT,
    is_active INTEGER DEFAULT 1,
    archived_at TIMESTAMP WITH TIME ZONE NULL,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS program_coaches (
    id UUID PRIMARY KEY,
    program_id UUID NOT NULL REFERENCES coaching_programs(id) ON DELETE CASCADE,
    coach_id UUID NOT NULL REFERENCES coaches(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK(role IN ('YONETICI','YARDIMCI')),
    added_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(program_id, coach_id)
);
-- Tek yönetici garantisi (DB seviyesinde)
CREATE UNIQUE INDEX IF NOT EXISTS ux_program_one_admin ON program_coaches(program_id) WHERE role = 'YONETICI';

CREATE TABLE IF NOT EXISTS program_teachers (
    id UUID PRIMARY KEY,
    program_id UUID NOT NULL REFERENCES coaching_programs(id) ON DELETE CASCADE,
    teacher_id UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
    is_active INTEGER DEFAULT 1,
    added_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(program_id, teacher_id)
);

CREATE TABLE IF NOT EXISTS system_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_by UUID REFERENCES users(id) ON DELETE SET NULL
);

-- 2. users.role CHECK'e 'Admin' ekle (idempotent)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_role_check' AND conrelid = 'users'::regclass) THEN
        ALTER TABLE users DROP CONSTRAINT users_role_check;
    END IF;
END $$;
ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('Coach','Student','Parent','Teacher','Admin'));

-- 3. invite_tokens.role CHECK'e 'Coach' ekle (yardımcı koç daveti) — idempotent
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'invite_tokens_role_check' AND conrelid = 'invite_tokens'::regclass) THEN
        ALTER TABLE invite_tokens DROP CONSTRAINT invite_tokens_role_check;
    END IF;
END $$;
ALTER TABLE invite_tokens ADD CONSTRAINT invite_tokens_role_check CHECK (role IN ('Student','Parent','Teacher','Coach'));

-- 4. notifications.type CHECK genişlet (koç onay + program tipleri) — idempotent
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'notifications_type_check' AND conrelid = 'notifications'::regclass) THEN
        ALTER TABLE notifications DROP CONSTRAINT notifications_type_check;
    END IF;
END $$;
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check CHECK (type IN ('HOMEWORK_ASSIGNED','HOMEWORK_DUE','HOMEWORK_OVERDUE','HOMEWORK_DONE','SCHEDULE_UPDATED','TEACHER_ASSIGNED','RESOURCE_ASSIGNED','COACH_APPROVAL_REQUESTED','COACH_APPROVED','PROGRAM_COACH_ADDED','PROGRAM_ADMIN_TRANSFERRED'));

-- 5. coaches'a onay + program limiti kolonları
ALTER TABLE coaches
    ADD COLUMN IF NOT EXISTS approval_status TEXT NOT NULL DEFAULT 'APPROVED' CHECK(approval_status IN ('PENDING','APPROVED','REJECTED')),
    ADD COLUMN IF NOT EXISTS max_programs INTEGER NULL,
    ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE;

-- 6. program_id kolonları (NULL) ekle — mevcut V4 tabloları
ALTER TABLE students ADD COLUMN IF NOT EXISTS program_id UUID REFERENCES coaching_programs(id) ON DELETE SET NULL;
ALTER TABLE coach_notes ADD COLUMN IF NOT EXISTS program_id UUID REFERENCES coaching_programs(id) ON DELETE SET NULL;
ALTER TABLE exam_results ADD COLUMN IF NOT EXISTS program_id UUID REFERENCES coaching_programs(id) ON DELETE SET NULL;
ALTER TABLE student_subjects ADD COLUMN IF NOT EXISTS program_id UUID REFERENCES coaching_programs(id) ON DELETE SET NULL;
ALTER TABLE homework_assignments ADD COLUMN IF NOT EXISTS program_id UUID REFERENCES coaching_programs(id) ON DELETE SET NULL;

-- 7. program_id kolonları ekle — V5 okul modeli tabloları (006'da coach_id ile oluştu)
ALTER TABLE teachers ADD COLUMN IF NOT EXISTS program_id UUID REFERENCES coaching_programs(id) ON DELETE SET NULL;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS program_id UUID REFERENCES coaching_programs(id) ON DELETE SET NULL;
ALTER TABLE course_students ADD COLUMN IF NOT EXISTS program_id UUID REFERENCES coaching_programs(id) ON DELETE SET NULL;
ALTER TABLE student_groups ADD COLUMN IF NOT EXISTS program_id UUID REFERENCES coaching_programs(id) ON DELETE SET NULL;
ALTER TABLE student_group_members ADD COLUMN IF NOT EXISTS program_id UUID REFERENCES coaching_programs(id) ON DELETE SET NULL;
ALTER TABLE course_groups ADD COLUMN IF NOT EXISTS program_id UUID REFERENCES coaching_programs(id) ON DELETE SET NULL;
ALTER TABLE schedule_slots ADD COLUMN IF NOT EXISTS program_id UUID REFERENCES coaching_programs(id) ON DELETE SET NULL;
ALTER TABLE course_resources ADD COLUMN IF NOT EXISTS program_id UUID REFERENCES coaching_programs(id) ON DELETE SET NULL;
ALTER TABLE course_resource_progress ADD COLUMN IF NOT EXISTS program_id UUID REFERENCES coaching_programs(id) ON DELETE SET NULL;

-- 8. Backfill (idempotent): her mevcut koç için "Koçluk Programım" aç, koçu YÖNETİCİ yap.
DO $$
DECLARE c RECORD;
BEGIN
    FOR c IN SELECT id FROM coaches LOOP
        IF NOT EXISTS (SELECT 1 FROM coaching_programs WHERE created_by = c.id) THEN
            INSERT INTO coaching_programs (id, name, created_by) VALUES (gen_random_uuid(), 'Koçluk Programım', c.id);
        END IF;
        INSERT INTO program_coaches (id, program_id, coach_id, role, added_by)
        SELECT gen_random_uuid(), id, c.id, 'YONETICI', c.id FROM coaching_programs WHERE created_by = c.id
        ON CONFLICT (program_id, coach_id) DO NOTHING;
    END LOOP;
END $$;

-- 9. program_id backfill (kocun YONETICI programi uzerinden) -- idempotent (WHERE program_id IS NULL ve coach_id varsa)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'students' AND column_name = 'coach_id') THEN
        EXECUTE 'UPDATE students s SET program_id = pc.program_id FROM program_coaches pc WHERE pc.coach_id = s.coach_id AND pc.role = ''YONETICI'' AND s.program_id IS NULL';
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'coach_notes' AND column_name = 'coach_id') THEN
        EXECUTE 'UPDATE coach_notes cn SET program_id = pc.program_id FROM program_coaches pc WHERE pc.coach_id = cn.coach_id AND pc.role = ''YONETICI'' AND cn.program_id IS NULL';
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'exam_results' AND column_name = 'coach_id') THEN
        EXECUTE 'UPDATE exam_results er SET program_id = pc.program_id FROM program_coaches pc WHERE pc.coach_id = er.coach_id AND pc.role = ''YONETICI'' AND er.program_id IS NULL';
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'student_subjects' AND column_name = 'coach_id') THEN
        EXECUTE 'UPDATE student_subjects ss SET program_id = pc.program_id FROM program_coaches pc WHERE pc.coach_id = ss.coach_id AND pc.role = ''YONETICI'' AND ss.program_id IS NULL';
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'homework_assignments' AND column_name = 'coach_id') THEN
        EXECUTE 'UPDATE homework_assignments ha SET program_id = pc.program_id FROM program_coaches pc WHERE pc.coach_id = ha.coach_id AND pc.role = ''YONETICI'' AND ha.program_id IS NULL';
    END IF;
END $$;

-- 10. Mevcut (V4) koçları APPROVED yap (backfill) — idempotent (programı olan PENDING koçlar APPROVED)
UPDATE coaches c
SET approval_status = 'APPROVED'
WHERE c.approval_status = 'PENDING'
  AND EXISTS (SELECT 1 FROM coaching_programs cp WHERE cp.created_by = c.id);

-- 008_ContractCoachId.sql
-- "contract" fazı: canlıda doğrulandıktan SONRA coach_id kaldırılır.
-- (bkz. V5_OKUL_MODELI.md §1.5.9 — aynı migration'da DROP yasak; bu ayrı migration'dır.)

-- 0. Yazar bilgisini koru: coach_id'yi created_by'ye taşı (idempotent)
ALTER TABLE coach_notes ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE student_subjects ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id) ON DELETE SET NULL;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'coach_notes' AND column_name = 'coach_id') THEN
        EXECUTE 'UPDATE coach_notes SET created_by = coach_id WHERE created_by IS NULL AND coach_id IS NOT NULL';
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'student_subjects' AND column_name = 'coach_id') THEN
        EXECUTE 'UPDATE student_subjects SET created_by = coach_id WHERE created_by IS NULL AND coach_id IS NOT NULL';
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'homework_assignments' AND column_name = 'coach_id') THEN
        EXECUTE 'UPDATE homework_assignments SET created_by = coach_id WHERE created_by IS NULL AND coach_id IS NOT NULL';
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'exam_results' AND column_name = 'coach_id') THEN
        EXECUTE 'UPDATE exam_results SET created_by = coach_id WHERE created_by IS NULL AND coach_id IS NOT NULL';
    END IF;
END $$;

-- 0.5 Ön kontrol: program_id NULL kalan satır varsa net hata ver (fail-fast)
DO $$
DECLARE
    tbl TEXT;
    null_count BIGINT;
    tables TEXT[] := ARRAY[
        'students','coach_notes','exam_results','student_subjects','homework_assignments',
        'teachers','courses','course_students','student_groups','student_group_members',
        'course_groups','schedule_slots','course_resources','course_resource_progress'];
BEGIN
    FOREACH tbl IN ARRAY tables LOOP
        EXECUTE format('SELECT COUNT(*) FROM %I WHERE program_id IS NULL', tbl) INTO null_count;
        IF null_count > 0 THEN
            RAISE EXCEPTION '%: program_id NULL olan % satır var (007 backfill eksik). 008 iptal edildi.', tbl, null_count;
        END IF;
    END LOOP;
END $$;

-- 1. program_id NOT NULL (007 backfill'i tamamlandı)
ALTER TABLE students ALTER COLUMN program_id SET NOT NULL;
ALTER TABLE coach_notes ALTER COLUMN program_id SET NOT NULL;
ALTER TABLE exam_results ALTER COLUMN program_id SET NOT NULL;
ALTER TABLE student_subjects ALTER COLUMN program_id SET NOT NULL;
ALTER TABLE homework_assignments ALTER COLUMN program_id SET NOT NULL;
ALTER TABLE teachers ALTER COLUMN program_id SET NOT NULL;
ALTER TABLE courses ALTER COLUMN program_id SET NOT NULL;
ALTER TABLE course_students ALTER COLUMN program_id SET NOT NULL;
ALTER TABLE student_groups ALTER COLUMN program_id SET NOT NULL;
ALTER TABLE student_group_members ALTER COLUMN program_id SET NOT NULL;
ALTER TABLE course_groups ALTER COLUMN program_id SET NOT NULL;
ALTER TABLE schedule_slots ALTER COLUMN program_id SET NOT NULL;
ALTER TABLE course_resources ALTER COLUMN program_id SET NOT NULL;
ALTER TABLE course_resource_progress ALTER COLUMN program_id SET NOT NULL;

-- 2. coach_id DROP (homework_templates.coach_id KALIR — kişisel kütüphane)
ALTER TABLE students DROP COLUMN IF EXISTS coach_id;
ALTER TABLE coach_notes DROP COLUMN IF EXISTS coach_id;
ALTER TABLE exam_results DROP COLUMN IF EXISTS coach_id;
ALTER TABLE student_subjects DROP COLUMN IF EXISTS coach_id;
ALTER TABLE homework_assignments DROP COLUMN IF EXISTS coach_id;
ALTER TABLE teachers DROP COLUMN IF EXISTS coach_id;
ALTER TABLE courses DROP COLUMN IF EXISTS coach_id;
ALTER TABLE course_students DROP COLUMN IF EXISTS coach_id;
ALTER TABLE student_groups DROP COLUMN IF EXISTS coach_id;
ALTER TABLE student_group_members DROP COLUMN IF EXISTS coach_id;
ALTER TABLE course_groups DROP COLUMN IF EXISTS coach_id;
ALTER TABLE schedule_slots DROP COLUMN IF EXISTS coach_id;
ALTER TABLE course_resources DROP COLUMN IF EXISTS coach_id;
ALTER TABLE course_resource_progress DROP COLUMN IF EXISTS coach_id;

-- 009_AdminAndApproval.sql
-- Süper yönetici (admin = koç + admin bayrağı) + jenerik onay durumu (tüm roller).

-- 1. Admin bayrağı
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT FALSE;

-- 2. Jenerik onay durumu (Koç/Öğrenci/Veli hepsi onaya düşer)
ALTER TABLE users ADD COLUMN IF NOT EXISTS approval_status TEXT NOT NULL DEFAULT 'APPROVED'
    CHECK(approval_status IN ('PENDING','APPROVED','REJECTED'));

-- 3. Mevcut koç onay durumunu users tablosuna taşı (idempotent)
UPDATE users SET approval_status = 'PENDING' WHERE id IN (SELECT id FROM coaches WHERE approval_status = 'PENDING');
UPDATE users SET approval_status = 'REJECTED' WHERE id IN (SELECT id FROM coaches WHERE approval_status = 'REJECTED');

-- 4. Şifre sıfırlama tokenları
CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token TEXT NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    is_used BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 010_ExamCourseId.sql
-- V6: Öğretmen kendi dersine sınav sonucu/not girebilsin diye exam_results.course_id eklenir.
-- course_id NULL olabilir: koçun girdiği global deneme netleri (TYT/AYT/LGS) NULL kalır,
-- öğretmenin girdiği ders notu course_id taşır (bkz. AJAN_KONUSMALARI_HATALAR_TESPITLER.md).

ALTER TABLE exam_results ADD COLUMN IF NOT EXISTS course_id UUID REFERENCES courses(id) ON DELETE SET NULL;

-- 011_CoachProfile.sql
-- Koç profili: biyografi + uzmanlık alanı (koçun kendisi hakkında yazabilmesi).
ALTER TABLE coaches
    ADD COLUMN IF NOT EXISTS bio TEXT NULL,
    ADD COLUMN IF NOT EXISTS specialty TEXT NULL;

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

-- 013_ProgramCategory.sql
-- Program kategorisi / hedef etiketi (YKS, LGS, Ara Sınıf, Okul Dersi).
ALTER TABLE coaching_programs
    ADD COLUMN IF NOT EXISTS category TEXT NULL;

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

-- 015_CoachingSessionPrep.sql
-- M-157: öğrencinin görüşme öncesi hazırlık/öz-değerlendirme notu.
ALTER TABLE coaching_sessions
    ADD COLUMN IF NOT EXISTS prep_notes TEXT NULL;

-- 016_SecurityHardening.sql
-- Güvenlik sertleştirme: kullanıcı bazlı DB idempotency + kalıcı auth rate limiting.

-- 1. Idempotency (kullanıcı bazlı, in-flight durum yönetimi)
CREATE TABLE IF NOT EXISTS idempotency_keys (
    user_id TEXT NOT NULL,
    key VARCHAR(100) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','COMPLETED')),
    status_code INT NULL,
    response_body TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, key)
);
CREATE INDEX IF NOT EXISTS idx_idempotency_created ON idempotency_keys(created_at);

-- 2. Auth rate limiting (atomik upsert ile kalıcı, işlem sırasında kilitsiz)
CREATE TABLE IF NOT EXISTS auth_attempts (
    bucket TEXT PRIMARY KEY,
    window_start BIGINT NOT NULL,
    attempts INT NOT NULL
);


-- ============================================================================
-- V12–V16 Birleştirilmiş Şema Genişletmeleri (eski 002..023, 025..027)
-- Not: 024_cleanup_and_seed_test_ecosystem.sql geliştirme seed'i olarak
--      docs/seeds/dev_seed_ecosystem.sql konumuna taşınmıştır.
-- ============================================================================

-- [002_teacher_process_homework]
ALTER TABLE courses ADD COLUMN IF NOT EXISTS teacher_can_process_homework INTEGER NOT NULL DEFAULT 0;
ALTER TABLE homework_assignments ADD COLUMN IF NOT EXISTS feedback TEXT NOT NULL DEFAULT '';

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'homework_assignments_completed_by_check' AND conrelid = 'homework_assignments'::regclass) THEN
        ALTER TABLE homework_assignments DROP CONSTRAINT homework_assignments_completed_by_check;
    END IF;
END $$;
ALTER TABLE homework_assignments ADD CONSTRAINT homework_assignments_completed_by_check CHECK (completed_by IN ('Student','Coach','Teacher'));

-- [003_teacher_notes & 007_teacher_notes_visibility]
CREATE TABLE IF NOT EXISTS teacher_notes (
    id UUID PRIMARY KEY,
    program_id UUID NOT NULL REFERENCES coaching_programs(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    teacher_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    note TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_teacher_notes_course_student ON teacher_notes(course_id, student_id);
ALTER TABLE teacher_notes ADD COLUMN IF NOT EXISTS visibility VARCHAR(16) NOT NULL DEFAULT 'STUDENT_VISIBLE';
ALTER TABLE teacher_notes ADD COLUMN IF NOT EXISTS summary TEXT NULL;

-- [004_teacher_assignment_status]
ALTER TABLE courses ADD COLUMN IF NOT EXISTS assignment_status VARCHAR(16) NOT NULL DEFAULT 'ACTIVE';
ALTER TABLE courses ADD COLUMN IF NOT EXISTS ended_at TIMESTAMPTZ NULL;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS end_reason VARCHAR(255) NULL;
ALTER TABLE program_teachers ADD COLUMN IF NOT EXISTS assignment_status VARCHAR(16) NOT NULL DEFAULT 'ACTIVE';
ALTER TABLE program_teachers ADD COLUMN IF NOT EXISTS ended_at TIMESTAMPTZ NULL;
ALTER TABLE program_teachers ADD COLUMN IF NOT EXISTS end_reason VARCHAR(255) NULL;

-- [005_parent_visibility_flags]
ALTER TABLE student_parents ADD COLUMN IF NOT EXISTS can_view_exams INTEGER NOT NULL DEFAULT 0;
ALTER TABLE student_parents ADD COLUMN IF NOT EXISTS can_view_homework INTEGER NOT NULL DEFAULT 0;
ALTER TABLE student_parents ADD COLUMN IF NOT EXISTS can_view_calendar INTEGER NOT NULL DEFAULT 0;
ALTER TABLE student_parents ADD COLUMN IF NOT EXISTS can_view_study_stats INTEGER NOT NULL DEFAULT 0;
ALTER TABLE student_parents ADD COLUMN IF NOT EXISTS can_view_payments INTEGER NOT NULL DEFAULT 0;

-- [006_approval_items]
CREATE TABLE IF NOT EXISTS approval_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    program_id UUID NOT NULL,
    entity_type VARCHAR(32) NOT NULL,
    entity_id UUID NOT NULL,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    status VARCHAR(16) NOT NULL DEFAULT 'PENDING',
    created_by UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved_at TIMESTAMPTZ NULL,
    resolved_by UUID NULL,
    rejection_reason VARCHAR(255) NULL,
    UNIQUE (entity_type, entity_id)
);
CREATE INDEX IF NOT EXISTS idx_approval_items_program_status ON approval_items(program_id, status);

-- [008_study_sessions]
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

-- [009_personal_events_category & 017_personal_events_checkin]
ALTER TABLE personal_events ADD COLUMN IF NOT EXISTS category VARCHAR(16) NULL;
ALTER TABLE personal_events ADD COLUMN IF NOT EXISTS checked_in INTEGER NOT NULL DEFAULT 0;
ALTER TABLE personal_events ADD COLUMN IF NOT EXISTS actual_minutes INTEGER NULL;

-- [010_payments]
CREATE TABLE IF NOT EXISTS payment_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    program_id UUID NOT NULL,
    student_id UUID NOT NULL,
    parent_id UUID NULL,
    period_type VARCHAR(16) NOT NULL,
    amount NUMERIC(12,2) NOT NULL,
    currency VARCHAR(8) NOT NULL DEFAULT 'TRY',
    month_day INTEGER NULL,
    start_date DATE NOT NULL,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_by UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS payment_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id UUID NOT NULL,
    due_date DATE NOT NULL,
    base_amount NUMERIC(12,2) NOT NULL,
    paid_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
    status VARCHAR(16) NOT NULL DEFAULT 'PENDING',
    currency VARCHAR(8) NOT NULL DEFAULT 'TRY',
    paid_at TIMESTAMPTZ NULL,
    rolled_from_item_id UUID NULL,
    notes TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id UUID NOT NULL,
    amount NUMERIC(12,2) NOT NULL,
    method VARCHAR(32) NULL,
    recorded_by UUID NOT NULL,
    paid_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    status VARCHAR(16) NOT NULL DEFAULT 'PAID',
    receipt_url TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- [011_rate_limit_rules]
CREATE TABLE IF NOT EXISTS rate_limit_rules (
    path TEXT PRIMARY KEY,
    max_attempts INTEGER NOT NULL,
    window_seconds INTEGER NOT NULL DEFAULT 300,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by UUID NULL
);

INSERT INTO rate_limit_rules (path, max_attempts, window_seconds) VALUES
    ('/api/v1/auth/login', 40, 300),
    ('/api/v1/auth/register', 40, 300),
    ('/api/v1/auth/google', 40, 300),
    ('/api/v1/invites/send', 20, 300)
ON CONFLICT (path) DO NOTHING;

CREATE TABLE IF NOT EXISTS rate_limit_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    path TEXT NOT NULL,
    ip TEXT NOT NULL,
    attempts INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_rate_limit_events_created ON rate_limit_events(created_at DESC);

-- [012_user_theme]
ALTER TABLE users ADD COLUMN IF NOT EXISTS theme_mode VARCHAR(8) NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS theme_style VARCHAR(16) NULL;

-- [013_student_checkins]
CREATE TABLE IF NOT EXISTS student_checkins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    program_id UUID NOT NULL,
    student_id UUID NOT NULL,
    checkin_date DATE NOT NULL,
    mood VARCHAR(16) NOT NULL,
    note TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (student_id, checkin_date)
);
CREATE INDEX IF NOT EXISTS idx_student_checkins_student ON student_checkins(student_id, checkin_date DESC);

-- [014_student_notes]
CREATE TABLE IF NOT EXISTS student_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    program_id UUID NOT NULL,
    student_id UUID NOT NULL,
    title TEXT NOT NULL DEFAULT '',
    content TEXT NOT NULL DEFAULT '',
    visibility VARCHAR(16) NOT NULL DEFAULT 'PRIVATE',
    is_pinned INTEGER NOT NULL DEFAULT 0,
    event_date DATE NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_student_notes_student ON student_notes(student_id, updated_at DESC);

-- [015_student_questions]
CREATE TABLE IF NOT EXISTS student_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    program_id UUID NOT NULL,
    student_id UUID NOT NULL,
    subject_id UUID NULL,
    topic_text TEXT NOT NULL DEFAULT '',
    status VARCHAR(16) NOT NULL DEFAULT 'OPEN',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_student_questions_student ON student_questions(student_id, created_at DESC);

-- [016_school_schedules]
CREATE TABLE IF NOT EXISTS school_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    program_id UUID NOT NULL,
    student_id UUID NOT NULL,
    day_of_week INTEGER NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    label TEXT NOT NULL DEFAULT 'Okul',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_school_schedules_student ON school_schedules(student_id, day_of_week);

-- [018_homework_student_note]
ALTER TABLE homework_assignments ADD COLUMN IF NOT EXISTS student_note TEXT NULL;

-- [019_uploads]
CREATE TABLE IF NOT EXISTS uploads (
    id UUID PRIMARY KEY,
    program_id UUID NOT NULL REFERENCES coaching_programs(id) ON DELETE CASCADE,
    sender_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    recipient_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    course_id UUID NULL REFERENCES courses(id) ON DELETE SET NULL,
    homework_id UUID NULL REFERENCES homework_assignments(id) ON DELETE SET NULL,
    student_question_id UUID NULL REFERENCES student_questions(id) ON DELETE SET NULL,
    object_key TEXT NOT NULL UNIQUE,
    content_type TEXT NOT NULL,
    size_bytes BIGINT NOT NULL,
    original_name TEXT NOT NULL,
    status VARCHAR(16) NOT NULL DEFAULT 'PENDING' CHECK(status IN ('PENDING','UPLOADED','DELETED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS upload_deliveries (
    id UUID PRIMARY KEY,
    upload_id UUID NOT NULL REFERENCES uploads(id) ON DELETE CASCADE,
    recipient_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    direction VARCHAR(8) NOT NULL CHECK(direction IN ('IN','OUT')),
    status VARCHAR(16) NOT NULL DEFAULT 'PENDING' CHECK(status IN ('PENDING','DOWNLOADED')),
    device_id UUID NULL,
    local_path TEXT NULL,
    file_hash TEXT NULL,
    delivered_at TIMESTAMPTZ NULL
);

CREATE TABLE IF NOT EXISTS user_devices (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    device_uid TEXT NOT NULL,
    platform VARCHAR(16) NOT NULL CHECK(platform IN ('web','android','ios')),
    label TEXT NOT NULL,
    first_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, device_uid)
);

CREATE INDEX IF NOT EXISTS idx_uploads_program ON uploads(program_id);
CREATE INDEX IF NOT EXISTS idx_uploads_recipient ON uploads(recipient_user_id);
CREATE INDEX IF NOT EXISTS idx_deliveries_upload ON upload_deliveries(upload_id);

-- [020_storage_columns]
ALTER TABLE coaches ADD COLUMN IF NOT EXISTS storage_quota_mb INT NOT NULL DEFAULT 50;
ALTER TABLE coaches ADD COLUMN IF NOT EXISTS storage_warn_percent INT NOT NULL DEFAULT 80;
ALTER TABLE coaches ADD COLUMN IF NOT EXISTS storage_mode VARCHAR(16) NOT NULL DEFAULT 'LOCAL';
ALTER TABLE users ADD COLUMN IF NOT EXISTS download_device_id UUID NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS hide_device_picker_tip INT NOT NULL DEFAULT 0;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS teacher_can_share_files INT NOT NULL DEFAULT 1;
ALTER TABLE student_questions ADD COLUMN IF NOT EXISTS upload_id UUID NULL;
ALTER TABLE course_resources ADD COLUMN IF NOT EXISTS upload_id UUID NULL;

-- [021_question_collections]
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

-- [022_student_flexibility]
ALTER TABLE users ALTER COLUMN email DROP NOT NULL;
ALTER TABLE students ADD COLUMN IF NOT EXISTS invite_status VARCHAR(16) NOT NULL DEFAULT 'NOT_INVITED';

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'courses_type_check' AND conrelid = 'courses'::regclass) THEN
        ALTER TABLE courses DROP CONSTRAINT courses_type_check;
    END IF;
END $$;
ALTER TABLE courses ADD CONSTRAINT courses_type_check CHECK (type IN ('DERS','OZEL_DERS','SORU_COZUMU','DENEME','KITAP','VIDEO','DIGER'));

ALTER TABLE student_group_members ADD COLUMN IF NOT EXISTS is_active INTEGER NOT NULL DEFAULT 1;

-- [023_coach_limits]
ALTER TABLE coaches ADD COLUMN IF NOT EXISTS max_students INTEGER NULL;
ALTER TABLE coaches ADD COLUMN IF NOT EXISTS max_teachers INTEGER NULL;

INSERT INTO system_settings (key, value) VALUES ('default_max_programs', '1')
ON CONFLICT (key) DO UPDATE SET value = '1';
INSERT INTO system_settings (key, value) VALUES ('default_max_students', '20')
ON CONFLICT (key) DO NOTHING;
INSERT INTO system_settings (key, value) VALUES ('default_max_teachers', '5')
ON CONFLICT (key) DO NOTHING;

-- [025_teacher_details]
ALTER TABLE teachers ADD COLUMN IF NOT EXISTS branch TEXT;
ALTER TABLE teachers ADD COLUMN IF NOT EXISTS phone TEXT;

-- [026_v15_exam_analytics_and_audit_logs]
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

ALTER TABLE homework_assignments
    ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1;

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

ALTER TABLE exam_scores
    ADD COLUMN IF NOT EXISTS subject_id UUID NULL REFERENCES subjects(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS curriculum_topic_id UUID NULL REFERENCES curriculum_topics(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS subject_name TEXT NULL,
    ADD COLUMN IF NOT EXISTS unit_name TEXT NULL,
    ADD COLUMN IF NOT EXISTS topic_name TEXT NULL;

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

-- [027_v16_ux_communications_and_coaching_tools]
ALTER TABLE students
    ADD COLUMN IF NOT EXISTS phone TEXT NULL,
    ADD COLUMN IF NOT EXISTS monthly_milestone TEXT NULL,
    ADD COLUMN IF NOT EXISTS weekly_target_minutes INTEGER NULL,
    ADD COLUMN IF NOT EXISTS weekly_target_questions INTEGER NULL;

ALTER TABLE student_questions
    ADD COLUMN IF NOT EXISTS coach_reply TEXT NULL,
    ADD COLUMN IF NOT EXISTS replied_by UUID NULL REFERENCES users(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS replied_at TIMESTAMP WITH TIME ZONE NULL;

ALTER TABLE homework_assignments
    ADD COLUMN IF NOT EXISTS priority TEXT NOT NULL DEFAULT 'NORMAL'
        CHECK (priority IN ('HIGH', 'NORMAL', 'LOW')),
    ADD COLUMN IF NOT EXISTS assigned_via TEXT NOT NULL DEFAULT 'INDIVIDUAL'
        CHECK (assigned_via IN ('INDIVIDUAL', 'GROUP'));

ALTER TABLE exam_results
    ADD COLUMN IF NOT EXISTS error_reasons TEXT NULL;

CREATE TABLE IF NOT EXISTS student_coaching_tools (
    student_id UUID PRIMARY KEY REFERENCES students(id) ON DELETE CASCADE,
    swot_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    wheel_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    habits_data JSONB NOT NULL DEFAULT '[]'::jsonb,
    updated_by UUID NULL REFERENCES users(id) ON DELETE SET NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- [V17 — B1.4 & S7] GROW Koçluk Görüşmesi Kolonu ve Aktif Kurs-Öğrenci Görünümü
-- ============================================================================

ALTER TABLE coaching_sessions
    ADD COLUMN IF NOT EXISTS grow_data JSONB NULL;

CREATE OR REPLACE VIEW vw_active_course_students AS
SELECT cs.course_id, cs.student_id
FROM course_students cs
WHERE cs.is_active = 1
UNION
SELECT cg.course_id, sgm.student_id
FROM course_groups cg
JOIN student_group_members sgm ON sgm.group_id = cg.group_id
WHERE sgm.is_active = 1;

CREATE OR REPLACE VIEW vw_active_student_groups AS
SELECT student_id, group_id, program_id
FROM student_group_members
WHERE is_active = 1;
