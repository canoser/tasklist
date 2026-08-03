using System;

namespace PlanlamaApp.Application.Interfaces
{
    public interface IStorageService
    {
        /// <summary>
        /// Generates a presigned URL that allows the client to upload a file directly to the storage bucket.
        /// </summary>
        /// <param name="objectKey">The unique key/path of the file to be uploaded.</param>
        /// <param name="contentType">The MIME type of the file.</param>
        /// <param name="expiresIn">How long the URL should be valid.</param>
        /// <returns>A presigned HTTP PUT URL.</returns>
        string GenerateUploadUrl(string objectKey, string contentType, TimeSpan expiresIn);

        /// <summary>
        /// Generates a presigned URL that allows the client to download/read a file directly from the storage bucket.
        /// </summary>
        /// <param name="objectKey">The unique key/path of the file.</param>
        /// <param name="expiresIn">How long the URL should be valid.</param>
        /// <returns>A presigned HTTP GET URL.</returns>
        string GenerateDownloadUrl(string objectKey, TimeSpan expiresIn);

        /// <summary>
        /// Optional: Deletes a file from the bucket (useful for cleanups).
        /// </summary>
        /// <param name="objectKey">The unique key/path of the file to delete.</param>
        Task DeleteFileAsync(string objectKey);
    }
}
