using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PlanlamaApp.Application.Interfaces;
using PlanlamaApp.Api.Filters;
using System.Security.Claims;
using Dapper;
using PlanlamaApp.Domain.Entities;
using System.Data;

namespace PlanlamaApp.Api.Controllers
{
    public class UploadUrlRequest
    {
        public string FileName { get; set; } = string.Empty;
        public long FileSizeInBytes { get; set; }
        public string ContentType { get; set; } = string.Empty;
        public int WorkspaceId { get; set; }
        public string? Description { get; set; }
    }

    public class ConfirmUploadRequest
    {
        public int FileId { get; set; }
    }

    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class StorageController : ControllerBase
    {
        private readonly IStorageService _storageService;
        private readonly IQuotaManager _quotaManager;
        private readonly IDbConnection _dbConnection;

        public StorageController(IStorageService storageService, IQuotaManager quotaManager, IDbConnection dbConnection)
        {
            _storageService = storageService;
            _quotaManager = quotaManager;
            _dbConnection = dbConnection;
        }

        [HttpPost("upload-url")]
        public async Task<IActionResult> GetUploadUrl([FromBody] UploadUrlRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.FileName) || string.IsNullOrWhiteSpace(request.ContentType))
                return BadRequest("FileName and ContentType are required.");

            // 1. Uzantı Kontrolü (Whitelist)
            var allowedExtensions = new[] { ".pdf", ".docx", ".xlsx", ".pptx", ".png", ".jpg", ".jpeg", ".zip", ".mp4" };
            var extension = Path.GetExtension(request.FileName).ToLowerInvariant();
            if (!allowedExtensions.Contains(extension))
                return BadRequest($"Desteklenmeyen dosya türü: {extension}");

            // 2. Boyut Kontrolü (Örn: Maksimum 100 MB tekil dosya)
            const long MAX_FILE_SIZE = 100 * 1024 * 1024;
            if (request.FileSizeInBytes > MAX_FILE_SIZE)
                return BadRequest($"Dosya boyutu 100MB'ı aşamaz.");

            var tenantId = User.FindFirstValue("tenant_id") ?? "default_tenant";
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? "unknown_user";

            // 3. Kota Rezervasyonu
            var success = await _quotaManager.TryDeductAsync(tenantId, "free", "TotalStorage", request.FileSizeInBytes);
            if (!success)
                return BadRequest("Yetersiz depolama alanı. Lütfen bazı dosyaları silin veya planınızı yükseltin.");

            // 4. Object Key Üretimi
            var safeFilename = Path.GetFileName(request.FileName);
            var uniqueId = Guid.NewGuid().ToString("N").Substring(0, 8);
            var objectKey = $"workspaces/{tenantId}/{request.WorkspaceId}/{uniqueId}-{safeFilename}";

            // 5. Veritabanına Pending Kaydı (Taslak)
            var sql = @"
                INSERT INTO WorkspaceFiles (TenantId, WorkspaceId, UploaderId, FileName, FileUrl, FileSizeInBytes, FileType, Description, UploadStatus, CreatedAt, UpdatedAt)
                VALUES (@TenantId, @WorkspaceId, @UploaderId, @FileName, @FileUrl, @FileSizeInBytes, @FileType, @Description, 'Pending', @Now, @Now)
                RETURNING Id;
            ";
            
            var p = new {
                TenantId = tenantId,
                WorkspaceId = request.WorkspaceId,
                UploaderId = userId,
                FileName = safeFilename,
                FileUrl = objectKey,
                FileSizeInBytes = request.FileSizeInBytes,
                FileType = extension,
                Description = request.Description,
                Now = DateTime.UtcNow
            };

            var fileId = await _dbConnection.ExecuteScalarAsync<int>(sql, p);

            // 6. R2'den 15 Dakikalık Yükleme URL'si
            var uploadUrl = _storageService.GenerateUploadUrl(objectKey, request.ContentType, TimeSpan.FromMinutes(15));

            return Ok(new
            {
                UploadUrl = uploadUrl,
                FileId = fileId,
                ObjectKey = objectKey,
                ExpiresInMinutes = 15
            });
        }

        [HttpPost("confirm-upload")]
        [ServiceFilter(typeof(IdempotencyFilter))]
        public async Task<IActionResult> ConfirmUpload([FromBody] ConfirmUploadRequest request)
        {
            var tenantId = User.FindFirstValue("tenant_id") ?? "default_tenant";

            // DB'den pending dosyayı bul
            var file = await _dbConnection.QueryFirstOrDefaultAsync<WorkspaceFile>(
                "SELECT * FROM WorkspaceFiles WHERE Id = @Id AND TenantId = @TenantId AND UploadStatus = 'Pending'",
                new { Id = request.FileId, TenantId = tenantId });

            if (file == null)
                return NotFound("Dosya kaydı bulunamadı veya süresi geçmiş.");

            // R2'den gerçekten yüklenip yüklenmediğini ve boyutunu kontrol et
            var actualSize = await _storageService.GetObjectInfoAsync(file.FileUrl);
            
            if (actualSize == null || actualSize.Value != file.FileSizeInBytes)
            {
                // Hileli yükleme veya dosya yok! İşlemi iptal et ve kotayı iade et.
                if (actualSize != null) 
                    await _storageService.DeleteFileAsync(file.FileUrl);

                await _dbConnection.ExecuteAsync(
                    "UPDATE WorkspaceFiles SET UploadStatus = 'Failed' WHERE Id = @Id", 
                    new { Id = file.Id });
                
                await _quotaManager.RefundAsync(tenantId, "free", "TotalStorage", file.FileSizeInBytes);
                
                return BadRequest("Dosya boyutu uyuşmazlığı. Yükleme iptal edildi.");
            }

            // Başarılı!
            await _dbConnection.ExecuteAsync(
                "UPDATE WorkspaceFiles SET UploadStatus = 'Uploaded', UpdatedAt = @Now WHERE Id = @Id", 
                new { Id = file.Id, Now = DateTime.UtcNow });

            return Ok(new { Message = "Upload confirmed successfully." });
        }

        [HttpGet("download-url")]
        public async Task<IActionResult> GetDownloadUrl([FromQuery] string objectKey)
        {
            if (string.IsNullOrWhiteSpace(objectKey))
                return BadRequest("ObjectKey is required.");

            // Path Traversal ve URL Decode Güvenlik Kontrolü
            var decodedKey = Uri.UnescapeDataString(objectKey);
            if (decodedKey.Contains("..") || decodedKey.Contains("%2e%2e", StringComparison.OrdinalIgnoreCase))
                return BadRequest("Geçersiz veya tehlikeli dosya yolu.");

            var tenantId = User.FindFirstValue("tenant_id") ?? "default_tenant";

            // Sadece kendi tenant'ına ait dosyaları indirebilsin
            if (!objectKey.StartsWith($"workspaces/{tenantId}/"))
                return Forbid();
                
            // Sadece Uploaded statüsündeki dosyalar indirilebilir
            var file = await _dbConnection.QueryFirstOrDefaultAsync<WorkspaceFile>(
                "SELECT * FROM WorkspaceFiles WHERE FileUrl = @FileUrl AND UploadStatus = 'Uploaded' AND IsDeleted = FALSE",
                new { FileUrl = objectKey });
                
            if (file == null)
                return NotFound();

            // 10 dakikalık okuma izni
            var url = _storageService.GenerateDownloadUrl(objectKey, TimeSpan.FromMinutes(10));

            return Ok(new
            {
                DownloadUrl = url,
                ExpiresInMinutes = 10
            });
        }
    }
}
