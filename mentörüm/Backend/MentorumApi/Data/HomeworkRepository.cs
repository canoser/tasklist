using Dapper;
using MentorumApi.DTOs;

namespace MentorumApi.Data
{
    public class HomeworkRepository : BaseRepository
    {
        public HomeworkRepository(DbConnectionFactory connectionFactory) : base(connectionFactory) { }

        public async Task<Guid> CreateTemplateAsync(Guid coachId, CreateHomeworkTemplateRequest req)
        {
            var id = Guid.NewGuid();
            var sql = @"
                INSERT INTO homework_templates (id, coach_id, subject_id, title, description, resource_ref, curriculum_topic_id, free_topic, created_at, updated_at)
                VALUES (@Id, @CoachId, @SubjectId, @Title, @Description, @ResourceRef, @CurriculumTopicId, @FreeTopic, @Now, @Now)";

            using var conn = _connectionFactory.CreateConnection();
            await conn.ExecuteAsync(sql, new {
                Id = id,
                CoachId = coachId,
                req.SubjectId,
                req.Title,
                req.Description,
                req.ResourceRef,
                req.CurriculumTopicId,
                req.FreeTopic,
                Now = DateTime.UtcNow
            });
            return id;
        }

        public async Task<Guid?> AssignHomeworkAsync(Guid coachId, AssignHomeworkRequest req)
        {
            using var conn = _connectionFactory.CreateConnection();
            conn.Open();
            using var tx = conn.BeginTransaction();

            try
            {
                // Hedef öğrenci listesi: bireysel veya grup üyeleri
                var targetStudentIds = new List<(Guid StudentId, Guid ProgramId)>();

                if (req.StudentId.HasValue)
                {
                    // IDOR koruması: öğrenci bu koça ait olmalı
                    var owned = await conn.QuerySingleOrDefaultAsync<Guid?>(
                        "SELECT program_id FROM students WHERE id = @StudentId AND program_id IN (SELECT program_id FROM program_coaches WHERE coach_id = @CoachId)",
                        new { req.StudentId, CoachId = coachId }, tx);

                    if (owned != null)
                        targetStudentIds.Add((req.StudentId.Value, owned.Value));
                }
                else if (req.GroupId.HasValue)
                {
                    // IDOR: Grup bu koçun programına ait olmalı
                    var groupProgramId = await conn.QuerySingleOrDefaultAsync<Guid?>(
                        "SELECT program_id FROM student_groups WHERE id = @GroupId AND program_id IN (SELECT program_id FROM program_coaches WHERE coach_id = @CoachId)",
                        new { req.GroupId, CoachId = coachId }, tx);

                    if (groupProgramId != null)
                    {
                        var members = await GroupRepository.GetActiveMemberIdsAsync(conn, req.GroupId.Value, tx);
                        foreach (var m in members)
                            targetStudentIds.Add((m, groupProgramId.Value));
                    }
                }

                if (targetStudentIds.Count == 0) return null;

                Guid firstAssignId = Guid.Empty;

                foreach (var target in targetStudentIds)
                {
                    var assignId = Guid.NewGuid();
                    if (firstAssignId == Guid.Empty) firstAssignId = assignId;

                    var assignedVia = req.GroupId.HasValue ? "GROUP" : "INDIVIDUAL";
                    var priority = string.IsNullOrWhiteSpace(req.Priority) ? "NORMAL" : req.Priority.Trim().ToUpperInvariant();

                    // Snapshot ile doğrudan atama (konu/ders/şablon silinse bile içerik ve istatistik korunur)
                    await conn.ExecuteAsync(@"
                        INSERT INTO homework_assignments (
                            id, subject_id, curriculum_topic_id, snapshot_title, snapshot_desc, snapshot_source,
                            student_id, program_id, course_id, created_by, due_date, status, assigned_via, priority, created_at, updated_at
                        )
                        VALUES (
                            @Id, @SubjectId, @CurriculumTopicId, @Title, @Description, @Source,
                            @StudentId, @ProgramId, @CourseId, @CreatedBy, @DueDate, 'PENDING', @AssignedVia, @Priority, @Now, @Now
                        )", new {
                        Id = assignId,
                        req.SubjectId,
                        req.CurriculumTopicId,
                        Title = req.Title,
                        Description = req.Description,
                        Source = req.FreeTopic,
                        target.StudentId,
                        CreatedBy = coachId,
                        ProgramId = target.ProgramId,
                        req.CourseId,
                        req.DueDate,
                        AssignedVia = assignedVia,
                        Priority = priority,
                        Now = DateTime.UtcNow
                    }, tx);

                    // Öğrenciye bildirim gönder
                    await conn.ExecuteAsync(@"
                        INSERT INTO notifications (id, user_id, type, title, body, payload, created_at)
                        VALUES (@NotifId, @StudentId, 'HOMEWORK_ASSIGNED', 'Yeni Ödev Atandı', @NotifBody, @Payload, @Now)",
                        new { NotifId = Guid.NewGuid(), target.StudentId, NotifBody = $"{req.Title} ödevi atandı.", Payload = assignId.ToString(), Now = DateTime.UtcNow }, tx);
                }

                tx.Commit();
                return firstAssignId;
            }
            catch
            {
                tx.Rollback();
                throw;
            }
        }

        public Task<IEnumerable<HomeworkItemDto>> GetStudentHomeworksAsync(Guid coachId, Guid studentId)
            => QueryStudentHomeworksCoreAsync(studentId, coachId, orderDesc: true);

        public Task<IEnumerable<HomeworkItemDto>> GetStudentHomeworksForPortalAsync(Guid studentId)
            => QueryStudentHomeworksCoreAsync(studentId, null, orderDesc: false);

        private async Task<IEnumerable<HomeworkItemDto>> QueryStudentHomeworksCoreAsync(Guid studentId, Guid? coachId, bool orderDesc)
        {
            var coachFilter = coachId.HasValue
                ? "AND h.program_id IN (SELECT program_id FROM program_coaches WHERE coach_id = @CoachId)"
                : "";
            var orderDir = orderDesc ? "DESC" : "ASC";

            var sql = $@"
                SELECT 
                    h.id as Id, 
                    h.snapshot_title as SnapshotTitle, 
                    h.snapshot_desc as SnapshotDesc, 
                    h.due_date as DueDate, 
                    h.completed_at as CompletedAt,
                    h.completion_percentage as CompletionPercentage,
                    h.student_note as StudentNote,
                    CASE 
                        WHEN h.status = 'PENDING' AND h.due_date < CURRENT_DATE THEN 'OVERDUE'
                        ELSE h.status 
                    END as Status,
                    s.name as SubjectName,
                    ct.topic_name as TopicName,
                    c.type as CourseType,
                    c.name as CourseName,
                    h.assigned_via as AssignedVia,
                    COALESCE(h.priority, 'NORMAL') as Priority,
                    COALESCE(h.version, 1) as Version
                FROM homework_assignments h
                LEFT JOIN subjects s ON s.id = h.subject_id
                LEFT JOIN curriculum_topics ct ON ct.id = h.curriculum_topic_id
                LEFT JOIN courses c ON c.id = h.course_id
                WHERE h.student_id = @StudentId
                  {coachFilter}
                ORDER BY h.due_date {orderDir}";

            using var conn = _connectionFactory.CreateConnection();
            var list = (await conn.QueryAsync<HomeworkItemDto>(sql, new { CoachId = coachId, StudentId = studentId })).ToList();
            if (list.Count > 0)
            {
                var hwIds = list.Select(x => x.Id).ToArray();
                var attachments = await conn.QueryAsync<HomeworkAttachmentDto>(@"
                    SELECT id AS Id, homework_id AS HomeworkId, original_name AS OriginalName,
                           content_type AS ContentType, size_bytes AS SizeBytes, object_key AS ObjectKey
                    FROM uploads
                    WHERE homework_id = ANY(@HwIds) AND status <> 'DELETED'
                    ORDER BY created_at ASC",
                    new { HwIds = hwIds });
                var attachLookup = attachments.ToLookup(a => a.HomeworkId);
                foreach (var item in list)
                {
                    if (attachLookup.Contains(item.Id))
                    {
                        item.Attachments = attachLookup[item.Id].ToList();
                    }
                }
            }
            return list;
        }

        public async Task<string> CompleteHomeworkAsync(Guid assignmentId, Guid userId, string? role, CompleteHomeworkRequest req)
        {
            var whereClause = role == "Coach"
                ? "AND program_id IN (SELECT program_id FROM program_coaches WHERE coach_id = @UserId)"
                : "AND student_id = @UserId";

            int percentage = req.CompletionPercentage >= 0 && req.CompletionPercentage <= 100 ? req.CompletionPercentage : 100;
            string status = percentage == 100 ? "DONE" : "PENDING";

            using var conn = _connectionFactory.CreateConnection();
            conn.Open();
            using var tx = conn.BeginTransaction();
            try
            {
                var currentVersion = await conn.QuerySingleOrDefaultAsync<int?>(
                    $"SELECT COALESCE(version, 1) FROM homework_assignments WHERE id = @Id {whereClause} FOR UPDATE",
                    new { Id = assignmentId, UserId = userId }, tx);

                if (currentVersion == null)
                    return "NOT_FOUND";

                if (req.ExpectedVersion.HasValue && currentVersion.Value != req.ExpectedVersion.Value)
                    return "CONCURRENCY_CONFLICT";

                await conn.ExecuteAsync(
                    $@"UPDATE homework_assignments
                       SET status = @Status,
                           completed_at = @Now,
                           completion_percentage = @Pct,
                           student_note = CASE WHEN @Note IS NULL THEN student_note ELSE @Note END,
                           version = COALESCE(version, 1) + 1,
                           updated_at = NOW()
                       WHERE id = @Id {whereClause}",
                    new
                    {
                        Now = percentage == 100 ? DateTime.UtcNow : (DateTime?)null,
                        Status = status,
                        Pct = percentage,
                        Id = assignmentId,
                        UserId = userId,
                        Note = req.Note
                    }, tx);

                if (req.AttachmentIds != null && req.AttachmentIds.Count > 0)
                {
                    await conn.ExecuteAsync(@"
                        UPDATE uploads
                        SET homework_id = @HomeworkId, updated_at = NOW()
                        WHERE id = ANY(@UploadIds) AND sender_user_id = @UserId AND status = 'UPLOADED'",
                        new { HomeworkId = assignmentId, UploadIds = req.AttachmentIds.ToArray(), UserId = userId }, tx);
                }

                tx.Commit();
                return "OK";
            }
            catch
            {
                tx.Rollback();
                throw;
            }
        }

        public async Task<Guid?> GetAssignmentProgramIdForStudentAsync(Guid assignmentId, Guid studentId)
        {
            using var conn = _connectionFactory.CreateConnection();
            return await conn.QuerySingleOrDefaultAsync<Guid?>(
                "SELECT program_id FROM homework_assignments WHERE id = @Id AND student_id = @StudentId",
                new { Id = assignmentId, StudentId = studentId });
        }

        public async Task<bool> HasPendingExtensionAsync(Guid assignmentId)
        {
            using var conn = _connectionFactory.CreateConnection();
            var exists = await conn.ExecuteScalarAsync<int?>(
                "SELECT 1 FROM approval_items WHERE entity_type = 'HOMEWORK_EXTENSION' AND entity_id = @Id AND status = 'PENDING' LIMIT 1",
                new { Id = assignmentId });
            return exists != null;
        }

        public async Task<bool> CanParentViewHomeworkAsync(Guid parentId, Guid studentId)
        {
            using var conn = _connectionFactory.CreateConnection();
            var relation = await conn.ExecuteScalarAsync<int?>(
                "SELECT 1 FROM student_parents WHERE parent_id = @ParentId AND student_id = @StudentId AND is_accepted = 1 AND COALESCE(can_view_homework, 0) = 1",
                new { ParentId = parentId, StudentId = studentId });
            return relation != null;
        }
    }
}
