using MentorumApi.Data;
using MentorumApi.DTOs;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace MentorumApi.Endpoints
{
    public static class DeviceEndpoints
    {
        public static void MapDeviceEndpoints(this IEndpointRouteBuilder app)
        {
            var group = app.MapGroup("/api/v1").RequireAuthorization();

            group.MapPost("/devices", async ([FromBody] UpsertDeviceRequest req, [FromServices] DeviceRepository repo, ClaimsPrincipal user) =>
            {
                var userId = user.GetUserId();
                if (userId == null) return Results.Unauthorized();
                if (string.IsNullOrWhiteSpace(req.DeviceUid))
                    return Results.BadRequest(new { error = "deviceUid gerekli." });

                var platform = req.Platform == "android" || req.Platform == "ios" ? req.Platform : "web";
                var id = await repo.UpsertAsync(userId.Value, req.DeviceUid, platform, string.IsNullOrWhiteSpace(req.Label) ? "Cihaz" : req.Label);

                // İlk cihazsa varsayılan indirme cihazı yap
                var current = await repo.GetDownloadDeviceIdAsync(userId.Value);
                if (current == null)
                    await repo.SetDownloadDeviceAsync(userId.Value, id);

                return Results.Ok(new { id });
            });

            group.MapGet("/devices", async ([FromServices] DeviceRepository repo, ClaimsPrincipal user) =>
            {
                var userId = user.GetUserId();
                if (userId == null) return Results.Unauthorized();
                return Results.Ok(await repo.ListAsync(userId.Value));
            });

            group.MapPut("/users/me/download-device", async ([FromBody] SetDownloadDeviceRequest req, [FromServices] DeviceRepository repo, ClaimsPrincipal user) =>
            {
                var userId = user.GetUserId();
                if (userId == null) return Results.Unauthorized();
                var ok = await repo.SetDownloadDeviceAsync(userId.Value, req.DeviceId);
                return ok ? Results.Ok(new { message = "İndirme cihazı güncellendi." }) : Results.NotFound(new { error = "Cihaz bulunamadı." });
            });

            group.MapPut("/users/me/hide-device-picker", async ([FromServices] DeviceRepository repo, ClaimsPrincipal user) =>
            {
                var userId = user.GetUserId();
                if (userId == null) return Results.Unauthorized();
                await repo.SetHideDevicePickerAsync(userId.Value);
                return Results.Ok(new { message = "Cihaz seçici ipucu gizlendi." });
            });
        }
    }
}
