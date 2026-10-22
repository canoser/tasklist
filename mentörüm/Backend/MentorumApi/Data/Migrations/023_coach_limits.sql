-- 023_coach_limits.sql
-- V13.2: "Program = grup" modeli. Koç limitleri artık öğrenci + öğretmen + depolama (MB).
-- max_programs silinmez; koç başına TEK görünmez çalışma alanı = 1'e sabitlenir.

-- M1: yeni limit kolonları (admin onayında belirlenir)
ALTER TABLE coaches ADD COLUMN IF NOT EXISTS max_students INTEGER NULL;
ALTER TABLE coaches ADD COLUMN IF NOT EXISTS max_teachers INTEGER NULL;

-- M2: varsayılan program limitini 1'e sabitle (tek çalışma alanı)
INSERT INTO system_settings (key, value) VALUES ('default_max_programs', '1')
ON CONFLICT (key) DO UPDATE SET value = '1';

-- M3: varsayılan öğrenci/öğretmen limitleri (admin onayında ezilebilir)
INSERT INTO system_settings (key, value) VALUES ('default_max_students', '20')
ON CONFLICT (key) DO NOTHING;
INSERT INTO system_settings (key, value) VALUES ('default_max_teachers', '5')
ON CONFLICT (key) DO NOTHING;
