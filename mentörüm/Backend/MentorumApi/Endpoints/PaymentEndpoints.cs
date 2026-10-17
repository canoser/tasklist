using MentorumApi.Data;
using MentorumApi.DTOs;
using MentorumApi.Services;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace MentorumApi.Endpoints
{
    public static class PaymentEndpoints
    {
        public static void MapPaymentEndpoints(this IEndpointRouteBuilder app)
        {
            // 1. Koç Grubu
            var coachGroup = app.MapGroup("/api/v1").RequireAuthorization("RequireCoachRole");

            // Plan Listeleme
            coachGroup.MapGet("/programs/{programId:guid}/payment-plans", async (
                Guid programId,
                [FromServices] PaymentRepository repo,
                ClaimsPrincipal user) =>
            {
                var coachId = GetUserId(user);
                if (coachId == null) return Results.Unauthorized();
                var plans = await repo.GetPlansAsync(programId, coachId.Value);
                return Results.Ok(plans);
            });

            // Plan Oluşturma
            coachGroup.MapPost("/programs/{programId:guid}/payment-plans", async (
                Guid programId,
                [FromBody] CreatePaymentPlanRequest req,
                [FromServices] PaymentRepository repo,
                ClaimsPrincipal user) =>
            {
                var coachId = GetUserId(user);
                if (coachId == null) return Results.Unauthorized();

                try
                {
                    var planId = await repo.CreatePlanAsync(programId, coachId.Value, req);
                    return Results.Ok(new { id = planId });
                }
                catch (UnauthorizedAccessException ex)
                {
                    return Results.Json(new { error = ex.Message }, statusCode: 403);
                }
            });

            // Plan Güncelleme
            coachGroup.MapPut("/programs/{programId:guid}/payment-plans/{planId:guid}", async (
                Guid programId,
                Guid planId,
                [FromBody] UpdatePaymentPlanRequest req,
                [FromServices] PaymentRepository repo,
                ClaimsPrincipal user) =>
            {
                var coachId = GetUserId(user);
                if (coachId == null) return Results.Unauthorized();

                var ok = await repo.UpdatePlanAsync(programId, planId, coachId.Value, req);
                return ok ? Results.Ok(new { message = "Plan güncellendi." }) : Results.NotFound(new { error = "Plan bulunamadı." });
            });

            // Plan Pasife Alma (Soft Delete)
            coachGroup.MapDelete("/programs/{programId:guid}/payment-plans/{planId:guid}", async (
                Guid programId,
                Guid planId,
                [FromServices] PaymentRepository repo,
                ClaimsPrincipal user) =>
            {
                var coachId = GetUserId(user);
                if (coachId == null) return Results.Unauthorized();

                var ok = await repo.DeletePlanAsync(programId, planId, coachId.Value);
                return ok ? Results.Ok(new { message = "Plan silindi." }) : Results.NotFound(new { error = "Plan bulunamadı." });
            });

            // Tahsilat Girişi (Kısmi veya Tam - Rollover Destekli)
            coachGroup.MapPost("/payment-items/{itemId:guid}/collect", async (
                Guid itemId,
                [FromBody] CollectPaymentRequest req,
                [FromServices] PaymentRepository repo,
                ClaimsPrincipal user) =>
            {
                var coachId = GetUserId(user);
                if (coachId == null) return Results.Unauthorized();

                try
                {
                    var ok = await repo.CollectPaymentAsync(itemId, coachId.Value, req);
                    return Results.Ok(new { message = "Tahsilat kaydedildi." });
                }
                catch (UnauthorizedAccessException ex)
                {
                    return Results.Json(new { error = ex.Message }, statusCode: 403);
                }
            });

            // 2. Veli Grubu
            var parentGroup = app.MapGroup("/api/v1/parent").RequireAuthorization("RequireParentRole");

            // Veli için çocuğun ödemelerini görüntüleme (can_view_payments=1 zorunlu)
            parentGroup.MapGet("/children/{studentId:guid}/payments", async (
                Guid studentId,
                [FromServices] PaymentRepository repo,
                ClaimsPrincipal user) =>
            {
                var parentId = GetUserId(user);
                if (parentId == null) return Results.Unauthorized();

                try
                {
                    var items = await repo.GetStudentPaymentsForParentAsync(studentId, parentId.Value);
                    return Results.Ok(items);
                }
                catch (UnauthorizedAccessException ex)
                {
                    return Results.Json(new { error = ex.Message }, statusCode: 403);
                }
            });

            // Veli "ödeme yaptım" bildirimi -> onay merkezine (T29)
            parentGroup.MapPost("/children/{studentId:guid}/payment-claims", async (
                Guid studentId,
                [FromBody] CreatePaymentClaimRequest req,
                [FromServices] PaymentRepository repo,
                ClaimsPrincipal user) =>
            {
                var parentId = GetUserId(user);
                if (parentId == null) return Results.Unauthorized();

                try
                {
                    var approvalId = await repo.CreatePaymentClaimAsync(studentId, parentId.Value, req);
                    return Results.Ok(new { approvalId, message = "Ödeme bildirimi koç onayına iletildi." });
                }
                catch (UnauthorizedAccessException ex)
                {
                    return Results.Json(new { error = ex.Message }, statusCode: 403);
                }
                catch (InvalidOperationException ex)
                {
                    return Results.BadRequest(new { error = ex.Message });
                }
            });
        }

        private static Guid? GetUserId(ClaimsPrincipal user)
        {
            var idStr = user.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            return Guid.TryParse(idStr, out var id) ? id : null;
        }
    }
}
