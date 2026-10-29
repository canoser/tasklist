using Dapper;
using Microsoft.AspNetCore.Authorization;
using System.Security.Claims;
using MentorumApi.Models;
using MentorumApi.Data;
using MentorumApi.DTOs;

namespace MentorumApi.Endpoints;

public static class ParentEndpoints
{
    public static void MapParentEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/v1/parents").RequireAuthorization(policy => policy.RequireRole("Parent"));

        group.MapGet("/my-children", async (DbConnectionFactory db, HttpContext ctx) =>
        {
            var parentId = ctx.User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(parentId)) return Results.Unauthorized();

            using var conn = db.CreateConnection();

            // Veliye bağlı çocukları al (izin bayraklarıyla birlikte - T47)
            var children = await conn.QueryAsync<dynamic>(@"
                SELECT 
                    s.id as ""studentId"", 
                    u.full_name as ""fullName"", 
                    s.grade as grade, 
                    s.track as area,
                    COALESCE(sp.can_view_exams, 0) as ""canViewExams"",
                    COALESCE(sp.can_view_homework, 0) as ""canViewHomework"",
                    COALESCE(sp.can_view_calendar, 0) as ""canViewCalendar"",
                    COALESCE(sp.can_view_study_stats, 0) as ""canViewStudyStats"",
                    COALESCE(sp.can_view_payments, 0) as ""canViewPayments""
                FROM student_parents sp
                JOIN students s ON sp.student_id = s.id
                JOIN users u ON s.id = u.id
                WHERE sp.parent_id = @ParentId AND sp.is_accepted = 1
            ", new { ParentId = Guid.Parse(parentId) });

            return Results.Ok(children);
        });

        group.MapGet("/children/{studentId:guid}/permissions", async (Guid studentId, DbConnectionFactory db, HttpContext ctx) =>
        {
            var parentId = ctx.User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(parentId) || !Guid.TryParse(parentId, out var pId)) return Results.Unauthorized();

            using var conn = db.CreateConnection();
            var perms = await conn.QuerySingleOrDefaultAsync<dynamic>(@"
                SELECT 
                    COALESCE(can_view_exams, 0) as ""canViewExams"",
                    COALESCE(can_view_homework, 0) as ""canViewHomework"",
                    COALESCE(can_view_calendar, 0) as ""canViewCalendar"",
                    COALESCE(can_view_study_stats, 0) as ""canViewStudyStats"",
                    COALESCE(can_view_payments, 0) as ""canViewPayments""
                FROM student_parents
                WHERE parent_id = @ParentId AND student_id = @StudentId AND is_accepted = 1",
                new { ParentId = pId, StudentId = studentId });

            if (perms == null) return Results.Forbid();
            return Results.Ok(perms);
        });

        group.MapGet("/children/{studentId}", async (Guid studentId, DbConnectionFactory db, HttpContext ctx) =>
        {
            var parentId = ctx.User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(parentId)) return Results.Unauthorized();

            using var conn = db.CreateConnection();

            // Yetki kontrolü (Bu çocuk gerçekten bu veliye mi ait?)
            var relation = await conn.ExecuteScalarAsync<int>(
                "SELECT 1 FROM student_parents WHERE parent_id = @ParentId AND student_id = @StudentId AND is_accepted = 1",
                new { ParentId = Guid.Parse(parentId), StudentId = studentId });

            if (relation == 0) return Results.Forbid();

            // Çocuğun profili
            var student = await conn.QuerySingleOrDefaultAsync<dynamic>(@"
                SELECT s.id as id, u.full_name as ""fullName"", s.grade as grade, s.track as area, s.target_university as ""targetUniversity""
                FROM students s
                JOIN users u ON s.id = u.id
                WHERE s.id = @StudentId
            ", new { StudentId = studentId });

            // Diğer velilerin bilgilerini ÇEKERKEN MASKELİYORUZ (KRİTİK GÜVENLİK - Özeleştiri 3)
            var otherParents = await conn.QueryAsync<dynamic>(@"
                SELECT 
                    u.full_name as ""fullName"",
                    'GİZLİ' as Email, /* Mahremiyet kuralı */
                    'GİZLİ' as Phone  /* Mahremiyet kuralı */
                FROM student_parents sp
                JOIN users u ON sp.parent_id = u.id
                WHERE sp.student_id = @StudentId AND sp.parent_id != @ParentId AND sp.is_accepted = 1
            ", new { StudentId = studentId, ParentId = Guid.Parse(parentId) });

            return Results.Ok(new {
                Student = student,
                OtherParents = otherParents // Email ve Phone alanları masked/gizli.
            });
        });

        // Veli — çocuğun sınav sonuçları (salt okunur + detaylı alt ders/konu skorları - B8)
        group.MapGet("/children/{studentId}/exams", async (Guid studentId, DbConnectionFactory db, HttpContext ctx) =>
        {
            var parentId = ctx.User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(parentId)) return Results.Unauthorized();

            using var conn = db.CreateConnection();
            var relation = await conn.ExecuteScalarAsync<int>(
                "SELECT 1 FROM student_parents WHERE parent_id = @ParentId AND student_id = @StudentId AND is_accepted = 1 AND COALESCE(can_view_exams, 0) = 1",
                new { ParentId = Guid.Parse(parentId), StudentId = studentId });
            if (relation == 0) return Results.Forbid();

            var rawExams = (await conn.QueryAsync<StudentExamDto>(@"
                SELECT e.id AS Id, e.exam_date AS ExamDate, COALESCE(e.exam_name, e.exam_type) AS ExamName, e.exam_type AS ExamType, e.total_net AS TotalNet
                FROM exam_results e
                WHERE e.student_id = @StudentId
                ORDER BY e.exam_date DESC, e.created_at DESC",
                new { StudentId = studentId })).ToList();

            if (rawExams.Count == 0) return Results.Ok(Array.Empty<object>());

            var examIds = rawExams.Select(e => e.Id).ToArray();
            var scores = (await conn.QueryAsync<ExamScoreRowDto>(@"
                SELECT exam_id AS ExamId, id AS Id, subject_id AS SubjectId, curriculum_topic_id AS CurriculumTopicId,
                       subject_name AS SubjectName, unit_name AS UnitName, topic_name AS TopicName,
                       question_count AS QuestionCount, correct AS Correct, wrong AS Wrong, blank AS Blank,
                       net AS Net, score AS Score, max_score AS MaxScore
                FROM exam_scores
                WHERE exam_id = ANY(@ExamIds)",
                new { ExamIds = examIds })).ToLookup(s => s.ExamId);

            var result = rawExams.Select(e => new
            {
                id = e.Id,
                examDate = e.ExamDate,
                name = e.ExamName,
                examType = e.ExamType,
                totalNet = e.TotalNet,
                scores = scores[e.Id].Select(s => new
                {
                    id = s.Id,
                    subjectId = s.SubjectId,
                    curriculumTopicId = s.CurriculumTopicId,
                    subjectName = s.SubjectName,
                    unitName = s.UnitName,
                    topicName = s.TopicName,
                    questionCount = s.QuestionCount,
                    correct = s.Correct,
                    wrong = s.Wrong,
                    blank = s.Blank,
                    net = s.Net,
                    score = s.Score,
                    maxScore = s.MaxScore
                }).ToList()
            });

            return Results.Ok(result);
        });

        // T19: Veli — çocuğun öğretmen notları (yalnızca STUDENT_VISIBLE ve summary)
        var parentGroup = app.MapGroup("/api/v1/parent").RequireAuthorization(policy => policy.RequireRole("Parent"));

        async Task<IResult> GetTeacherNotesHandler(Guid studentId, SchoolAccessRepository repo, DbConnectionFactory db, HttpContext ctx)
        {
            var parentId = ctx.User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(parentId) || !Guid.TryParse(parentId, out var pId)) return Results.Unauthorized();

            using var conn = db.CreateConnection();
            var relation = await conn.ExecuteScalarAsync<int>(
                "SELECT 1 FROM student_parents WHERE parent_id = @ParentId AND student_id = @StudentId AND is_accepted = 1",
                new { ParentId = pId, StudentId = studentId });
            if (relation == 0) return Results.Forbid();

            var notes = await repo.GetStudentVisibleTeacherNotesAsync(studentId);
            return Results.Ok(notes);
        }

        group.MapGet("/children/{studentId:guid}/teacher-notes", GetTeacherNotesHandler);
        parentGroup.MapGet("/children/{studentId:guid}/teacher-notes", GetTeacherNotesHandler);

        // T25: Veli — çalışma istatistiği özeti (haftalık toplam dakika + soru)
        async Task<IResult> GetStudyStatsHandler(Guid studentId, DbConnectionFactory db, HttpContext ctx)
        {
            var parentId = ctx.User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(parentId) || !Guid.TryParse(parentId, out var pId)) return Results.Unauthorized();

            using var conn = db.CreateConnection();
            var canView = await conn.ExecuteScalarAsync<int?>(@"
                SELECT 1 FROM student_parents 
                WHERE parent_id = @ParentId 
                  AND student_id = @StudentId 
                  AND is_accepted = 1 
                  AND can_view_study_stats = 1",
                new { ParentId = pId, StudentId = studentId });

            if (canView == null) return Results.Json(new { error = "Bu istatistikleri görüntüleme izniniz yok." }, statusCode: 403);

            var stats = await conn.QuerySingleOrDefaultAsync<dynamic>(@"
                SELECT 
                    COALESCE(SUM(minutes), 0)::int AS total_minutes,
                    COALESCE(SUM(question_count), 0)::int AS total_questions
                FROM study_sessions
                WHERE student_id = @StudentId
                  AND (started_at >= date_trunc('week', CURRENT_DATE) OR (started_at IS NULL AND created_at >= date_trunc('week', CURRENT_DATE)))",
                new { StudentId = studentId });

            return Results.Ok(new
            {
                TotalMinutes = (int)(stats?.total_minutes ?? 0),
                TotalQuestions = (int)(stats?.total_questions ?? 0)
            });
        }

        group.MapGet("/children/{studentId:guid}/study-stats", GetStudyStatsHandler);
        parentGroup.MapGet("/children/{studentId:guid}/study-stats", GetStudyStatsHandler);
    }
}
