namespace MentorumApi.Services
{
    /// <summary>Nesne depolama (Cloudflare R2 / S3-uyumlu) soyutlaması.</summary>
    public interface IStorageService
    {
        /// <summary>İstemcinin doğrudan yükleyebileceği presigned PUT URL üretir.</summary>
        string GenerateUploadUrl(string objectKey, string contentType, TimeSpan expiresIn);

        /// <summary>İstemcinin okuyabileceği presigned GET URL üretir.</summary>
        string GenerateDownloadUrl(string objectKey, TimeSpan expiresIn);

        /// <summary>Nesneyi kalıcı olarak siler.</summary>
        Task DeleteFileAsync(string objectKey);

        /// <summary>Nesnenin bayt cinsinden boyutunu döner; yoksa null.</summary>
        Task<long?> GetObjectInfoAsync(string objectKey);
    }
}
