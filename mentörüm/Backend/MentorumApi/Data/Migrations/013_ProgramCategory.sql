-- 013_ProgramCategory.sql
-- Program kategorisi / hedef etiketi (YKS, LGS, Ara Sınıf, Okul Dersi).
ALTER TABLE coaching_programs
    ADD COLUMN IF NOT EXISTS category TEXT NULL;
