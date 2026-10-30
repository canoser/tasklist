using MentorumApi.Data;
using MentorumApi.DTOs;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace MentorumApi.Endpoints
{
    public static class QuestionCollectionEndpoints
    {
        public static void MapQuestionCollectionEndpoints(this IEndpointRouteBuilder app)
        {
            var group = app.MapGroup("/api/v1/coach/question-collections").RequireAuthorization("RequireCoachRole");

            group.MapPost("/", async ([FromBody] CreateQuestionCollectionRequest req, [FromServices] QuestionCollectionRepository repo, ClaimsPrincipal user) =>
            {
                var coachId = user.GetUserId();
                if (coachId == null) return Results.Unauthorized();
                if (string.IsNullOrWhiteSpace(req.Title)) return Results.BadRequest(new { error = "Başlık gerekli." });

                var programId = await repo.GetDefaultCoachProgramIdAsync(coachId.Value);
                if (programId == null) return Results.BadRequest(new { error = "Program bulunamadı." });

                var id = await repo.CreateAsync(coachId.Value, programId.Value, req.Title);
                return Results.Ok(new { id });
            });

            group.MapGet("/", async ([FromServices] QuestionCollectionRepository repo, ClaimsPrincipal user) =>
            {
                var coachId = user.GetUserId();
                if (coachId == null) return Results.Unauthorized();
                return Results.Ok(await repo.ListAsync(coachId.Value));
            });

            group.MapPost("/{collectionId:guid}/items/{questionId:guid}", async (Guid collectionId, Guid questionId, [FromServices] QuestionCollectionRepository repo, ClaimsPrincipal user) =>
            {
                var coachId = user.GetUserId();
                if (coachId == null) return Results.Unauthorized();
                var ok = await repo.AddItemAsync(coachId.Value, collectionId, questionId);
                return ok ? Results.Ok(new { message = "Koleksiyona eklendi." }) : Results.NotFound(new { error = "Koleksiyon veya soru bulunamadı." });
            });

            group.MapDelete("/{collectionId:guid}/items/{itemId:guid}", async (Guid collectionId, Guid itemId, [FromServices] QuestionCollectionRepository repo, ClaimsPrincipal user) =>
            {
                var coachId = user.GetUserId();
                if (coachId == null) return Results.Unauthorized();
                var ok = await repo.RemoveItemAsync(coachId.Value, collectionId, itemId);
                return ok ? Results.Ok(new { message = "Koleksiyondan çıkarıldı." }) : Results.NotFound(new { error = "Öğe bulunamadı." });
            });

            group.MapGet("/{collectionId:guid}/items", async (Guid collectionId, [FromServices] QuestionCollectionRepository repo, ClaimsPrincipal user) =>
            {
                var coachId = user.GetUserId();
                if (coachId == null) return Results.Unauthorized();
                return Results.Ok(await repo.ListItemsAsync(coachId.Value, collectionId));
            });
        }
    }
}
