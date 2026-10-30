using Dapper;
using MentorumApi.DTOs;

namespace MentorumApi.Data
{
    public class UploadRepository : BaseRepository
    {
        public UploadRepository(DbConnectionFactory connectionFactory) : base(connectionFactory) { }

        public async Task<Guid> CreatePendingAsync(
            Guid programId, Guid senderUserId, Guid recipientUserId,
            Guid? courseId, Guid? homeworkId, Guid? studentQuestionId,
            string objectKey, string contentType, long sizeBytes, string originalName)
        {
            var id = Guid.NewGuid();
            using var conn = _connectionFactory.CreateConnection();
            conn.Open();
            using var tx = conn.BeginTransaction();
            try
            {
                await conn.ExecuteAsync(@"
                    INSERT INTO uploads (
                        id, program_id, sender_user_id, recipient_user_id,
                        course_id, homework_id, student_question_id,
                        object_key, content_type, size_bytes, original_name, status)
                    VALUES (
                        @Id, @ProgramId, @SenderUserId, @RecipientUserId,
                        @CourseId, @HomeworkId, @StudentQuestionId,
                        @ObjectKey, @ContentType, @SizeBytes, @OriginalName, 'PENDING')",
                    new
                    {
                        Id = id, ProgramId = programId, SenderUserId = senderUserId, RecipientUserId = recipientUserId,
                        CourseId = courseId, HomeworkId = homeworkId, StudentQuestionId = studentQuestionId,
                        ObjectKey = objectKey, ContentType = contentType, SizeBytes = sizeBytes, OriginalName = originalName
                    }, tx);

                await conn.ExecuteAsync(@"
                    INSERT INTO upload_deliveries (id, upload_id, recipient_user_id, direction, status)
                    VALUES (@Id1, @UploadId, @RecipientUserId, 'IN', 'PENDING'),
                           (@Id2, @UploadId, @SenderUserId, 'OUT', 'PENDING')",
                    new { Id1 = Guid.NewGuid(), Id2 = Guid.NewGuid(), UploadId = id, RecipientUserId = recipientUserId, SenderUserId = senderUserId }, tx);

                tx.Commit();
                return id;
            }
            catch
            {
                tx.Rollback();
                throw;
            }
        }

        public async Task<UploadDto?> GetByIdAsync(Guid uploadId)
        {
            using var conn = _connectionFactory.CreateConnection();
            return await conn.QuerySingleOrDefaultAsync<UploadDto>(@"
                SELECT id AS Id, program_id AS ProgramId, sender_user_id AS SenderUserId, recipient_user_id AS RecipientUserId,
                       course_id AS CourseId, homework_id AS HomeworkId, student_question_id AS StudentQuestionId,
                       object_key AS ObjectKey, content_type AS ContentType, size_bytes AS SizeBytes,
                       original_name AS OriginalName, status AS Status
                FROM uploads WHERE id = @Id",
                new { Id = uploadId });
        }

        public async Task<bool> ConfirmAsync(Guid uploadId, Guid senderUserId)
        {
            using var conn = _connectionFactory.CreateConnection();
            var rows = await conn.ExecuteAsync(@"
                UPDATE uploads SET status = 'UPLOADED', updated_at = NOW()
                WHERE id = @Id AND sender_user_id = @Sender AND status = 'PENDING'",
                new { Id = uploadId, Sender = senderUserId });
            return rows > 0;
        }

        public async Task<bool> MarkFailedAsync(Guid uploadId, Guid senderUserId)
        {
            using var conn = _connectionFactory.CreateConnection();
            var rows = await conn.ExecuteAsync(@"
                UPDATE uploads SET status = 'DELETED', updated_at = NOW()
                WHERE id = @Id AND sender_user_id = @Sender",
                new { Id = uploadId, Sender = senderUserId });
            return rows > 0;
        }

        public async Task<IEnumerable<UploadDto>> ListForUserAsync(Guid userId)
        {
            using var conn = _connectionFactory.CreateConnection();
            return await conn.QueryAsync<UploadDto>(@"
                SELECT id AS Id, program_id AS ProgramId, sender_user_id AS SenderUserId, recipient_user_id AS RecipientUserId,
                       course_id AS CourseId, homework_id AS HomeworkId, student_question_id AS StudentQuestionId,
                       object_key AS ObjectKey, content_type AS ContentType, size_bytes AS SizeBytes,
                       original_name AS OriginalName, status AS Status
                FROM uploads
                WHERE sender_user_id = @UserId OR recipient_user_id = @UserId
                ORDER BY created_at DESC",
                new { UserId = userId });
        }

        public async Task<long> GetUsedBytesAsync(Guid coachId)
        {
            using var conn = _connectionFactory.CreateConnection();
            return await conn.ExecuteScalarAsync<long>(@"
                SELECT COALESCE(SUM(size_bytes), 0) FROM uploads
                WHERE status IN ('PENDING','UPLOADED')
                  AND program_id IN (SELECT program_id FROM program_coaches WHERE coach_id = @CoachId)",
                new { CoachId = coachId });
        }

        public async Task<ProgramStorageSettings> GetProgramStorageAsync(Guid programId)
        {
            using var conn = _connectionFactory.CreateConnection();
            return await conn.QuerySingleOrDefaultAsync<ProgramStorageSettings>(@"
                SELECT c.storage_quota_mb AS QuotaMb, c.storage_warn_percent AS WarnPercent, c.storage_mode AS StorageMode
                FROM coaches c
                JOIN program_coaches pc ON pc.coach_id = c.id
                WHERE pc.program_id = @ProgramId AND pc.role = 'YONETICI'
                LIMIT 1",
                new { ProgramId = programId })
                ?? new ProgramStorageSettings { QuotaMb = 50, WarnPercent = 80, StorageMode = "LOCAL" };
        }

        public async Task UpdateCoachStorageSettingsAsync(Guid coachId, int? quotaMb, int? warnPercent, string? storageMode)
        {
            using var conn = _connectionFactory.CreateConnection();
            await conn.ExecuteAsync(@"
                UPDATE coaches SET
                    storage_quota_mb = COALESCE(@QuotaMb, storage_quota_mb),
                    storage_warn_percent = COALESCE(@WarnPercent, storage_warn_percent),
                    storage_mode = COALESCE(@StorageMode, storage_mode)
                WHERE id = @CoachId",
                new { CoachId = coachId, QuotaMb = quotaMb, WarnPercent = warnPercent, StorageMode = storageMode });
        }

        public async Task<IEnumerable<RecipientOptionDto>> GetRecipientsAsync(Guid courseId)
        {
            using var conn = _connectionFactory.CreateConnection();
            return await conn.QueryAsync<RecipientOptionDto>(@"
                SELECT UserId, FullName, Role FROM (
                    SELECT u.id AS UserId, u.full_name AS FullName, 'Teacher' AS Role, 0 AS Sort
                    FROM courses c
                    JOIN users u ON u.id = c.teacher_id
                    WHERE c.id = @CourseId AND c.teacher_id IS NOT NULL
                    UNION ALL
                    SELECT u.id AS UserId, u.full_name AS FullName, 'Coach' AS Role, 1 AS Sort
                    FROM coaching_programs p
                    JOIN program_coaches pc ON pc.program_id = p.id
                    JOIN users u ON u.id = pc.coach_id
                    WHERE p.id = (SELECT program_id FROM courses WHERE id = @CourseId)
                ) t ORDER BY Sort, FullName",
                new { CourseId = courseId });
        }

        public async Task<(string ObjectKey, bool DeleteFromCloud)> MarkDeliveredAsync(
            Guid uploadId, Guid recipientUserId, Guid? deviceId, string? localPath, string? fileHash)
        {
            using var conn = _connectionFactory.CreateConnection();
            conn.Open();
            using var tx = conn.BeginTransaction();
            try
            {
                var upload = await conn.QuerySingleOrDefaultAsync<UploadDto>(
                    "SELECT program_id AS ProgramId, object_key AS ObjectKey FROM uploads WHERE id = @Id",
                    new { Id = uploadId }, tx);
                if (upload == null) { tx.Rollback(); return (string.Empty, false); }

                var storageMode = await conn.ExecuteScalarAsync<string?>(
                    @"SELECT c.storage_mode FROM coaches c
                      JOIN program_coaches pc ON pc.coach_id = c.id
                      WHERE pc.program_id = @ProgramId AND pc.role = 'YONETICI'
                      LIMIT 1",
                    new { ProgramId = upload.ProgramId }, tx) ?? "LOCAL";

                await conn.ExecuteAsync(@"
                    UPDATE upload_deliveries
                    SET status = 'DOWNLOADED', delivered_at = NOW(),
                        device_id = @DeviceId, local_path = @LocalPath, file_hash = @FileHash
                    WHERE upload_id = @UploadId AND recipient_user_id = @Recipient",
                    new { UploadId = uploadId, Recipient = recipientUserId, DeviceId = deviceId, LocalPath = localPath, FileHash = fileHash }, tx);

                var deleteFromCloud = storageMode == "LOCAL";
                await conn.ExecuteAsync(
                    "UPDATE uploads SET status = @Status, updated_at = NOW() WHERE id = @Id",
                    new { Id = uploadId, Status = deleteFromCloud ? "DELETED" : "UPLOADED" }, tx);

                tx.Commit();
                return (upload.ObjectKey, deleteFromCloud);
            }
            catch
            {
                tx.Rollback();
                throw;
            }
        }

        public async Task<Guid?> GetCourseProgramIdAsync(Guid courseId)
        {
            using var conn = _connectionFactory.CreateConnection();
            return await conn.ExecuteScalarAsync<Guid?>("SELECT program_id FROM courses WHERE id = @Id", new { Id = courseId });
        }

        public async Task<Guid?> GetHomeworkProgramIdAsync(Guid homeworkId)
        {
            using var conn = _connectionFactory.CreateConnection();
            return await conn.ExecuteScalarAsync<Guid?>("SELECT program_id FROM homework_assignments WHERE id = @Id", new { Id = homeworkId });
        }

        public async Task<Guid?> GetQuestionProgramIdAsync(Guid questionId)
        {
            using var conn = _connectionFactory.CreateConnection();
            return await conn.ExecuteScalarAsync<Guid?>("SELECT program_id FROM student_questions WHERE id = @Id", new { Id = questionId });
        }

        public async Task<Guid?> GetProgramOwnerCoachIdAsync(Guid programId)
        {
            using var conn = _connectionFactory.CreateConnection();
            return await conn.ExecuteScalarAsync<Guid?>(
                "SELECT coach_id FROM program_coaches WHERE program_id = @ProgramId AND role = 'YONETICI' LIMIT 1",
                new { ProgramId = programId });
        }

        public async Task<ProgramStorageSettings> GetCoachStorageAsync(Guid coachId)
        {
            using var conn = _connectionFactory.CreateConnection();
            return await conn.QuerySingleOrDefaultAsync<ProgramStorageSettings>(
                "SELECT storage_quota_mb AS QuotaMb, storage_warn_percent AS WarnPercent, storage_mode AS StorageMode FROM coaches WHERE id = @CoachId",
                new { CoachId = coachId })
                ?? new ProgramStorageSettings { QuotaMb = 50, WarnPercent = 80, StorageMode = "LOCAL" };
        }

        public async Task<Guid?> GetDefaultRecipientIdAsync(Guid programId, Guid? courseId)
        {
            using var conn = _connectionFactory.CreateConnection();
            if (courseId.HasValue)
            {
                var teacherId = await conn.ExecuteScalarAsync<Guid?>(
                    "SELECT teacher_id FROM courses WHERE id = @CourseId AND teacher_id IS NOT NULL",
                    new { CourseId = courseId.Value });
                if (teacherId.HasValue) return teacherId.Value;
            }
            return await conn.ExecuteScalarAsync<Guid?>(
                "SELECT coach_id FROM program_coaches WHERE program_id = @ProgramId AND role = 'YONETICI' LIMIT 1",
                new { ProgramId = programId });
        }

        public async Task<IEnumerable<UploadDto>> ListByHomeworkAsync(Guid homeworkId)
        {
            using var conn = _connectionFactory.CreateConnection();
            return await conn.QueryAsync<UploadDto>(@"
                SELECT id AS Id, program_id AS ProgramId, sender_user_id AS SenderUserId, recipient_user_id AS RecipientUserId,
                       course_id AS CourseId, homework_id AS HomeworkId, student_question_id AS StudentQuestionId,
                       object_key AS ObjectKey, content_type AS ContentType, size_bytes AS SizeBytes,
                       original_name AS OriginalName, status AS Status
                FROM uploads
                WHERE homework_id = @HomeworkId AND status <> 'DELETED'
                ORDER BY created_at ASC",
                new { HomeworkId = homeworkId });
        }

        public async Task<bool> UpdateTeacherFileSharingAsync(Guid courseId, bool allowed)
        {
            using var conn = _connectionFactory.CreateConnection();
            var rows = await conn.ExecuteAsync(
                "UPDATE courses SET teacher_can_share_files = @Val WHERE id = @CourseId",
                new { Val = allowed ? 1 : 0, CourseId = courseId });
            return rows > 0;
        }
    }

    public class ProgramStorageSettings
    {
        public int QuotaMb { get; set; }
        public int WarnPercent { get; set; }
        public string StorageMode { get; set; } = "LOCAL";
    }
}
