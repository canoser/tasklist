using System.Data;
using System.Threading.RateLimiting;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Npgsql;
using Microsoft.IdentityModel.Tokens;
using PlanlamaApp.Api.Filters;
using PlanlamaApp.Application.Interfaces;
using PlanlamaApp.Infrastructure;
using PlanlamaApp.Infrastructure.Repositories;
using PlanlamaApp.Infrastructure.Providers;
using Serilog;
using Serilog.Events;
using PlanlamaApp.Api.Hubs;

var builder = WebApplication.CreateBuilder(args);

// Serilog Yapılandırması
Log.Logger = new LoggerConfiguration()
    .MinimumLevel.Override("Microsoft", LogEventLevel.Information)
    .Enrich.FromLogContext()
    .WriteTo.Console()
    .WriteTo.File("logs/log-.txt", rollingInterval: RollingInterval.Day,
        outputTemplate: "{Timestamp:yyyy-MM-dd HH:mm:ss.fff zzz} [{Level:u3}] {Message:lj}{NewLine}{Exception}")
    .CreateLogger();

builder.Host.UseSerilog();

// 1. JWT Authentication (Local Cookie tabanlı)
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        var secretKey = builder.Configuration["Jwt:SecretKey"] ?? "BU_COK_GIZLI_GECICI_BIR_ANAHTARDIR_HICBIR_ZAMAN_PRODUCTIONDA_KULLANILMAMALIDIR_12345!!!";
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidIssuer = builder.Configuration["Jwt:Issuer"] ?? "planlama_app",
            ValidateAudience = true,
            ValidAudience = builder.Configuration["Jwt:Audience"] ?? "planlama_app_users",
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(System.Text.Encoding.UTF8.GetBytes(secretKey))
        };
        
        // [MOBILE_PORT_TODO]: Native mobil uygulamalarda Cookie mekanizması stabil çalışmaz.
        // Mobil istemciler için token'ı Authorization: Bearer header'ı üzerinden okumayı etkinleştirmeniz gerekebilir.
        // Token'ı Authorization header yerine Cookie'den okuma
        options.Events = new JwtBearerEvents
        {
            OnMessageReceived = context =>
            {
                var accessToken = context.Request.Query["access_token"];
                var path = context.HttpContext.Request.Path;

                // SignalR istekleri için QueryString'den token oku
                if (!string.IsNullOrEmpty(accessToken) && path.StartsWithSegments("/api/hubs"))
                {
                    context.Token = accessToken;
                }
                else if (context.Request.Cookies.ContainsKey("auth_token"))
                {
                    context.Token = context.Request.Cookies["auth_token"];
                }
                return Task.CompletedTask;
            }
        };
    });

// 2. CORS Politikası (Strict DevSecOps)
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowStrict", policy =>
    {
        var allowedOrigins = builder.Configuration.GetSection("AllowedOrigins").Get<string[]>() ?? Array.Empty<string>();
        
        policy.SetIsOriginAllowed(origin => 
                {
                    var host = new Uri(origin).Host;
                    
                    if (allowedOrigins.Contains(origin)) return true;
                    
                    return host == "localhost" || host == "127.0.0.1" || host.StartsWith("192.168.");
                })
              .AllowAnyMethod()
              .AllowAnyHeader()
              // [MOBILE_PORT_TODO]: Capacitor/Mobil için origin'in file:// veya capacitor:// localhost 
              // olmasına izin vermeniz (ya da wildcard) ve CORS'u buna göre esnetmeniz gerekebilir.
              .AllowCredentials(); // ZORUNLU KURAL: Çerez (Cookie) gönderimi için şarttır.
    });
});

// 3. IP/Kullanıcı Bazlı Rate Limiting (Partitioned)
builder.Services.AddRateLimiter(options =>
{
    options.AddPolicy("FixedPolicy", context =>
    {
        // Token varsa UserId (NameIdentifier), yoksa IP adresini kullan
        var identity = context.User?.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value 
                       ?? context.Connection.RemoteIpAddress?.ToString() 
                       ?? "anonymous";

        return RateLimitPartition.GetFixedWindowLimiter(identity, _ => new FixedWindowRateLimiterOptions
        {
            PermitLimit = 100, // Her kullanıcı/IP için ayrı ayrı dakikada 100 istek
            Window = TimeSpan.FromMinutes(1),
            QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
            QueueLimit = 2
        });
    });
    
    // Geri dönüş (429 Too Many Requests)
    options.OnRejected = async (context, token) =>
    {
        context.HttpContext.Response.StatusCode = 429;
        await context.HttpContext.Response.WriteAsync("Çok fazla istek gönderdiniz. Lütfen biraz bekleyin.", cancellationToken: token);
    };
});

// 4. MemoryCache (Settings Cache için)
builder.Services.AddMemoryCache();

// 5. Authorization (Admin Policy)
builder.Services.AddAuthorization(options =>
{
    options.AddPolicy("AdminOnly", policy =>
        policy.RequireAssertion(context =>
            context.User.HasClaim(c => c.Type == "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress" && c.Value == "canoser@gmail.com") ||
            context.User.HasClaim(c => c.Type == "email" && c.Value == "canoser@gmail.com")));
});

// 6. Dependency Injection (DI) - Katmanlar Arası Bağımlılıklar
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection")
    ?? throw new InvalidOperationException("ConnectionStrings:DefaultConnection bulunamadı! appsettings.json kontrol edin.");

// Neon.tech ve Fly.io ortamlarında gelen "postgres://..." formatını Npgsql formatına çevir
if (connectionString.StartsWith("postgres://") || connectionString.StartsWith("postgresql://"))
{
    var uri = new Uri(connectionString);
    var userInfo = uri.UserInfo.Split(':');
    var csBuilder = new Npgsql.NpgsqlConnectionStringBuilder
    {
        Host = uri.Host,
        Port = uri.Port > 0 ? uri.Port : 5432,
        Username = userInfo.Length > 0 ? userInfo[0] : "",
        Password = userInfo.Length > 1 ? userInfo[1] : "",
        Database = uri.LocalPath.TrimStart('/'),
        SslMode = Npgsql.SslMode.Require,
        Pooling = true
    };
    connectionString = csBuilder.ToString();
}

builder.Services.AddScoped<IDbConnection>(sp => new NpgsqlConnection(connectionString));
builder.Services.AddHttpContextAccessor();
builder.Services.AddScoped<ITenantProvider, PlanlamaApp.Api.Providers.HttpContextTenantProvider>();

builder.Services.AddScoped<IIdempotencyRepository, IdempotencyRepository>();

// Görev, Kategori ve Performans Repository kayıtları
builder.Services.AddScoped<ITaskRepository, TaskRepository>();
builder.Services.AddScoped<ICategoryRepository, CategoryRepository>();
builder.Services.AddScoped<IPerformanceRepository, PerformanceRepository>();

// Rol Yönetimi — UserRole + TaskAssignment Repository kayıtları
builder.Services.AddScoped<IUserRoleRepository, UserRoleRepository>();
builder.Services.AddScoped<ITaskAssignmentRepository, TaskAssignmentRepository>();
builder.Services.AddScoped<IWorkspaceRepository, WorkspaceRepository>();
builder.Services.AddScoped<IUserRepository, UserRepository>();
builder.Services.AddScoped<IUsageTrackingRepository, UsageTrackingRepository>();
builder.Services.AddScoped<ISystemSettingsRepository, SystemSettingsRepository>();
builder.Services.AddScoped<ISystemErrorRepository, SystemErrorRepository>();
builder.Services.AddScoped<ISettingsService, PlanlamaApp.Infrastructure.Services.SettingsService>();
builder.Services.AddScoped<IQuotaManager, PlanlamaApp.Infrastructure.Services.QuotaManager>();
builder.Services.AddScoped<IRewardValidator, PlanlamaApp.Infrastructure.Services.MockRewardValidator>();
builder.Services.AddScoped<IStorageService, PlanlamaApp.Infrastructure.Services.R2StorageService>();

// Register Background Services
builder.Services.AddHostedService<PlanlamaApp.Infrastructure.Services.StorageMaintenanceService>();

// Configure AI Providers DI
var activeAiProvider = builder.Configuration["AiSettings:ActiveProvider"]?.ToLower();
if (activeAiProvider == "gemini")
{
    builder.Services.AddHttpClient<IAiProvider, GeminiProvider>();
}
else
{
    builder.Services.AddHttpClient<IAiProvider, OpenAiProvider>();
}

// IdempotencyFilter'ı DI container'a kaydet (Controller'larda [ServiceFilter] ile kullanım için zorunludur)
builder.Services.AddScoped<IdempotencyFilter>();

// 4. Controller ve IdempotencyFilter (Global veya Controller bazlı eklenebilir, şimdilik servislere ekledik)
builder.Services.AddControllers();
builder.Services.AddSignalR();

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();

// Küresel Hata Yakalayıcı (Global Exception Handler Middleware)
app.Use(async (context, next) =>
{
    try
    {
        await next();
    }
    catch (Exception ex)
    {
        Log.Error(ex, "HTTP isteği sırasında yakalanamayan bir hata oluştu: {RequestPath}", context.Request.Path);
        
        try
        {
            // Veritabanına kaydet
            using var scope = app.Services.CreateScope();
            var errorRepo = scope.ServiceProvider.GetRequiredService<ISystemErrorRepository>();
            var tenantProvider = scope.ServiceProvider.GetService<ITenantProvider>();
            
            var sysError = new PlanlamaApp.Domain.Entities.SystemError
            {
                Path = context.Request.Path,
                HttpMethod = context.Request.Method,
                ErrorMessage = ex.Message,
                StackTrace = ex.StackTrace ?? "",
                TenantId = tenantProvider?.GetTenantId(),
                UserId = context.User?.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value
            };
            await errorRepo.LogErrorAsync(sysError);
        }
        catch (Exception dbEx)
        {
            Log.Error(dbEx, "Hata veritabanına yazılırken ikincil bir hata oluştu!");
        }

        throw; // Hatanın ASP.NET Core tarafından da bilinmesi için yeniden fırlatıyoruz
    }
});

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

// Geliştirme (Development) ortamında HTTP ile de çalışılabilmesi için HTTPS yönlendirmeyi sadece Production'da aktif et
if (!app.Environment.IsDevelopment())
{
    app.UseHttpsRedirection();
}

app.UseCors("AllowStrict");

// Sıralama önemlidir: CORS -> Rate Limiting -> Auth -> Authorization
app.UseRateLimiter();

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers().RequireRateLimiting("FixedPolicy");
app.MapHub<AppHub>("/api/hubs/app");

// Veritabanı migration: UserRoles ve TaskAssignments tablolarını oluştur (idempotentten)
DatabaseMigration.Run(connectionString);

app.Run();

public partial class Program { }
//
chore:
Trigger
deploy
