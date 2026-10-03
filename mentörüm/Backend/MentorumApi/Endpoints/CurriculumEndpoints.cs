using Dapper;
using MentorumApi.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MentorumApi.DTOs;

namespace MentorumApi.Endpoints;

public static class CurriculumEndpoints
{
    public static void MapCurriculumEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/v1/curriculum").RequireAuthorization();

        group.MapGet("/levels", async ([FromServices] CurriculumRepository repo) =>
        {
            var levels = await repo.GetLevelsAsync();
            return Results.Ok(levels);
        });

        group.MapGet("/subjects", async ([FromServices] CurriculumRepository repo, [FromQuery] string? level) =>
        {
            var subjects = string.IsNullOrEmpty(level)
                ? await repo.GetAllSubjectsAsync()
                : await repo.GetSubjectsByLevelAsync(level);
            return Results.Ok(subjects);
        });

        group.MapGet("/subjects/{subjectId:guid}/topics", async (Guid subjectId, [FromServices] CurriculumRepository repo, [FromQuery] string? grade) =>
        {
            var topics = await repo.GetTopicsBySubjectAsync(subjectId, grade);
            return Results.Ok(topics);
        });

        // Müfredatı yenile (seed'i tekrar çalıştır — idempotent). "Otomatik güncelle" butonu için.
        group.MapPost("/seed", async ([FromServices] DbConnectionFactory db) =>
        {
            using var conn = db.CreateConnection();
            var seedPath = Path.Combine(AppContext.BaseDirectory, "Data", "Migrations", "004_Curriculum2026.sql");
            if (!File.Exists(seedPath))
                return Results.NotFound(new { error = "Müfredat seed dosyası bulunamadı." });

            var sql = File.ReadAllText(seedPath);
            conn.Execute(sql);
            return Results.Ok(new { message = "Müfredat başarıyla güncellendi." });
        }).RequireAuthorization("RequireCoachRole");
    }
}
