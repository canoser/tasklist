using System;
using System.Threading.Tasks;
using Amazon.S3;
using Amazon.S3.Model;
using Microsoft.Extensions.Configuration;
using PlanlamaApp.Application.Interfaces;

namespace PlanlamaApp.Infrastructure.Services
{
    public class R2StorageService : IStorageService
    {
        private readonly IAmazonS3 _s3Client;
        private readonly string _bucketName;

        public R2StorageService(IConfiguration configuration)
        {
            var accessKey = configuration["Storage:AccessKey"] 
                ?? throw new InvalidOperationException("Storage:AccessKey is missing.");
            var secretKey = configuration["Storage:SecretKey"] 
                ?? throw new InvalidOperationException("Storage:SecretKey is missing.");
            var serviceUrl = configuration["Storage:ServiceURL"] 
                ?? throw new InvalidOperationException("Storage:ServiceURL is missing.");
            _bucketName = configuration["Storage:BucketName"] 
                ?? throw new InvalidOperationException("Storage:BucketName is missing.");



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
            var request = new DeleteObjectRequest
            {
                BucketName = _bucketName,
                Key = objectKey
            };

            await _s3Client.DeleteObjectAsync(request);
        }

        public async Task<(long TotalSizeInBytes, int ObjectCount)> GetBucketStatsAsync()
        {
            long totalSize = 0;
            int objectCount = 0;
            string? continuationToken = null;

            do
            {
                var request = new ListObjectsV2Request
                {
                    BucketName = _bucketName,
                    ContinuationToken = continuationToken
                };

                var response = await _s3Client.ListObjectsV2Async(request);

                foreach (var obj in response.S3Objects)
                {
                    totalSize += obj.Size ?? 0;
                    objectCount++;
                }

                continuationToken = response.NextContinuationToken;

            } while (!string.IsNullOrEmpty(continuationToken));

            return (totalSize, objectCount);
        }
    }
}
