using Amazon.S3;
using Amazon.S3.Model;

namespace MentorumApi.Services
{
    /// <summary>Cloudflare R2 üzerinde çalışan S3-uyumlu depolama servisi.</summary>
    public class R2StorageService : IStorageService
    {
        private readonly IAmazonS3? _s3Client;
        private readonly string? _bucketName;

        public bool IsConfigured { get; }

        public R2StorageService(IConfiguration configuration)
        {
            var accessKey = configuration["R2_ACCESS_KEY_ID"];
            var secretKey = configuration["R2_SECRET_ACCESS_KEY"];
            var serviceUrl = configuration["R2_ENDPOINT_URL"];
            _bucketName = configuration["R2_BUCKET_NAME"];

            if (string.IsNullOrWhiteSpace(accessKey) ||
                string.IsNullOrWhiteSpace(secretKey) ||
                string.IsNullOrWhiteSpace(serviceUrl) ||
                string.IsNullOrWhiteSpace(_bucketName))
            {
                IsConfigured = false;
                _s3Client = null;
                return;
            }

            try
            {
                var s3Config = new AmazonS3Config
                {
                    ServiceURL = serviceUrl,
                    ForcePathStyle = true
                };

                _s3Client = new AmazonS3Client(accessKey, secretKey, s3Config);
                IsConfigured = true;
            }
            catch
            {
                IsConfigured = false;
                _s3Client = null;
            }
        }

        public string GenerateUploadUrl(string objectKey, string contentType, TimeSpan expiresIn)
        {
            if (!IsConfigured || _s3Client == null || string.IsNullOrEmpty(_bucketName))
                throw new InvalidOperationException("R2 depolama servisi yapılandırılmamış.");

            var request = new GetPreSignedUrlRequest
            {
                BucketName = _bucketName,
                Key = objectKey,
                Verb = HttpVerb.PUT,
                Expires = DateTime.UtcNow.Add(expiresIn),
                ContentType = contentType
            };

            return _s3Client.GetPreSignedURL(request);
        }

        public string GenerateDownloadUrl(string objectKey, TimeSpan expiresIn)
        {
            if (!IsConfigured || _s3Client == null || string.IsNullOrEmpty(_bucketName))
                throw new InvalidOperationException("R2 depolama servisi yapılandırılmamış.");

            var request = new GetPreSignedUrlRequest
            {
                BucketName = _bucketName,
                Key = objectKey,
                Verb = HttpVerb.GET,
                Expires = DateTime.UtcNow.Add(expiresIn)
            };

            return _s3Client.GetPreSignedURL(request);
        }

        public async Task DeleteFileAsync(string objectKey)
        {
            if (!IsConfigured || _s3Client == null || string.IsNullOrEmpty(_bucketName))
                return;

            await _s3Client.DeleteObjectAsync(new DeleteObjectRequest
            {
                BucketName = _bucketName,
                Key = objectKey
            });
        }

        public async Task<long?> GetObjectInfoAsync(string objectKey)
        {
            if (!IsConfigured || _s3Client == null || string.IsNullOrEmpty(_bucketName))
                return null;

            try
            {
                var response = await _s3Client.GetObjectMetadataAsync(new GetObjectMetadataRequest
                {
                    BucketName = _bucketName,
                    Key = objectKey
                });
                return response.ContentLength;
            }
            catch (AmazonS3Exception ex) when (ex.StatusCode == System.Net.HttpStatusCode.NotFound)
            {
                return null;
            }
        }
    }
}
