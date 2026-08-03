import apiClient from './apiClient';

/**
 * AI Komut Planı oluşturur. (Kota düşülmez)
 * @param {number} workspaceId - Çalışma alanı kimliği
 * @param {string} prompt - Kullanıcının yazdığı tam komut (chainLength ve questionCount dahil)
 * @returns {Promise<Object>} - AiPlanResponse objesi (Message, ToolCalls)
 */
export const generatePlan = async (workspaceId, prompt) => {
  const payload = {
    prompt,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    today: new Date().toISOString(),
  };

  const response = await apiClient.post(`/api/ai/command-plan?workspaceId=${workspaceId}`, payload);
  return response.data;
};

/**
 * AI Komut Planını çalıştırır. (Kota düşülür, Idempotency-Key kullanılır)
 * @param {number} workspaceId - Çalışma alanı kimliği
 * @param {Object} plan - Seçilen/onaylanan ToolCall'ları içeren plan objesi
 * @param {boolean} executeAll - Tümünün onaylanıp onaylanmadığı
 * @param {number} chainLength - Uygulanacak zincir uzunluğu
 * @param {number} questionCount - Soru sayısı
 * @returns {Promise<Object>} - Başarı durumu
 */
export const executePlan = async (workspaceId, plan, executeAll, chainLength, questionCount) => {
  const payload = {
    workspaceId,
    plan,
    executeAll,
    chainLength,
    questionCount
  };

  // apiClient.js'deki Idempotency interceptor'ı sayesinde
  // PUT ve POST metodlarında Idempotency-Key otomatik olarak oluşturulup eklenecektir.
  // // [MOBILE_PORT_TODO]: Native uygulamada (Capacitor), apiClient.js içindeki Idempotency-Key 
  // üretiminin SecureStorage veya AsyncStorage ile çakışmadığından, offline durumlarda 
  // (Offline Sync) request'in offline_queue'ye eklenip eklenmeyeceğinden emin olun.
  const response = await apiClient.post('/api/ai/command-execute', payload);
  return response.data;
};
