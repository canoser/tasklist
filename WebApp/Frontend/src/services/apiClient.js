import axios from 'axios';
import { auth } from '../config/firebase';

// Native apps require an absolute URL. Dev mode can use localhost or specific IP via .env
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  // [MOBILE_PORT_TODO]: Mobil uygulamada (Capacitor/React Native) Cookie tabanlı auth çalışmayacaktır.
  // withCredentials: true satırını kaldırıp, bunun yerine Authorization: Bearer <token> header'ı eklemeniz gerekecek.
  withCredentials: true, // ZORUNLU KURAL: HttpOnly çerezlerin backend'e gönderilmesi için
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Request Interceptor:
 * 1. Kritik POST ve PUT isteklerinde benzersiz bir UUID (Idempotency-Key) üretip Header'a koyar.
 * Not: JWT artık Cookie üzerinden taşındığı için Bearer token eklenmez (Sıfır Güven & XSS koruması).
 * // [MOBILE_PORT_TODO]: Mobil uygulamada buraya cihazdaki güvenli depolamadan (Secure Storage) 
 * // okunan JWT token'ını Authorization header olarak ekleyen kod parçasını dahil etmeniz gerekir.
 */
apiClient.interceptors.request.use(
  async (config) => {
    // Otomatik Idempotency-Key Üretimi
    const method = config.method ? config.method.toUpperCase() : '';
    if ((method === 'POST' || method === 'PUT' || method === 'PATCH') && !config.headers['Idempotency-Key']) {
      // Tarayıcı destekli standart crypto.randomUUID()
      const idempotencyKey = typeof crypto !== 'undefined' && crypto.randomUUID 
        ? crypto.randomUUID() 
        : `idempotency-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
        
      config.headers['Idempotency-Key'] = idempotencyKey;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

/**
 * Response Interceptor:
 * Hata durumlarını (409 Conflict - Idempotency, 429 Rate Limit, 401 Auth) dinler.
 */
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      if (error.response.status === 409) {
        console.warn('Mükerrer İstek Engellendi (Idempotency Filter):', error.response.data);
      } else if (error.response.status === 429) {
        console.warn('Hız Sınırı Aşıldı (Rate Limiting):', error.response.data);
      } else if (error.response.status === 401) {
        console.warn('Yetkisiz Erişim (Unauthorized)');
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;
