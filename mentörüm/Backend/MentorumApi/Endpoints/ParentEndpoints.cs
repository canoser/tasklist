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
                SELECT s.id as StudentId, u.full_name as FullName, s.grade as Grade, s.track as Area
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
                "SELECT 1 FROM student_parents WHERE parent_id = @ParentId AND student_id = @StudentId",
                new { ParentId = Guid.Parse(parentId), StudentId = studentId });

            if (relation == 0) return Results.Forbid();

            // Çocuğun profili
            var student = await conn.QuerySingleOrDefaultAsync<dynamic>(@"
                SELECT s.id, u.full_name, s.grade, s.track as area, s.target_university
                FROM students s
                JOIN users u ON s.id = u.id
                WHERE s.id = @StudentId
            ", new { StudentId = studentId });

            // Diğer velilerin bilgilerini ÇEKERKEN MASKELİYORUZ (KRİTİK GÜVENLİK - Özeleştiri 3)
            var otherParents = await conn.QueryAsync<dynamic>(@"
                SELECT 
                    u.full_name as FullName,
                    'GİZLİ' as Email, /* Mahremiyet kuralı */
                    'GİZLİ' as Phone  /* Mahremiyet kuralı */
                FROM student_parents sp
                JOIN users u ON sp.parent_id = u.id
                WHERE sp.student_id = @StudentId AND sp.parent_id != @ParentId
            ", new { StudentId = studentId, ParentId = Guid.Parse(parentId) });

            return Results.Ok(new {
                Student = student,
                OtherParents = otherParents // Email ve Phone alanları masked/gizli.
            });
        });
    }
}
