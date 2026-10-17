using Dapper;
using Microsoft.AspNetCore.Authorization;
using System.Security.Claims;
using MentorumApi.Models;
using MentorumApi.Data;

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

            // Veliye bağlı çocukları al
            var children = await conn.QueryAsync<dynamic>(@"
                SELECT s.id as ""studentId"", u.full_name as ""fullName"", s.grade as grade, s.track as area
                FROM student_parents sp
                JOIN students s ON sp.student_id = s.id
                JOIN users u ON s.id = u.id
                WHERE sp.parent_id = @ParentId AND sp.is_accepted = 1
            ", new { ParentId = Guid.Parse(parentId) });

            return Results.Ok(children);
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

        // Veli — çocuğun sınav sonuçları (salt okunur)
        group.MapGet("/children/{studentId}/exams", async (Guid studentId, DbConnectionFactory db, HttpContext ctx) =>
        {
            var parentId = ctx.User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(parentId)) return Results.Unauthorized();

            using var conn = db.CreateConnection();
            var relation = await conn.ExecuteScalarAsync<int>(
                "SELECT 1 FROM student_parents WHERE parent_id = @ParentId AND student_id = @StudentId AND is_accepted = 1",
                new { ParentId = Guid.Parse(parentId), StudentId = studentId });
            if (relation == 0) return Results.Forbid();

            var exams = await conn.QueryAsync<dynamic>(@"
                SELECT e.id as id, e.exam_date as ""examDate"", COALESCE(e.exam_name, e.exam_type) as name, e.exam_type as ""examType"", e.total_net as ""totalNet""
                FROM exam_results e
                WHERE e.student_id = @StudentId
                ORDER BY e.exam_date DESC",
                new { StudentId = studentId });

            return Results.Ok(exams);
        });
    }
}
