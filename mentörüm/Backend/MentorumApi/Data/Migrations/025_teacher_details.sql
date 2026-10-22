-- 025_teacher_details.sql
-- V12.5 / V13.3: Öğretmenler için branş, telefon ve detay alanları desteği

ALTER TABLE teachers ADD COLUMN IF NOT EXISTS branch TEXT;
ALTER TABLE teachers ADD COLUMN IF NOT EXISTS phone TEXT;

-- Mevcut test öğretmenlerinin branşlarını güncelle
UPDATE teachers 
SET branch = 'Matematik' 
WHERE id IN (SELECT id FROM users WHERE LOWER(email) = 'ogretmen.ahmet@mentorum.com');

UPDATE teachers 
SET branch = 'Fizik' 
WHERE id IN (SELECT id FROM users WHERE LOWER(email) = 'ogretmen.ayse@mentorum.com');
