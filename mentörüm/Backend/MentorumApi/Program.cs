global using MentorumApi.Extensions;
using Serilog;
using DotNetEnv;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using Dapper;
using MentorumApi.Data;
using MentorumApi.Services;
using MentorumApi.Services.Background;
using MentorumApi.Middleware;
using MentorumApi.Endpoints;
using Npgsql;

// 1. .env dosyasını yükle
// Dapper: snake_case kolonları (örn. password_hash) PascalCase özelliklere (PasswordHash) eşle. Login/refresh/google SELECT * için zorunlu.
Dapper.DefaultTypeMap.MatchNamesWithUnderscores = true;

// .env yalnızca gerekli değişkenler HENÜZ set edilmemişse yüklenir.
// (Test/CI'da DATABASE_URL zaten Testcontainers'a set edilir; .env bunu EZMEMELİ.)
if (string.IsNullOrEmpty(Environment.GetEnvironmentVariable("DATABASE_URL")))
{
    Env.TraversePath().Load();
}

// 2. Serilog yapılandırması
Log.Logger = new LoggerConfiguration()
    .WriteTo.Console()
    .CreateBootstrapLogger();

try
{
    QuestPDF.Settings.License = QuestPDF.Infrastructure.LicenseType.Community;
    var builder = WebApplication.CreateBuilder(args);

    builder.Host.UseSerilog((context, services, configuration) => configuration
        .ReadFrom.Configuration(context.Configuration)
        .ReadFrom.Services(services)
        .Enrich.FromLogContext()
        .WriteTo.Console());

    // --- SERVICES ---
    builder.Services.AddOpenApi();
    
    var corsOrigins = (Environment.GetEnvironmentVariable("CORS_ORIGINS") ?? "http://localhost:5173,https://mentorum.dersmatris.com")
        .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);

    builder.Services.AddCors(options =>
    {
        options.AddPolicy("MentorumCors",
            policy => policy
                .SetIsOriginAllowed(origin =>
                {
                    if (string.IsNullOrWhiteSpace(origin)) return false;
                    if (corsOrigins.Contains(origin, StringComparer.OrdinalIgnoreCase)) return true;
                    if (Uri.TryCreate(origin, UriKind.Absolute, out var uri))
                    {
                        return uri.Host == "localhost" || uri.Host == "127.0.0.1" || uri.Host.StartsWith("192.168.");
                    }
                    return false;
                })
                .WithMethods("GET", "POST", "PUT", "PATCH", "DELETE")
                .WithHeaders("Authorization", "Content-Type", "Idempotency-Key", "X-View-As-Student-Id", "X-View-As-Teacher-Id", "X-View-As-Parent-Id")
                .AllowCredentials());
    });

    // Dependency Injection
    builder.Services.AddSingleton<DbConnectionFactory>();
    builder.Services.AddSingleton<IStorageService, R2StorageService>();
    builder.Services.AddHostedService<StorageMaintenanceService>();
    builder.Services.AddScoped<JwtService>();
    builder.Services.AddScoped<GoogleAuthService>();
    builder.Services.AddHttpClient();
    builder.Services.AddSingleton<IEmailService, ResendEmailService>();
    builder.Services.AddScoped<AuthRepository>();
    builder.Services.AddScoped<InviteRepository>();
    builder.Services.AddScoped<StudentRepository>();
    builder.Services.AddScoped<StudentCoachingToolsRepository>();
    builder.Services.AddScoped<CurriculumRepository>();
    builder.Services.AddScoped<HomeworkRepository>();
    builder.Services.AddScoped<ExamRepository>();
    builder.Services.AddScoped<CalendarRepository>();
    builder.Services.AddScoped<ReportsRepository>();
    builder.Services.AddScoped<NotificationRepository>();
    builder.Services.AddScoped<ProgramRepository>();
    builder.Services.AddScoped<SchoolAccessRepository>();
    builder.Services.AddScoped<TeacherRepository>();
    builder.Services.AddScoped<CourseRepository>();
    builder.Services.AddScoped<GroupRepository>();
    builder.Services.AddScoped<ScheduleRepository>();
    builder.Services.AddScoped<CourseResourceRepository>();
    builder.Services.AddScoped<ParentVisibilityRepository>();
    builder.Services.AddScoped<ApprovalRepository>();
    builder.Services.AddScoped<StudySessionRepository>();
    builder.Services.AddScoped<PaymentPlanService>();
    builder.Services.AddScoped<PaymentRepository>();
    builder.Services.AddScoped<ProgramAccessGuard>();
    builder.Services.AddScoped<UploadRepository>();
    builder.Services.AddScoped<DeviceRepository>();
    builder.Services.AddScoped<QuestionCollectionRepository>();
    builder.Services.AddScoped<RateLimitRepository>();
    builder.Services.AddScoped<StudentCheckinRepository>();
    builder.Services.AddScoped<StudentNotesRepository>();
    builder.Services.AddScoped<StudentQuestionsRepository>();
    builder.Services.AddScoped<SchoolScheduleRepository>();
    builder.Services.AddScoped<AuditLogRepository>();
    builder.Services.AddScoped<AuditLogService>();
    builder.Services.AddMemoryCache();
    builder.Services.AddHostedService<MentorumApi.Services.Background.OverdueHomeworkJob>();

    // Authentication (JWT)
    var jwtSecret = Environment.GetEnvironmentVariable("JWT_SECRET") ?? builder.Configuration["Jwt:Secret"];
    var jwtIssuer = Environment.GetEnvironmentVariable("JWT_ISSUER") ?? builder.Configuration["Jwt:Issuer"];
    var jwtAudience = Environment.GetEnvironmentVariable("JWT_AUDIENCE") ?? builder.Configuration["Jwt:Audience"];

    if (string.IsNullOrEmpty(jwtSecret))
        throw new InvalidOperationException("JWT Secret bulunamadı! Lütfen .env dosyasını kontrol edin.");

    builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
        .AddJwtBearer(options =>
        {
            options.TokenValidationParameters = new TokenValidationParameters
            {
                ValidateIssuer = true,
                ValidateAudience = true,
                ValidateLifetime = true,
                ValidateIssuerSigningKey = true,
                ValidIssuer = jwtIssuer,
                ValidAudience = jwtAudience,
                IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecret)),
                ClockSkew = TimeSpan.Zero
            };
        });

    // Authorization Policies
    builder.Services.AddAuthorization(options =>
    {
        options.AddPolicy("RequireCoachRole", policy => policy.RequireRole("Coach", "Admin"));
        options.AddPolicy("RequireStudentRole", policy => policy.RequireRole("Student"));
        options.AddPolicy("RequireParentRole", policy => policy.RequireRole("Parent"));
        options.AddPolicy("RequireAdminRole", policy => policy.RequireClaim("is_admin", "true"));
        options.AddPolicy("RequireTeacherRole", policy => policy.RequireRole("Teacher"));
    });

    // Background Services

    var app = builder.Build();

    // Veritabanı Migration (--migrate-only komutuyla çalıştırılır)
    if (args.Contains("--migrate-only"))
    {
        Log.Information("Migration modunda çalıştırılıyor...");
        using var scope = app.Services.CreateScope();
        var dbFactory = scope.ServiceProvider.GetRequiredService<DbConnectionFactory>();
        MigrationRunner.Run(dbFactory);
        Log.Information("Migration tamamlandı. Uygulama kapatılıyor.");
        return;
    }

    if (app.Environment.IsDevelopment())
    {
        app.MapOpenApi();
    }

    app.UseSerilogRequestLogging();
    app.UseHttpsRedirection();

    // E1: Güvenlik Başlıkları Middleware'i
    app.Use(async (context, next) =>
    {
        context.Response.Headers["X-Content-Type-Options"] = "nosniff";
        context.Response.Headers["X-Frame-Options"] = "DENY";
        context.Response.Headers["Referrer-Policy"] = "same-origin";
        if (context.Request.Headers.ContainsKey("Authorization"))
        {
            context.Response.Headers["Cache-Control"] = "no-store";
        }
        await next();
    });

    app.UseCors("MentorumCors");

    // B5 & E2: Global Exception Handler ve PostgresException Eşlemesi
    app.UseExceptionHandler(err => err.Run(async context =>
    {
        context.Response.ContentType = "application/json";
        var exceptionFeature = context.Features.Get<Microsoft.AspNetCore.Diagnostics.IExceptionHandlerFeature>();
        var ex = exceptionFeature?.Error;

        if (ex != null)
        {
            Log.Error(ex, "İşlenemeyen sunucu hatası (Global Exception Handler)");
        }

        var pgEx = ex as PostgresException ?? ex?.InnerException as PostgresException;
        int statusCode = 500;
        string errorCode = "INTERNAL_ERROR";
        string errorMessage = "Sunucu hatası oluştu. Lütfen tekrar deneyin.";

        if (pgEx != null)
        {
            switch (pgEx.SqlState)
            {
                case "23505": // Unique violation
                    statusCode = 409;
                    errorCode = "DUPLICATE_RECORD";
                    errorMessage = "Bu kayıt zaten mevcut.";
                    break;
                case "23514": // Check violation (chk_score_question_sum vb.)
                    statusCode = 400;
                    errorCode = "CHECK_VIOLATION";
                    errorMessage = "Girilen veriler doğrulama kurallarına uymuyor (soru sayısı toplamı doğru/yanlış/boş toplamına eşit olmalıdır).";
                    break;
                case "23503": // Foreign key violation
                    statusCode = 400;
                    errorCode = "FOREIGN_KEY_VIOLATION";
                    errorMessage = "İlişkili kayıt bulunamadı.";
                    break;
            }
        }
        else if (ex is ArgumentException argEx)
        {
            statusCode = 400;
            errorCode = "INVALID_ARGUMENT";
            errorMessage = argEx.Message;
        }
        else if (ex is UnauthorizedAccessException unauthEx)
        {
            statusCode = 403;
            errorCode = "FORBIDDEN";
            errorMessage = unauthEx.Message;
        }
        else if (ex is Microsoft.AspNetCore.Http.BadHttpRequestException badReqEx)
        {
            statusCode = badReqEx.StatusCode;
            errorCode = "BAD_REQUEST";
            errorMessage = badReqEx.InnerException?.Message ?? badReqEx.Message;
        }
        else if (ex is System.Text.Json.JsonException jsonEx)
        {
            statusCode = 400;
            errorCode = "INVALID_JSON";
            errorMessage = jsonEx.Message;
        }

        context.Response.StatusCode = statusCode;
        var responseObj = new
        {
            error = errorMessage,
            code = errorCode,
            timestamp = DateTime.UtcNow
        };

        await context.Response.WriteAsJsonAsync(responseObj);
    }));

    app.UseAuthRateLimit();

    app.UseAuthentication();
    
    // Aktif olmayan veya silinen kullanıcıları bloklamak için Middleware
    app.UseJwtValidation();
    
    // T31: "Rol Gözüyle Gör" (View-As) sandbox (salt okunur mutasyon korumalı)
    app.UseViewAs();

    app.UseAuthorization();

    // Endpoints
    app.MapAuthEndpoints();
    app.MapInviteEndpoints();
    app.MapParentEndpoints();
    app.MapStudentEndpoints();
    app.MapStudentPortalEndpoints();
    app.MapCurriculumEndpoints();
    app.MapHomeworkEndpoints();
    app.MapExamEndpoints();
    app.MapCalendarEndpoints();
    app.MapReportsEndpoints();
    app.MapNotificationEndpoints();
    app.MapProgramEndpoints();
    app.MapTeacherEndpoints();
    app.MapCourseEndpoints();
    app.MapGroupEndpoints();
    app.MapScheduleEndpoints();
    app.MapCourseResourceEndpoints();
    app.MapApprovalEndpoints();
    app.MapPaymentEndpoints();
    app.MapStorageEndpoints();
    app.MapDeviceEndpoints();
    app.MapQuestionCollectionEndpoints();
    app.MapStudentFlexibilityEndpoints();

    app.MapGet("/", () => "Mentorum API Auth/Authz Katmanı Devrede!");

    // Fly.io Sağlık Kontrolü (Health Check)
    app.MapGet("/health", (DbConnectionFactory db) => 
    {
        try
        {
            using var conn = db.CreateConnection();
            conn.Execute("SELECT 1"); // DB bağlantısını test et
            return Results.Ok(new { status = "ok", db = "connected", version = "1.0.0" });
        }
        catch (Exception ex)
        {
            Log.Error(ex, "Health check failed (DB bağlantı hatası)");
            return Results.StatusCode(503); // 503 dönerse Fly.io deploy'u iptal eder
        }
    });

    // Süper yönetici bootstrap: SUPER_ADMIN_EMAIL kullanıcısını Admin rolüne yükselt
    var superAdminEmail = Environment.GetEnvironmentVariable("SUPER_ADMIN_EMAIL");
    if (!string.IsNullOrEmpty(superAdminEmail))
    {
        using var bootstrapScope = app.Services.CreateScope();
        var bootstrapDb = bootstrapScope.ServiceProvider.GetRequiredService<DbConnectionFactory>();
        using var bootstrapConn = bootstrapDb.CreateConnection();
        bootstrapConn.Open();
        var adminId = bootstrapConn.ExecuteScalar<Guid?>("SELECT id FROM users WHERE email = @Email", new { Email = superAdminEmail.ToLower() });
        if (adminId != null)
            bootstrapConn.Execute("UPDATE users SET role = 'Admin' WHERE id = @Id", new { Id = adminId });
    }

    app.Run();
}
catch (Exception ex)
{
    Log.Fatal(ex, "Uygulama başlatılırken kritik hata oluştu!");
    Environment.ExitCode = 1; // Fly release_command/deploy, hata durumunda deploy'u iptal etsin
}
finally
{
    Log.CloseAndFlush();
}

public partial class Program { }
