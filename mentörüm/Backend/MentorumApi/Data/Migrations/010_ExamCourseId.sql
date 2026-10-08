-- 010_ExamCourseId.sql
-- V6: Öğretmen kendi dersine sınav sonucu/not girebilsin diye exam_results.course_id eklenir.
-- course_id NULL olabilir: koçun girdiği global deneme netleri (TYT/AYT/LGS) NULL kalır,
-- öğretmenin girdiği ders notu course_id taşır (bkz. AJAN_KONUSMALARI_HATALAR_TESPITLER.md).

ALTER TABLE exam_results ADD COLUMN IF NOT EXISTS course_id UUID REFERENCES courses(id) ON DELETE SET NULL;
