-- 020_storage_columns.sql
-- Depolama modu, kota (% bazlı uyarı) ve dosya/cihaz ilişki kolonları.

ALTER TABLE coaches ADD COLUMN IF NOT EXISTS storage_quota_mb INT NOT NULL DEFAULT 50;
ALTER TABLE coaches ADD COLUMN IF NOT EXISTS storage_warn_percent INT NOT NULL DEFAULT 80;
ALTER TABLE coaches ADD COLUMN IF NOT EXISTS storage_mode VARCHAR(16) NOT NULL DEFAULT 'LOCAL'; -- 'LOCAL' (tampon) | 'ONLINE' (bulut kalıcı)
ALTER TABLE users ADD COLUMN IF NOT EXISTS download_device_id UUID NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS hide_device_picker_tip INT NOT NULL DEFAULT 0;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS teacher_can_share_files INT NOT NULL DEFAULT 1;
ALTER TABLE student_questions ADD COLUMN IF NOT EXISTS upload_id UUID NULL;
ALTER TABLE course_resources ADD COLUMN IF NOT EXISTS upload_id UUID NULL;
