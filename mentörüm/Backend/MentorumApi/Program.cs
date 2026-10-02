using Serilog;
using DotNetEnv;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using MentorumApi.Data;
using MentorumApi.Services;
using MentorumApi.Middleware;
using MentorumApi.Endpoints;

// 1. .env dosyasını yükle
Env.TraversePath().Load();

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
    builder.Services.AddScoped<EmailService>();
    builder.Services.AddScoped<StudentRepository>();
    builder.Services.AddScoped<CurriculumRepository>();
    builder.Services.AddScoped<HomeworkRepository>();
    builder.Services.AddScoped<ExamRepository>();
    builder.Services.AddScoped<CalendarRepository>();
    builder.Services.AddScoped<ReportsRepository>();
    builder.Services.AddScoped<NotificationRepository>();
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
        options.AddPolicy("RequireCoachRole", policy => policy.RequireRole("Coach"));
        options.AddPolicy("RequireStudentRole", policy => policy.RequireRole("Student"));
        options.AddPolicy("RequireParentRole", policy => policy.RequireRole("Parent"));
    });

    // Background Services
    // builder.Services.AddHostedService<MentorumApi.Services.OverdueHomeworkJob>(); // İptal edildi: Hesaplanan kolon (Computed) kullanılacak.

    var app = builder.Build();

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

    app.MapGet("/", () => "Mentorum API Auth/Authz Katmanı Devrede!");

    app.Run();
}
catch (Exception ex)
{
    Log.Fatal(ex, "Uygulama başlatılırken kritik hata oluştu!");
}
finally
{
    Log.CloseAndFlush();
}

public partial class Program { }
