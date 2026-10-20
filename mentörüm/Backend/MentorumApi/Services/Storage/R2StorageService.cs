using Amazon.S3;
using Amazon.S3.Model;

namespace MentorumApi.Services
{
    /// <summary>Cloudflare R2 üzerinde çalışan S3-uyumlu depolama servisi.</summary>
    public class R2StorageService : IStorageService
    {
        private readonly IAmazonS3 _s3Client;
        private readonly string _bucketName;

        public R2StorageService(IConfiguration configuration)
        {
            var accessKey = configuration["R2_ACCESS_KEY_ID"]
                ?? throw new InvalidOperationException("R2_ACCESS_KEY_ID is missing.");
            var secretKey = configuration["R2_SECRET_ACCESS_KEY"]
                ?? throw new InvalidOperationException("R2_SECRET_ACCESS_KEY is missing.");
            var serviceUrl = configuration["R2_ENDPOINT_URL"]
                ?? throw new InvalidOperationException("R2_ENDPOINT_URL is missing.");
            _bucketName = configuration["R2_BUCKET_NAME"]
                ?? throw new InvalidOperationException("R2_BUCKET_NAME is missing.");

            var s3Config = new AmazonS3Config
            {
                ServiceURL = serviceUrl,
                ForcePathStyle = true
            };

            _s3Client = new AmazonS3Client(accessKey, secretKey, s3Config);
        }

        public string GenerateUploadUrl(string objectKey, string contentType, TimeSpan expiresIn)
        {
            var request = new GetPreSignedUrlRequest
            {
                BucketName = _bucketName,
                Key = objectKey,
                Verb = HttpVerb.PUT,
                Expires = DateTime.UtcNow.Add(expiresIn),
                // GÜVENLİK: ContentType imzaya dahil edilir; istemci aynı tipi göndermek zorundadır.
                ContentType = contentType
            };

            return _s3Client.GetPreSignedURL(request);
        }

        public string GenerateDownloadUrl(string objectKey, TimeSpan expiresIn)
        {
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
            await _s3Client.DeleteObjectAsync(new DeleteObjectRequest
            {
                BucketName = _bucketName,
                Key = objectKey
            });
        }

        public async Task<long?> GetObjectInfoAsync(string objectKey)
        {
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
