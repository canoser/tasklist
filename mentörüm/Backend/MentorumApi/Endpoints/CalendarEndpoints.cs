using MentorumApi.Data;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace MentorumApi.Endpoints
{
    public static class CalendarEndpoints
    {
        public static void MapCalendarEndpoints(this IEndpointRouteBuilder app)
        {
            var coachGroup = app.MapGroup("/api/v1/calendar").RequireAuthorization("RequireCoachRole");
            var studentGroup = app.MapGroup("/api/v1/me/calendar").RequireAuthorization("RequireStudentRole");
            var parentGroup = app.MapGroup("/api/v1/me/children").RequireAuthorization("RequireParentRole");

            // 1. Coach Endpoint (Tüm öğrenciler veya tek öğrenci)
            coachGroup.MapGet("/", async (
                [FromQuery] DateTime from,
                [FromQuery] DateTime to,
                [FromQuery] Guid? studentId,
                [FromServices] CalendarRepository repo,
                ClaimsPrincipal user) =>
            {
                var userIdStr = user.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (!Guid.TryParse(userIdStr, out var userId)) return Results.Unauthorized();

                var events = await repo.GetCalendarEventsAsync(userId, "Coach", from, to, studentId);
                return Results.Ok(events);
            });

            // 2. Student Endpoint (Sadece kendi verisi)
            studentGroup.MapGet("/", async (
                [FromQuery] DateTime from,
                [FromQuery] DateTime to,
                [FromServices] CalendarRepository repo,
                ClaimsPrincipal user) =>
            {
                var userIdStr = user.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (!Guid.TryParse(userIdStr, out var userId)) return Results.Unauthorized();

                var events = await repo.GetCalendarEventsAsync(userId, "Student", from, to, null);
                return Results.Ok(events);
            });

            // 3. Parent Endpoint (Sadece seçili çocuğun verisi, yetki kontrolü repoda yapılıyor)
            parentGroup.MapGet("/{id:guid}/calendar", async (
                Guid id,
                [FromQuery] DateTime from,
                [FromQuery] DateTime to,
                [FromServices] CalendarRepository repo,
                ClaimsPrincipal user) =>
            {
                var userIdStr = user.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (!Guid.TryParse(userIdStr, out var userId)) return Results.Unauthorized();

                var events = await repo.GetCalendarEventsAsync(userId, "Parent", from, to, id);
                return Results.Ok(events);
            });
        }
    }
}
