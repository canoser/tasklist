import apiClient from './apiClient';

/**
 * Dosya yükleme ve indirme işlemleri için merkezi servis.
 * - S3/R2 üzerinden presigned URL alır
 * - Yükleme tamamlanınca Idempotency-Key ile backend'e onay bildirir.
 */
export const storageService = {
  /**
   * Yükleme URL'si alır (Pending kaydı oluşur)
   */
  getUploadUrl: async (workspaceId, fileName, contentType, fileSizeInBytes, description = '') => {
    const response = await apiClient.post('/api/storage/upload-url', {
      workspaceId,
      fileName,
      contentType,
      fileSizeInBytes,
      description,
    });
    return response.data; // { uploadUrl, fileId, objectKey, expiresInMinutes }
  },

  /**
   * Verilen Presigned URL'e dosyayı direkt PUT eder
   */
  uploadToR2: async (uploadUrl, file, onProgress) => {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable && onProgress) {
          const percentComplete = Math.round((event.loaded / event.total) * 100);
          onProgress(percentComplete);
        }
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(true);
        } else {
          reject(new Error(`Yükleme hatası: ${xhr.statusText}`));
        }
      };

      xhr.onerror = () => reject(new Error('Ağ hatası veya CORS kısıtlaması'));
      
      xhr.open('PUT', uploadUrl, true);
      xhr.setRequestHeader('Content-Type', file.type);
      xhr.send(file);
    });
  },

  /**
   * Backend'e yüklemenin tamamlandığını bildirir
   */
  confirmUpload: async (fileId, idempotencyKey) => {
    const response = await apiClient.post(
      '/api/storage/confirm-upload',
      { fileId },
      {
        headers: {
          'Idempotency-Key': idempotencyKey, // Aynı onay isteğinin 2 kere işlenmesini önler
        },
      }
    );
    return response.data;
  },

  /**
   * İndirme URL'si alır (Sadece izinli kullanıcılar için)
   */
  getDownloadUrl: async (objectKey) => {
    const response = await apiClient.get(`/api/storage/download-url?objectKey=${encodeURIComponent(objectKey)}`);
    return response.data; // { downloadUrl, expiresInMinutes }
  }
};
