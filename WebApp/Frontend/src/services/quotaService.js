import apiClient from './apiClient';

/**
 * Belirli bir kaynak (örn. AiTaskCreation) için kota durumunu getirir.
 * @param {string} resourceType - Öğrenilmek istenen kaynak türü.
 * @returns {Promise<Object>} Kota durumu objesi.
 */
export const getQuotaStatus = async (resourceType) => {
  const response = await apiClient.get(`/quota/status/${resourceType}`);
  return response.data;
};

/**
 * Geliştirici ortamında kota düşürmeyi simüle eder.
 * @param {string} resourceType - Kotası düşülecek kaynak türü.
 * @returns {Promise<Object>} Simülasyon sonucu.
 */
export const simulateDeductQuota = async (resourceType) => {
  // Sadece resourceType string olarak gönderiliyor (API [FromBody] string bekliyor)
  const response = await apiClient.post('/quota/simulate-deduct', `"${resourceType}"`, {
    headers: {
      'Content-Type': 'application/json'
    }
  });
  return response.data;
};

/**
 * Ödüllü reklam izlendiğinde kota hakkı kazanmayı simüle eder.
 * @param {string} resourceType - Hak kazanılacak kaynak türü.
 * @param {string} adToken - Reklam doğrulama jetonu (DEV_TEST_TOKEN)
 * @returns {Promise<Object>} Ödül sonucu.
 */
export const grantReward = async (resourceType, adToken) => {
  const response = await apiClient.post('/quota/reward', {
    resourceType,
    adToken
  });
  return response.data;
};
