using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PlanlamaApp.Application.Interfaces;
using PlanlamaApp.Api.Filters;
using System.Security.Claims;

namespace PlanlamaApp.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class StorageController : ControllerBase
    {
        private readonly IStorageService _storageService;

        public StorageController(IStorageService storageService)
        {
            _storageService = storageService;
        }

        [HttpGet("upload-url")]
        public IActionResult GetUploadUrl([FromQuery] string filename, [FromQuery] string contentType)
        {
            if (string.IsNullOrWhiteSpace(filename) || string.IsNullOrWhiteSpace(contentType))
                return BadRequest("Filename and contentType are required.");

            var allowedTypes = new Dictionary<string, string[]>
            {
                { "image/jpeg", new[] { ".jpg", ".jpeg" } },
                { "image/png", new[] { ".png" } },
                { "application/pdf", new[] { ".pdf" } }
            };

            var ext = Path.GetExtension(filename).ToLowerInvariant();
            var lowerContentType = contentType.ToLowerInvariant();

            if (!allowedTypes.ContainsKey(lowerContentType))
                return BadRequest("Invalid content type. Only JPEG, PNG, and PDF are allowed.");

            if (!allowedTypes[lowerContentType].Contains(ext))
                return BadRequest("File extension does not match the provided content type.");

            var tenantId = User.FindFirstValue("tenant_id") ?? "default_tenant";
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? "unknown_user";

            // Benzersiz ve güvenli bir anahtar (Object Key) oluşturuyoruz.
            // Bu sayede klasörleme (Tenant/User bazlı) ve çakışma önleme sağlıyoruz.
            var safeFilename = Path.GetFileName(filename); // Dizin geçişi (Path Traversal) ataklarını önle
            var uniqueId = Guid.NewGuid().ToString("N").Substring(0, 8);
            var objectKey = $"{tenantId}/{userId}/{uniqueId}-{safeFilename}";

            // [MOBILE_PORT_TODO]: Bu endpoint tek seferde (single PUT) presigned URL döndürür. 5MB altı dosyalar için yeterlidir.
            // 5MB üzeri (özellikle mobil ağda 100MB+ dosyalar) için S3 Multipart Upload'a geçilmeli. Yapılacaklar:
            //
            // 1) IStorageService.cs ve R2StorageService.cs'e şu 3 metot eklenmeli:
            //    - Task<string> InitiateMultipartUploadAsync(string objectKey)
            //      → R2'ye "çok parçalı yükleme başlatıyorum" sinyali gönderir, bir uploadId döner.
            //    - Task<string> GeneratePartUrlAsync(string objectKey, string uploadId, int partNumber)
            //      → Her 5MB parçası için ayrı imzalı PUT URL'si döner (partNumber 1'den başlar).
            //    - Task CompleteMultipartUploadAsync(string objectKey, string uploadId, List<(int PartNumber, string ETag)> parts)
            //      → Tüm parçaların ETag listesiyle R2'ye "birleştir" komutu verir.
            //
            // 2) Bu controller'a 3 yeni endpoint eklenmeli:
            //    - POST /api/storage/multipart/initiate      → { objectKey } alır, { uploadId, objectKey } döner
            //    - POST /api/storage/multipart/part-url      → { objectKey, uploadId, partNumber } alır, { partUrl } döner
            //    - POST /api/storage/multipart/complete      → { objectKey, uploadId, parts: [{partNumber, eTag}] } alır
            //
            // 3) Frontend storageService.js'de (henüz yazılmadı) dosyayı 5MB chunk'lara bölen,
            //    her chunk için part-url çeken ve sırayla PUT eden bir fonksiyon yazılmalı.
            //    Son olarak complete endpoint'i çağrılmalı.
            //
            // NOT: Capacitor/iOS/Android'de binary PUT için @capacitor/filesystem + @capacitor/http kullanılmalı.
            // Detaylar: PORTABILITY.md > 'Dosya Yükleme (Storage) Mimarisi Notu'
            // 15 dakikalık yükleme izni
            var url = _storageService.GenerateUploadUrl(objectKey, contentType, TimeSpan.FromMinutes(15));

            return Ok(new
            {
                UploadUrl = url,
                ObjectKey = objectKey,
                ExpiresInMinutes = 15
            });
        }

        [HttpGet("download-url")]
        public IActionResult GetDownloadUrl([FromQuery] string objectKey)
        {
            if (string.IsNullOrWhiteSpace(objectKey))
                return BadRequest("ObjectKey is required.");

            var tenantId = User.FindFirstValue("tenant_id") ?? "default_tenant";

            // Sadece kendi tenant'ına ait dosyaları indirebilsin
            if (!objectKey.StartsWith($"{tenantId}/"))
                return Forbid("You do not have permission to access this file.");

            // 60 dakikalık okuma izni
            var url = _storageService.GenerateDownloadUrl(objectKey, TimeSpan.FromMinutes(60));

            return Ok(new
            {
                DownloadUrl = url,
                ExpiresInMinutes = 60
            });
        }
    }
}
