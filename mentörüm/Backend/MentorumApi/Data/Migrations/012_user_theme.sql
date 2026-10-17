-- 012_user_theme.sql
-- Kullanıcı başına tema tercihi (açık/koyu mod + tema stili).
ALTER TABLE users ADD COLUMN IF NOT EXISTS theme_mode VARCHAR(8) NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS theme_style VARCHAR(16) NULL;
