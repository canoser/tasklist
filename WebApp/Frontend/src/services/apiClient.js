import axios from 'axios';
import { auth } from '../config/firebase';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || `http://${window.location.hostname}:5000/api`;

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Request Interceptor:
 * 1. Firebase kullanıcısının JWT token'ını otomatik olarak Authorization Header'a ekler.
 * 2. Kritik POST ve PUT isteklerinde benzersiz bir UUID (Idempotency-Key) üretip Header'a koyar.
 */
apiClient.interceptors.request.use(
  async (config) => {
    // 1. JWT Bearer Token ekleme
    const currentUser = auth.currentUser;
    if (currentUser) {
      try {
        const token = await currentUser.getIdToken();
        config.headers.Authorization = `Bearer ${token}`;
      } catch (err) {
        console.error('Firebase token alınırken hata oluştu:', err);
      }
    }

    // 2. Otomatik Idempotency-Key Üretimi
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
