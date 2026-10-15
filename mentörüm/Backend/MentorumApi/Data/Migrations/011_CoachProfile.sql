-- 011_CoachProfile.sql
-- Koç profili: biyografi + uzmanlık alanı (koçun kendisi hakkında yazabilmesi).
ALTER TABLE coaches
    ADD COLUMN IF NOT EXISTS bio TEXT NULL,
    ADD COLUMN IF NOT EXISTS specialty TEXT NULL;
