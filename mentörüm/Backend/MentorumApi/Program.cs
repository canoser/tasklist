using Serilog;
using DotNetEnv;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using Dapper;
using MentorumApi.Data;
using MentorumApi.Services;
using MentorumApi.Middleware;
using MentorumApi.Endpoints;

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
    var builder = WebApplication.CreateBuilder(args);

    builder.Host.UseSerilog((context, services, configuration) => configuration
        .ReadFrom.Configuration(context.Configuration)
        .ReadFrom.Services(services)
        .Enrich.FromLogContext()
        .WriteTo.Console());

    // --- SERVICES ---
    builder.Services.AddOpenApi();
    
    builder.Services.AddCors(options =>
    {
        options.AddPolicy("AllowAll",
            policy => policy
                .WithOrigins("http://localhost:5173", "https://mentorum.dersmatris.com")
                .AllowAnyMethod()
                .AllowAnyHeader()
                .AllowCredentials());
    });

    // Dependency Injection
    builder.Services.AddSingleton<DbConnectionFactory>();
    builder.Services.AddScoped<JwtService>();
    builder.Services.AddScoped<GoogleAuthService>();
    builder.Services.AddHttpClient();
    builder.Services.AddSingleton<IEmailService, ResendEmailService>();
    builder.Services.AddScoped<StudentRepository>();
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
        using var conn = dbFactory.CreateConnection();
        
        var scriptPaths = new[] 
        { 
            Path.Combine(AppContext.BaseDirectory, "Data", "Migrations", "001_InitialSchema.sql"),
            Path.Combine(AppContext.BaseDirectory, "Data", "Migrations", "002_Phase10_11.sql"),
            Path.Combine(AppContext.BaseDirectory, "Data", "Migrations", "003_InviteCode.sql"),
            Path.Combine(AppContext.BaseDirectory, "Data", "Migrations", "004_Curriculum2026.sql"),
            Path.Combine(AppContext.BaseDirectory, "Data", "Migrations", "005_HomeworkDirect.sql"),
            Path.Combine(AppContext.BaseDirectory, "Data", "Migrations", "006_SchoolModel.sql"),
            Path.Combine(AppContext.BaseDirectory, "Data", "Migrations", "007_AdminAndPrograms.sql"),
            Path.Combine(AppContext.BaseDirectory, "Data", "Migrations", "008_ContractCoachId.sql"),
            Path.Combine(AppContext.BaseDirectory, "Data", "Migrations", "009_AdminAndApproval.sql"),
            Path.Combine(AppContext.BaseDirectory, "Data", "Migrations", "010_ExamCourseId.sql")
        };
        foreach(var path in scriptPaths)
        {
            if (File.Exists(path))
            {
                var sql = File.ReadAllText(path);
                conn.Execute(sql);
                Log.Information("Migration uygulandı: {Path}", path);
            }
            else
            {
                Log.Warning("Migration dosyası bulunamadı: {Path}", path);
            }
        }
        Log.Information("Migration tamamlandı. Uygulama kapatılıyor.");
        return;
    }

    if (app.Environment.IsDevelopment())
    {
        app.MapOpenApi();
    }

    app.UseSerilogRequestLogging();
    app.UseHttpsRedirection();
    app.UseCors("AllowAll");

    app.UseAuthentication();
    
    // Aktif olmayan veya silinen kullanıcıları bloklamak için Middleware
    app.UseJwtValidation();
    
    app.UseAuthorization();

    // Endpoints
    app.MapAuthEndpoints();
    app.MapInviteEndpoints();
    app.MapParentEndpoints();
    app.MapStudentEndpoints();
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
