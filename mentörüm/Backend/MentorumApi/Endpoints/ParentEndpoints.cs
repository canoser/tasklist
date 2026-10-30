using Microsoft.AspNetCore.Authorization;
using System.Security.Claims;
using MentorumApi.Data;
using MentorumApi.Services;

namespace MentorumApi.Endpoints;

public static class ParentEndpoints
{
    public static void MapParentEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/v1/parents").RequireAuthorization(policy => policy.RequireRole("Parent"));
        var parentGroup = app.MapGroup("/api/v1/parent").RequireAuthorization(policy => policy.RequireRole("Parent"));

        group.MapGet("/my-children", async (ParentVisibilityRepository repo, HttpContext ctx) =>
        {
            var parentId = ctx.User.GetUserId();
            if (parentId == null) return Results.Unauthorized();

            var children = await repo.GetMyChildrenAsync(parentId.Value);
            return Results.Ok(children);
        });

        group.MapGet("/children/{studentId:guid}/permissions", async (Guid studentId, ParentVisibilityRepository repo, HttpContext ctx) =>
        {
            var parentId = ctx.User.GetUserId();
            if (parentId == null) return Results.Unauthorized();

            var perms = await repo.GetPermissionsForParentAsync(parentId.Value, studentId);
            if (perms == null) return Results.Forbid();
            return Results.Ok(perms);
        });

        group.MapGet("/children/{studentId}", async (Guid studentId, ParentVisibilityRepository repo, HttpContext ctx) =>
        {
            var parentId = ctx.User.GetUserId();
            if (parentId == null) return Results.Unauthorized();

            var detail = await repo.GetChildDetailWithMaskedParentsAsync(parentId.Value, studentId);
            if (detail == null) return Results.Forbid();

            return Results.Ok(new
            {
                Student = detail.Value.Student,
                OtherParents = detail.Value.OtherParents
            });
        });

        // Veli — çocuğun sınav sonuçları (salt okunur + detaylı alt ders/konu skorları - B8)
        group.MapGet("/children/{studentId}/exams", async (Guid studentId, ParentVisibilityRepository parentRepo, StudentRepository studentRepo, HttpContext ctx) =>
        {
            var parentId = ctx.User.GetUserId();
            if (parentId == null) return Results.Unauthorized();

            if (!await parentRepo.CanViewExamsAsync(parentId.Value, studentId))
                return Results.Forbid();

            var exams = await studentRepo.GetStudentExamsAsync(studentId);
            var result = exams.Select(e => new
            {
                id = e.Id,
                examDate = e.ExamDate,
                name = e.ExamName ?? e.ExamType,
                examType = e.ExamType,
                totalNet = e.TotalNet,
                scores = e.Scores.Select(s => new
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
        async Task<IResult> GetTeacherNotesHandler(Guid studentId, SchoolAccessRepository repo, ProgramAccessGuard guard, HttpContext ctx)
        {
            var parentId = ctx.User.GetUserId();
            if (parentId == null) return Results.Unauthorized();

            if (!await guard.IsParentOfStudentAsync(parentId.Value, studentId))
                return Results.Forbid();

            var notes = await repo.GetStudentVisibleTeacherNotesAsync(studentId);
            return Results.Ok(notes);
        }

        group.MapGet("/children/{studentId:guid}/teacher-notes", GetTeacherNotesHandler);
        parentGroup.MapGet("/children/{studentId:guid}/teacher-notes", GetTeacherNotesHandler);

        // T25: Veli — çalışma istatistiği özeti (haftalık toplam dakika + soru)
        async Task<IResult> GetStudyStatsHandler(Guid studentId, ParentVisibilityRepository repo, HttpContext ctx)
        {
            var parentId = ctx.User.GetUserId();
            if (parentId == null) return Results.Unauthorized();

            var stats = await repo.GetWeeklyStudyStatsForParentAsync(parentId.Value, studentId);
            if (stats == null)
                return Results.Json(new { error = "Bu istatistikleri görüntüleme izniniz yok." }, statusCode: 403);

            return Results.Ok(new
            {
                TotalMinutes = stats.Value.TotalMinutes,
                TotalQuestions = stats.Value.TotalQuestions
            });
        }

        group.MapGet("/children/{studentId:guid}/study-stats", GetStudyStatsHandler);
        parentGroup.MapGet("/children/{studentId:guid}/study-stats", GetStudyStatsHandler);
    }
}
