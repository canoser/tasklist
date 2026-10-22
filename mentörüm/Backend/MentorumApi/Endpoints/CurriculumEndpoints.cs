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

        group.MapGet("/subjects/{subjectId:guid}/units", async (Guid subjectId, [FromServices] CurriculumRepository repo, [FromQuery] string? grade) =>
        {
            var units = await repo.GetUnitsBySubjectAsync(subjectId, grade);
            return Results.Ok(units);
        });

        group.MapGet("/subjects/{subjectId:guid}/topics", async (Guid subjectId, [FromServices] CurriculumRepository repo, [FromQuery] string? grade, [FromQuery] int? unit) =>
        {
            var topics = await repo.GetTopicsBySubjectAsync(subjectId, grade, unit);
            return Results.Ok(topics);
        });

        // Müfredatı dışa aktar: AI ile doldurulacak JSON şablonu üretir (mevcut konular örnek olarak eklenir).
        group.MapGet("/export", async ([FromServices] CurriculumRepository repo, [FromQuery] string? grade) =>
        {
            var payload = await repo.ExportAsync(grade);
            return Results.Ok(payload);
        }).RequireAuthorization();

        // Müfredatı içe aktar: doldurulmuş JSON'u alır, konuları upsert eder (silmez).
        group.MapPost("/import", async ([FromBody] CurriculumExportDto payload, [FromServices] CurriculumRepository repo, [FromQuery] string? grade) =>
        {
            if (payload == null || payload.Topics == null || payload.Topics.Count == 0)
                return Results.BadRequest(new { error = "İçe aktarılacak konu bulunamadı. JSON içinde 'topics' dizisi olmalı." });

            var result = await repo.ImportAsync(payload, grade);
            return Results.Ok(result);
        }).RequireAuthorization("RequireAdminRole");
    }
}
