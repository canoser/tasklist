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
                var userId = user.GetUserId();
                if (userId == null) return Results.Unauthorized();

                var notifications = await repo.GetUserNotificationsAsync(userId.Value);
                return Results.Ok(notifications);
            });

            // Tekil bildirimi okundu olarak işaretle
            group.MapPatch("/{id:guid}/read", async (
                Guid id,
                [FromServices] NotificationRepository repo,
                ClaimsPrincipal user) =>
            {
                var userId = user.GetUserId();
                if (userId == null) return Results.Unauthorized();

                var success = await repo.MarkAsReadAsync(id, userId.Value);
                if (!success) return Results.NotFound(new { error = "Bildirim bulunamadı veya size ait değil." });

                return Results.Ok(new { success = true });
            });

            // Tüm bildirimleri okundu olarak işaretle
            group.MapPatch("/read-all", async (
                [FromServices] NotificationRepository repo,
                ClaimsPrincipal user) =>
            {
                var userId = user.GetUserId();
                if (userId == null) return Results.Unauthorized();

                await repo.MarkAllAsReadAsync(userId.Value);
                return Results.Ok(new { success = true });
            });
        }
    }
}
