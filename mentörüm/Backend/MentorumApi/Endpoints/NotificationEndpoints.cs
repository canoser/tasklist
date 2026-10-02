using MentorumApi.Data;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace MentorumApi.Endpoints
{
    public static class NotificationEndpoints
    {
        public static void MapNotificationEndpoints(this IEndpointRouteBuilder app)
        {
            // Tüm roller için geçerli olacak
            var group = app.MapGroup("/api/v1/notifications").RequireAuthorization();

            // Bildirimleri getir
            group.MapGet("/", async (
                [FromServices] NotificationRepository repo,
                ClaimsPrincipal user) =>
            {
                var userIdStr = user.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (!Guid.TryParse(userIdStr, out var userId)) return Results.Unauthorized();

                var notifications = await repo.GetUserNotificationsAsync(userId);
                return Results.Ok(notifications);
            });

            // Tekil bildirimi okundu olarak işaretle
            group.MapPatch("/{id:guid}/read", async (
                Guid id,
                [FromServices] NotificationRepository repo,
                ClaimsPrincipal user) =>
            {
                var userIdStr = user.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (!Guid.TryParse(userIdStr, out var userId)) return Results.Unauthorized();

                var success = await repo.MarkAsReadAsync(id, userId);
                if (!success) return Results.NotFound(new { error = "Bildirim bulunamadı veya size ait değil." });

                return Results.Ok(new { success = true });
            });

            // Tüm bildirimleri okundu olarak işaretle
            group.MapPatch("/read-all", async (
                [FromServices] NotificationRepository repo,
                ClaimsPrincipal user) =>
            {
                var userIdStr = user.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (!Guid.TryParse(userIdStr, out var userId)) return Results.Unauthorized();

                await repo.MarkAllAsReadAsync(userId);
                return Results.Ok(new { success = true });
            });
        }
    }
}
