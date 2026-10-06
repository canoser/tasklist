using MentorumApi.Data;
using MentorumApi.DTOs;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace MentorumApi.Endpoints
{
    public static class GroupEndpoints
    {
        public static void MapGroupEndpoints(this IEndpointRouteBuilder app)
        {
            var group = app.MapGroup("/api/v1/programs/{programId:guid}/groups").RequireAuthorization("RequireCoachRole");

            group.MapGet("/", async (Guid programId, [FromServices] GroupRepository repo, ClaimsPrincipal user) =>
            {
                var coachId = GetCoachId(user);
                if (coachId == null) return Results.Unauthorized();
                return Results.Ok(await repo.GetGroupsAsync(programId, coachId.Value));
            });

            group.MapPost("/", async (Guid programId, [FromBody] CreateGroupRequest req, [FromServices] GroupRepository repo, ClaimsPrincipal user) =>
            {
                var coachId = GetCoachId(user);
                if (coachId == null) return Results.Unauthorized();
                try
                {
                    var id = await repo.CreateGroupAsync(programId, coachId.Value, req);
                    return Results.Ok(new { id });
                }
                catch (UnauthorizedAccessException)
                {
                    return Results.NotFound(new { error = "Program bulunamadı veya yetkiniz yok." });
                }
            });

            group.MapGet("/{groupId:guid}", async (Guid programId, Guid groupId, [FromServices] GroupRepository repo, ClaimsPrincipal user) =>
            {
                var coachId = GetCoachId(user);
                if (coachId == null) return Results.Unauthorized();
                var g = await repo.GetGroupAsync(programId, groupId, coachId.Value);
                return g == null ? Results.NotFound(new { error = "Grup bulunamadı." }) : Results.Ok(g);
            });

            group.MapPut("/{groupId:guid}", async (Guid programId, Guid groupId, [FromBody] UpdateGroupRequest req, [FromServices] GroupRepository repo, ClaimsPrincipal user) =>
            {
                var coachId = GetCoachId(user);
                if (coachId == null) return Results.Unauthorized();
                var ok = await repo.UpdateGroupAsync(programId, groupId, coachId.Value, req);
                return ok ? Results.Ok(new { message = "Güncellendi." }) : Results.NotFound(new { error = "Grup bulunamadı." });
            });

            group.MapDelete("/{groupId:guid}", async (Guid programId, Guid groupId, [FromServices] GroupRepository repo, ClaimsPrincipal user) =>
            {
                var coachId = GetCoachId(user);
                if (coachId == null) return Results.Unauthorized();
                var ok = await repo.DeleteGroupAsync(programId, groupId, coachId.Value);
                return ok ? Results.Ok(new { message = "Grup silindi." }) : Results.NotFound(new { error = "Grup bulunamadı." });
            });

            group.MapPost("/{groupId:guid}/members", async (Guid programId, Guid groupId, [FromBody] AddGroupMemberRequest req, [FromServices] GroupRepository repo, ClaimsPrincipal user) =>
            {
                var coachId = GetCoachId(user);
                if (coachId == null) return Results.Unauthorized();
                var r = await repo.AddMemberAsync(programId, groupId, req.StudentId, coachId.Value);
                return r switch
                {
                    "OK" => Results.Ok(new { message = "Üye eklendi." }),
                    "FORBIDDEN" => Results.NotFound(new { error = "Program bulunamadı." }),
                    _ => Results.NotFound(new { error = "Öğrenci veya grup bulunamadı." })
                };
            });

            group.MapDelete("/{groupId:guid}/members/{studentId:guid}", async (Guid programId, Guid groupId, Guid studentId, [FromServices] GroupRepository repo, ClaimsPrincipal user) =>
            {
                var coachId = GetCoachId(user);
                if (coachId == null) return Results.Unauthorized();
                var r = await repo.RemoveMemberAsync(programId, groupId, studentId, coachId.Value);
                return r == "OK" ? Results.Ok(new { message = "Üye çıkarıldı." }) : Results.NotFound(new { error = "Üye bulunamadı." });
            });
        }

        private static Guid? GetCoachId(ClaimsPrincipal user)
        {
            var idStr = user.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            return Guid.TryParse(idStr, out var id) ? id : null;
        }
    }
}
