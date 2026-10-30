-- dev_seed_ecosystem.sql (taşındığı dosya: 024_cleanup_and_seed_test_ecosystem.sql)
-- YALNIZCA YEREL GELİŞTİRME ORTAMINDA MANUEL ÇALIŞTIRILMALIDIR!
-- V13.2 Temizlik ve Test Ekosistemi Kurulumu:
-- 1. canoser@gmail.com dışındaki tüm eski kullanıcılar, eski programlar ve ilişkili veriler temizlenir.
-- 2. canoser@gmail.com için tek bir temiz 'Koçluk Programım' oluşturulur.
-- 3. canoser@gmail.com'a tanımlı 2 öğretmen, 5 ders ve 10 öğrenci (grup + bireysel) eklenir.
-- Tüm hesapların test şifresi: 123456

DO $$
DECLARE
    v_coach_id UUID;
    v_prog_id UUID := gen_random_uuid();
    v_hash TEXT := '$2a$11$0LTMVDJfXIkpge55Q890Ju8eA7mwYED2fi0.uR0B18P8eFRWZ1DQS'; -- 123456

    -- Öğretmen ID'leri
    v_t1_id UUID := gen_random_uuid();
    v_t2_id UUID := gen_random_uuid();

    -- Ders ID'leri
    v_c1_id UUID := gen_random_uuid(); -- TYT Matematik
    v_c2_id UUID := gen_random_uuid(); -- AYT Matematik
    v_c3_id UUID := gen_random_uuid(); -- Geometri
    v_c4_id UUID := gen_random_uuid(); -- TYT Fizik
    v_c5_id UUID := gen_random_uuid(); -- AYT Fizik

    -- Grup ID'leri
    v_g1_id UUID := gen_random_uuid(); -- 12-A Sayısal Grubu
    v_g2_id UUID := gen_random_uuid(); -- 11-A Eşit Ağırlık Grubu

    -- Öğrenci ID'leri (10 öğrenci)
    v_s1_id UUID := gen_random_uuid();
    v_s2_id UUID := gen_random_uuid();
    v_s3_id UUID := gen_random_uuid();
    v_s4_id UUID := gen_random_uuid();
    v_s5_id UUID := gen_random_uuid();
    v_s6_id UUID := gen_random_uuid();
    v_s7_id UUID := gen_random_uuid();
    v_s8_id UUID := gen_random_uuid();
    v_s9_id UUID := gen_random_uuid();
    v_s10_id UUID := gen_random_uuid();

    -- Bireysel Kurs ID'leri (OZEL_DERS)
    v_od1_id UUID := gen_random_uuid();
    v_od7_id UUID := gen_random_uuid();
    v_od8_id UUID := gen_random_uuid();
    v_od9_id UUID := gen_random_uuid();
    v_od10_id UUID := gen_random_uuid();

BEGIN
    -- 1. canoser@gmail.com kullanıcısını doğrula
    SELECT id INTO v_coach_id FROM users WHERE LOWER(email) = 'canoser@gmail.com';

    IF v_coach_id IS NULL THEN
        RETURN;
    END IF;

    -- 2. Eski verileri temizle
    DELETE FROM homework_assignments;
    DELETE FROM exam_results;
    DELETE FROM exam_scores;
    DELETE FROM coach_notes;
    DELETE FROM teacher_notes;
    DELETE FROM student_checkins;
    DELETE FROM student_notes;
    DELETE FROM student_questions;
    DELETE FROM study_sessions;
    DELETE FROM approval_items;
    DELETE FROM payment_items;
    DELETE FROM payments;
    DELETE FROM payment_plans;

    DELETE FROM course_resource_progress;
    DELETE FROM course_resources;
    DELETE FROM course_students;
    DELETE FROM course_groups;
    DELETE FROM courses;
    DELETE FROM student_group_members;
    DELETE FROM student_groups;
    DELETE FROM schedule_slots;
    DELETE FROM school_schedules;
    DELETE FROM student_subjects;

    DELETE FROM student_parents;
    DELETE FROM parents;
    DELETE FROM students;

    DELETE FROM program_teachers;
    DELETE FROM teachers;

    DELETE FROM invite_tokens;
    DELETE FROM notifications;
    DELETE FROM personal_events;
    DELETE FROM coaching_sessions;
    DELETE FROM coach_question_collection_items;
    DELETE FROM coach_question_collections;
    DELETE FROM upload_deliveries;
    DELETE FROM uploads;

    DELETE FROM program_coaches;
    DELETE FROM coaching_programs;

    DELETE FROM refresh_tokens WHERE user_id != v_coach_id;
    DELETE FROM password_reset_tokens WHERE user_id != v_coach_id;
    DELETE FROM user_devices WHERE user_id != v_coach_id;

    DELETE FROM coaches WHERE id != v_coach_id;
    DELETE FROM users WHERE id != v_coach_id;

    -- 3. canoser@gmail.com için tek çatı çalışma alanı oluştur
    INSERT INTO coaching_programs (id, name, description, color, is_active, created_by, created_at, updated_at)
    VALUES (v_prog_id, 'Koçluk Programım', 'Varsayılan Çalışma Alanı', '#0284c7', 1, v_coach_id, NOW(), NOW());

    INSERT INTO program_coaches (id, program_id, coach_id, role, added_by, created_at)
    VALUES (gen_random_uuid(), v_prog_id, v_coach_id, 'YONETICI', v_coach_id, NOW());

    INSERT INTO coaches (id, plan_type, approval_status, max_programs, max_students, max_teachers)
    VALUES (v_coach_id, 'pro', 'APPROVED', 1, 50, 10)
    ON CONFLICT (id) DO UPDATE 
    SET plan_type = 'pro',
        approval_status = 'APPROVED',
        max_programs = 1,
        max_students = 50,
        max_teachers = 10;

    -- 4. 2 Öğretmen Hesabı Aç
    -- Öğretmen 1: Ahmet Yılmaz (Matematik)
    INSERT INTO users (id, email, password_hash, role, full_name, is_admin, approval_status, is_active, created_at, updated_at)
    VALUES (v_t1_id, 'ogretmen.ahmet@mentorum.com', v_hash, 'Teacher', 'Ahmet Yılmaz', false, 'APPROVED', 1, NOW(), NOW());

    INSERT INTO teachers (id, program_id, branch, is_active, created_at)
    VALUES (v_t1_id, v_prog_id, 'Matematik', 1, NOW());

    INSERT INTO program_teachers (id, program_id, teacher_id, is_active, added_by, created_at)
    VALUES (gen_random_uuid(), v_prog_id, v_t1_id, 1, v_coach_id, NOW());

    -- Öğretmen 2: Ayşe Demir (Fizik)
    INSERT INTO users (id, email, password_hash, role, full_name, is_admin, approval_status, is_active, created_at, updated_at)
    VALUES (v_t2_id, 'ogretmen.ayse@mentorum.com', v_hash, 'Teacher', 'Ayşe Demir', false, 'APPROVED', 1, NOW(), NOW());

    INSERT INTO teachers (id, program_id, branch, is_active, created_at)
    VALUES (v_t2_id, v_prog_id, 'Fizik', 1, NOW());

    INSERT INTO program_teachers (id, program_id, teacher_id, is_active, added_by, created_at)
    VALUES (gen_random_uuid(), v_prog_id, v_t2_id, 1, v_coach_id, NOW());

    -- 5. 5 Ders Oluştur
    INSERT INTO courses (id, program_id, teacher_id, name, type, color, is_active, created_at, updated_at)
    VALUES (v_c1_id, v_prog_id, v_t1_id, 'TYT Matematik', 'DERS', '#3b82f6', 1, NOW(), NOW());

    INSERT INTO courses (id, program_id, teacher_id, name, type, color, is_active, created_at, updated_at)
    VALUES (v_c2_id, v_prog_id, v_t1_id, 'AYT Matematik', 'DERS', '#6366f1', 1, NOW(), NOW());

    INSERT INTO courses (id, program_id, teacher_id, name, type, color, is_active, created_at, updated_at)
    VALUES (v_c3_id, v_prog_id, v_t1_id, 'Geometri', 'DERS', '#8b5cf6', 1, NOW(), NOW());

    INSERT INTO courses (id, program_id, teacher_id, name, type, color, is_active, created_at, updated_at)
    VALUES (v_c4_id, v_prog_id, v_t2_id, 'TYT Fizik', 'DERS', '#10b981', 1, NOW(), NOW());

    INSERT INTO courses (id, program_id, teacher_id, name, type, color, is_active, created_at, updated_at)
    VALUES (v_c5_id, v_prog_id, v_t2_id, 'AYT Fizik', 'DERS', '#06b6d4', 1, NOW(), NOW());

    -- 6. 2 Öğrenci Grubu Oluştur
    INSERT INTO student_groups (id, program_id, name, color, created_at)
    VALUES (v_g1_id, v_prog_id, '12-A Sayısal Grubu', '#3b82f6', NOW());

    INSERT INTO course_groups (id, course_id, group_id, program_id, created_at)
    VALUES (gen_random_uuid(), v_c1_id, v_g1_id, v_prog_id, NOW()),
           (gen_random_uuid(), v_c4_id, v_g1_id, v_prog_id, NOW());

    INSERT INTO student_groups (id, program_id, name, color, created_at)
    VALUES (v_g2_id, v_prog_id, '11-A Eşit Ağırlık Grubu', '#f59e0b', NOW());

    INSERT INTO course_groups (id, course_id, group_id, program_id, created_at)
    VALUES (gen_random_uuid(), v_c1_id, v_g2_id, v_prog_id, NOW());

    -- 7. 10 Öğrenci Hesabı Aç
    INSERT INTO users (id, email, password_hash, role, full_name, is_admin, approval_status, is_active, created_at, updated_at)
    VALUES (v_s1_id, 'ali.kaya@mentorum.com', v_hash, 'Student', 'Ali Kaya', false, 'APPROVED', 1, NOW(), NOW());
    INSERT INTO students (id, program_id, grade, track, is_active, invite_status, updated_at)
    VALUES (v_s1_id, v_prog_id, 12, 'SAY', 1, 'ACTIVE', NOW());
    INSERT INTO student_group_members (id, group_id, student_id, program_id, is_active)
    VALUES (gen_random_uuid(), v_g1_id, v_s1_id, v_prog_id, 1);
    INSERT INTO course_students (id, course_id, student_id, program_id, is_active)
    VALUES (gen_random_uuid(), v_c1_id, v_s1_id, v_prog_id, 1),
           (gen_random_uuid(), v_c4_id, v_s1_id, v_prog_id, 1);
    INSERT INTO courses (id, program_id, name, type, is_active, created_at, updated_at)
    VALUES (v_od1_id, v_prog_id, 'Ali Kaya — Bireysel Koçluk', 'OZEL_DERS', 1, NOW(), NOW());
    INSERT INTO course_students (id, course_id, student_id, program_id, is_active)
    VALUES (gen_random_uuid(), v_od1_id, v_s1_id, v_prog_id, 1);

    INSERT INTO users (id, email, password_hash, role, full_name, is_admin, approval_status, is_active, created_at, updated_at)
    VALUES (v_s2_id, 'zeynep.sahin@mentorum.com', v_hash, 'Student', 'Zeynep Şahin', false, 'APPROVED', 1, NOW(), NOW());
    INSERT INTO students (id, program_id, grade, track, is_active, invite_status, updated_at)
    VALUES (v_s2_id, v_prog_id, 12, 'SAY', 1, 'ACTIVE', NOW());
    INSERT INTO student_group_members (id, group_id, student_id, program_id, is_active)
    VALUES (gen_random_uuid(), v_g1_id, v_s2_id, v_prog_id, 1);
    INSERT INTO course_students (id, course_id, student_id, program_id, is_active)
    VALUES (gen_random_uuid(), v_c1_id, v_s2_id, v_prog_id, 1),
           (gen_random_uuid(), v_c4_id, v_s2_id, v_prog_id, 1);

    INSERT INTO users (id, email, password_hash, role, full_name, is_admin, approval_status, is_active, created_at, updated_at)
    VALUES (v_s3_id, 'mehmet.celik@mentorum.com', v_hash, 'Student', 'Mehmet Çelik', false, 'APPROVED', 1, NOW(), NOW());
    INSERT INTO students (id, program_id, grade, track, is_active, invite_status, updated_at)
    VALUES (v_s3_id, v_prog_id, 12, 'SAY', 1, 'ACTIVE', NOW());
    INSERT INTO student_group_members (id, group_id, student_id, program_id, is_active)
    VALUES (gen_random_uuid(), v_g1_id, v_s3_id, v_prog_id, 1);
    INSERT INTO course_students (id, course_id, student_id, program_id, is_active)
    VALUES (gen_random_uuid(), v_c1_id, v_s3_id, v_prog_id, 1),
           (gen_random_uuid(), v_c4_id, v_s3_id, v_prog_id, 1);

    INSERT INTO users (id, email, password_hash, role, full_name, is_admin, approval_status, is_active, created_at, updated_at)
    VALUES (v_s4_id, 'elif.yildiz@mentorum.com', v_hash, 'Student', 'Elif Yıldız', false, 'APPROVED', 1, NOW(), NOW());
    INSERT INTO students (id, program_id, grade, track, is_active, invite_status, updated_at)
    VALUES (v_s4_id, v_prog_id, 11, 'EA', 1, 'ACTIVE', NOW());
    INSERT INTO student_group_members (id, group_id, student_id, program_id, is_active)
    VALUES (gen_random_uuid(), v_g2_id, v_s4_id, v_prog_id, 1);
    INSERT INTO course_students (id, course_id, student_id, program_id, is_active)
    VALUES (gen_random_uuid(), v_c1_id, v_s4_id, v_prog_id, 1);

    INSERT INTO users (id, email, password_hash, role, full_name, is_admin, approval_status, is_active, created_at, updated_at)
    VALUES (v_s5_id, 'burak.aydin@mentorum.com', v_hash, 'Student', 'Burak Aydın', false, 'APPROVED', 1, NOW(), NOW());
    INSERT INTO students (id, program_id, grade, track, is_active, invite_status, updated_at)
    VALUES (v_s5_id, v_prog_id, 11, 'EA', 1, 'ACTIVE', NOW());
    INSERT INTO student_group_members (id, group_id, student_id, program_id, is_active)
    VALUES (gen_random_uuid(), v_g2_id, v_s5_id, v_prog_id, 1);
    INSERT INTO course_students (id, course_id, student_id, program_id, is_active)
    VALUES (gen_random_uuid(), v_c1_id, v_s5_id, v_prog_id, 1);

    INSERT INTO users (id, email, password_hash, role, full_name, is_admin, approval_status, is_active, created_at, updated_at)
    VALUES (v_s6_id, 'ceren.koc@mentorum.com', v_hash, 'Student', 'Ceren Koç', false, 'APPROVED', 1, NOW(), NOW());
    INSERT INTO students (id, program_id, grade, track, is_active, invite_status, updated_at)
    VALUES (v_s6_id, v_prog_id, 11, 'EA', 1, 'ACTIVE', NOW());
    INSERT INTO student_group_members (id, group_id, student_id, program_id, is_active)
    VALUES (gen_random_uuid(), v_g2_id, v_s6_id, v_prog_id, 1);
    INSERT INTO course_students (id, course_id, student_id, program_id, is_active)
    VALUES (gen_random_uuid(), v_c1_id, v_s6_id, v_prog_id, 1);

    INSERT INTO users (id, email, password_hash, role, full_name, is_admin, approval_status, is_active, created_at, updated_at)
    VALUES (v_s7_id, 'emre.arslan@mentorum.com', v_hash, 'Student', 'Emre Arslan', false, 'APPROVED', 1, NOW(), NOW());
    INSERT INTO students (id, program_id, grade, track, is_active, invite_status, updated_at)
    VALUES (v_s7_id, v_prog_id, 12, 'SAY', 1, 'ACTIVE', NOW());
    INSERT INTO courses (id, program_id, name, type, is_active, created_at, updated_at)
    VALUES (v_od7_id, v_prog_id, 'Emre Arslan — Bireysel Koçluk', 'OZEL_DERS', 1, NOW(), NOW());
    INSERT INTO course_students (id, course_id, student_id, program_id, is_active)
    VALUES (gen_random_uuid(), v_od7_id, v_s7_id, v_prog_id, 1),
           (gen_random_uuid(), v_c3_id, v_s7_id, v_prog_id, 1);

    INSERT INTO users (id, email, password_hash, role, full_name, is_admin, approval_status, is_active, created_at, updated_at)
    VALUES (v_s8_id, 'derya.ozturk@mentorum.com', v_hash, 'Student', 'Derya Öztürk', false, 'APPROVED', 1, NOW(), NOW());
    INSERT INTO students (id, program_id, grade, track, is_active, invite_status, updated_at)
    VALUES (v_s8_id, v_prog_id, 12, 'SAY', 1, 'ACTIVE', NOW());
    INSERT INTO courses (id, program_id, name, type, is_active, created_at, updated_at)
    VALUES (v_od8_id, v_prog_id, 'Derya Öztürk — Bireysel Koçluk', 'OZEL_DERS', 1, NOW(), NOW());
    INSERT INTO course_students (id, course_id, student_id, program_id, is_active)
    VALUES (gen_random_uuid(), v_od8_id, v_s8_id, v_prog_id, 1),
           (gen_random_uuid(), v_c5_id, v_s8_id, v_prog_id, 1);

    INSERT INTO users (id, email, password_hash, role, full_name, is_admin, approval_status, is_active, created_at, updated_at)
    VALUES (v_s9_id, 'kaan.kurt@mentorum.com', v_hash, 'Student', 'Kaan Kurt', false, 'APPROVED', 1, NOW(), NOW());
    INSERT INTO students (id, program_id, grade, track, is_active, invite_status, updated_at)
    VALUES (v_s9_id, v_prog_id, 8, 'ORTAOKUL', 1, 'ACTIVE', NOW());
    INSERT INTO courses (id, program_id, name, type, is_active, created_at, updated_at)
    VALUES (v_od9_id, v_prog_id, 'Kaan Kurt — Bireysel Koçluk', 'OZEL_DERS', 1, NOW(), NOW());
    INSERT INTO course_students (id, course_id, student_id, program_id, is_active)
    VALUES (gen_random_uuid(), v_od9_id, v_s9_id, v_prog_id, 1);

    INSERT INTO users (id, email, password_hash, role, full_name, is_admin, approval_status, is_active, created_at, updated_at)
    VALUES (v_s10_id, 'selin.polat@mentorum.com', v_hash, 'Student', 'Selin Polat', false, 'APPROVED', 1, NOW(), NOW());
    INSERT INTO students (id, program_id, grade, track, is_active, invite_status, updated_at)
    VALUES (v_s10_id, v_prog_id, 10, null, 1, 'ACTIVE', NOW());
    INSERT INTO courses (id, program_id, name, type, is_active, created_at, updated_at)
    VALUES (v_od10_id, v_prog_id, 'Selin Polat — Bireysel Koçluk', 'OZEL_DERS', 1, NOW(), NOW());
    INSERT INTO course_students (id, course_id, student_id, program_id, is_active)
    VALUES (gen_random_uuid(), v_od10_id, v_s10_id, v_prog_id, 1);

END $$;

