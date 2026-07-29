using System.Data;
using System.Threading.RateLimiting;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.Data.Sqlite;
using Microsoft.IdentityModel.Tokens;
using PlanlamaApp.Api.Filters;
using PlanlamaApp.Application.Interfaces;
using PlanlamaApp.Infrastructure;
using PlanlamaApp.Infrastructure.Repositories;

var builder = WebApplication.CreateBuilder(args);

// 1. JWT Authentication (Firebase)
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        // Örnek Firebase Auth Authority (Kendi proje ID'nizle değişecektir)
        options.Authority = "https://securetoken.google.com/planlamaapp-demo";
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidIssuer = "https://securetoken.google.com/planlamaapp-demo",
            ValidateAudience = true,
            ValidAudience = "planlamaapp-demo",
            ValidateLifetime = true
        };
    });

// 2. CORS Politikası (Aynı Wi-Fi ve yerel ağ erişimi için)
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyMethod()
              .AllowAnyHeader();
    });
});

// 3. IP Bazlı Rate Limiting
builder.Services.AddRateLimiter(options =>
{
    options.AddFixedWindowLimiter("FixedPolicy", opt =>
    {
        opt.PermitLimit = 100; // Dakikada 100 istek
        opt.Window = TimeSpan.FromMinutes(1);
        opt.QueueProcessingOrder = QueueProcessingOrder.OldestFirst;
        opt.QueueLimit = 2; // Sınır aşıldığında bekletilecek kuyruk boyutu
    });
});

// 3. Dependency Injection (DI) - Katmanlar Arası Bağımlılıklar
// Geliştirme ortamı için geçici bir SQLite bağlantısı ve TenantProvider
builder.Services.AddScoped<IDbConnection>(sp => new SqliteConnection("Data Source=planlama_app.db"));
// Gerçek projede ITenantProvider HTTP Context üzerinden (örneğin Claims'ten) okuyan bir sınıfla doldurulacak.
// Şimdilik derlenmesi adına sahte bir servis kaydediyoruz:
builder.Services.AddScoped<ITenantProvider>(sp => throw new NotImplementedException("Gerçek TenantProvider yazılmalıdır."));

builder.Services.AddScoped<IIdempotencyRepository, IdempotencyRepository>();

// Görev, Kategori ve Performans Repository kayıtları
builder.Services.AddScoped<ITaskRepository, TaskRepository>();
builder.Services.AddScoped<ICategoryRepository, CategoryRepository>();
builder.Services.AddScoped<IPerformanceRepository, PerformanceRepository>();

// Rol Yönetimi — UserRole + TaskAssignment Repository kayıtları
builder.Services.AddScoped<IUserRoleRepository, UserRoleRepository>();
builder.Services.AddScoped<ITaskAssignmentRepository, TaskAssignmentRepository>();
builder.Services.AddScoped<IWorkspaceRepository, WorkspaceRepository>();

// IdempotencyFilter'ı DI container'a kaydet (Controller'larda [ServiceFilter] ile kullanım için zorunludur)
builder.Services.AddScoped<IdempotencyFilter>();

// 4. Controller ve IdempotencyFilter (Global veya Controller bazlı eklenebilir, şimdilik servislere ekledik)
builder.Services.AddControllers(options =>
{
    // Idempotency filtreyi global olarak tüm endpointlere de uygulayabilirsiniz, 
    // veya sadece [ServiceFilter(typeof(IdempotencyFilter))] etiketi ile spesifik Controller/Action'larda kullanabilirsiniz.
    options.Filters.Add<IdempotencyFilter>();
});

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();

app.UseCors("AllowAll");

// Sıralama önemlidir: CORS -> Rate Limiting -> Auth -> Authorization
app.UseRateLimiter();

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers().RequireRateLimiting("FixedPolicy");

// Veritabanı migration: UserRoles ve TaskAssignments tablolarını oluştur (idempotentten)
var dbConnectionString = builder.Configuration.GetConnectionString("Default") ?? "Data Source=planlama_app.db";
DatabaseMigration.Run(dbConnectionString);

app.Run();
