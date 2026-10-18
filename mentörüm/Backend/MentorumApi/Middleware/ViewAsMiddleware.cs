using System.Security.Claims;
using Dapper;
using MentorumApi.Data;

namespace MentorumApi.Middleware
{
    public class ViewAsMiddleware
    {
        private readonly RequestDelegate _next;

        public ViewAsMiddleware(RequestDelegate next)
        {
            _next = next;
        }

        public async Task InvokeAsync(HttpContext context, DbConnectionFactory db)
        {
            var user = context.User;
            if (user?.Identity?.IsAuthenticated != true)
            {
                await _next(context);
                return;
            }

            var role = user.FindFirst(ClaimTypes.Role)?.Value;
            var coachIdStr = user.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            var isAdminClaim = user.FindFirst("is_admin")?.Value;
            var isAdmin = isAdminClaim == "true" || role == "Admin";

            var viewAsStudent = context.Request.Headers["X-View-As-Student-Id"].FirstOrDefault();
            var viewAsParent = context.Request.Headers["X-View-As-Parent-Id"].FirstOrDefault();
            var viewAsTeacher = context.Request.Headers["X-View-As-Teacher-Id"].FirstOrDefault();

            bool isViewAsRequested = !string.IsNullOrEmpty(viewAsStudent) ||
                                     !string.IsNullOrEmpty(viewAsParent) ||
                                     !string.IsNullOrEmpty(viewAsTeacher);

            if (!isViewAsRequested)
            {
                await _next(context);
                return;
            }

            // View-As yalnızca Süper Yönetici (Admin) için geçerlidir
            if (!isAdmin)
            {
                context.Response.StatusCode = StatusCodes.Status403Forbidden;
                context.Response.ContentType = "application/json";
                await context.Response.WriteAsync("{\"error\":\"Rol Gözüyle Gör (View-As) modu yalnızca süper yöneticiler tarafından kullanılabilir.\"}");
                return;
            }

            // KRİTİK KURAL: View-As sandbox'ında TÜM MUTASYONLAR (POST, PUT, PATCH, DELETE) 403 REDDEDİLİR!
            var method = context.Request.Method.ToUpperInvariant();
            if (method != "GET" && method != "HEAD" && method != "OPTIONS")
            {
                context.Response.StatusCode = StatusCodes.Status403Forbidden;
                context.Response.ContentType = "application/json";
                await context.Response.WriteAsync("{\"error\":\"Rol Gözüyle Gör (View-As) modu salt okunurdur. Değişiklik yapılamaz.\"}");
                return;
            }

            if (!Guid.TryParse(coachIdStr, out var coachId))
            {
                await _next(context);
                return;
            }

            using var conn = db.CreateConnection();
            string simulatedRole = "";
            Guid targetId = Guid.Empty;

            if (!string.IsNullOrEmpty(viewAsStudent) && Guid.TryParse(viewAsStudent, out var sId))
            {
                // Koçun bu öğrenciye yetkisi var mı?
                var allowed = await conn.ExecuteScalarAsync<int?>(@"
                    SELECT 1 FROM students s
                    JOIN program_coaches pc ON pc.program_id = s.program_id
                    WHERE s.id = @StudentId AND pc.coach_id = @CoachId",
                    new { StudentId = sId, CoachId = coachId });

                if (allowed == null && role != "Admin")
                {
                    context.Response.StatusCode = StatusCodes.Status403Forbidden;
                    context.Response.ContentType = "application/json";
                    await context.Response.WriteAsync("{\"error\":\"Bu öğrenciyi simüle etme yetkiniz yok.\"}");
                    return;
                }

                simulatedRole = "Student";
                targetId = sId;
            }
            else if (!string.IsNullOrEmpty(viewAsParent) && Guid.TryParse(viewAsParent, out var pId))
            {
                // Koçun bu veliye bağlı en az bir öğrencisi var mı?
                var allowed = await conn.ExecuteScalarAsync<int?>(@"
                    SELECT 1 FROM student_parents sp
                    JOIN students s ON s.id = sp.student_id
                    JOIN program_coaches pc ON pc.program_id = s.program_id
                    WHERE sp.parent_id = @ParentId AND pc.coach_id = @CoachId",
                    new { ParentId = pId, CoachId = coachId });

                if (allowed == null && role != "Admin")
                {
                    context.Response.StatusCode = StatusCodes.Status403Forbidden;
                    context.Response.ContentType = "application/json";
                    await context.Response.WriteAsync("{\"error\":\"Bu veliyi simüle etme yetkiniz yok.\"}");
                    return;
                }

                simulatedRole = "Parent";
                targetId = pId;
            }
            else if (!string.IsNullOrEmpty(viewAsTeacher) && Guid.TryParse(viewAsTeacher, out var tId))
            {
                // Koçun bu öğretmenle ortak programı var mı?
                var allowed = await conn.ExecuteScalarAsync<int?>(@"
                    SELECT 1 FROM program_teachers pt
                    JOIN program_coaches pc ON pc.program_id = pt.program_id
                    WHERE pt.teacher_id = @TeacherId AND pc.coach_id = @CoachId",
                    new { TeacherId = tId, CoachId = coachId });

                if (allowed == null && role != "Admin")
                {
                    context.Response.StatusCode = StatusCodes.Status403Forbidden;
                    context.Response.ContentType = "application/json";
                    await context.Response.WriteAsync("{\"error\":\"Bu öğretmeni simüle etme yetkiniz yok.\"}");
                    return;
                }

                simulatedRole = "Teacher";
                targetId = tId;
            }

            if (!string.IsNullOrEmpty(simulatedRole) && targetId != Guid.Empty)
            {
                // ClaimsPrincipal'i taklit edilen rolle değiştir
                var claims = new List<Claim>
                {
                    new Claim(ClaimTypes.NameIdentifier, targetId.ToString()),
                    new Claim(ClaimTypes.Role, simulatedRole),
                    new Claim("IsViewAs", "true"),
                    new Claim("RealCoachId", coachId.ToString())
                };

                var identity = new ClaimsIdentity(claims, "ViewAsSimulation");
                context.User = new ClaimsPrincipal(identity);
                context.Response.Headers["X-View-As-Active"] = "true";
                context.Response.Headers["X-View-As-Role"] = simulatedRole;
            }

            await _next(context);
        }
    }

    public static class ViewAsMiddlewareExtensions
    {
        public static IApplicationBuilder UseViewAs(this IApplicationBuilder builder)
        {
            return builder.UseMiddleware<ViewAsMiddleware>();
        }
    }
}
