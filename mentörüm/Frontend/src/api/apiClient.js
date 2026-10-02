import axios from 'axios';
import { useAuthStore } from '../features/auth/authStore';

// Environment variable üzerinden API URL alınır
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';

export const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  // httpOnly cookie'leri gönderip alabilmek için
  withCredentials: true, 
});

// Request Interceptor: Access token'ı ekle
apiClient.interceptors.request.use(
  (config) => {
    const accessToken = useAuthStore.getState().accessToken;
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response Interceptor: Hata yönetimi ve 401 Refresh
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

apiClient.interceptors.response.use(
  (response) => {
    // Başarılı yanıttan sadece veriyi dön
    return response.data;
  },
  async (error) => {
    const originalRequest = error.config;

    // 401 Unauthorized ve istek henüz tekrar denenmemişse
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // Eğer zaten refresh yapılıyorsa, kuyruğa ekle
        return new Promise(function (resolve, reject) {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers['Authorization'] = 'Bearer ' + token;
            return apiClient(originalRequest);
          })
          .catch((err) => {
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // Refresh token endpointine istek atılır (Cookie otomatik gider)
        const refreshResponse = await axios.post(
          `${API_URL}/auth/refresh`,
          {},
          { withCredentials: true }
        );

        const newAccessToken = refreshResponse.data?.data?.accessToken || refreshResponse.data?.accessToken;
        
        // Yeni token'ı store'a kaydet
        useAuthStore.getState().setAccessToken(newAccessToken);
        
        // Axios instance default header'ını güncelle
        apiClient.defaults.headers.common['Authorization'] = `Bearer ${newAccessToken}`;
        
        // Asıl isteğin header'ını güncelle
        originalRequest.headers['Authorization'] = `Bearer ${newAccessToken}`;
        
        processQueue(null, newAccessToken);
        return apiClient(originalRequest);
      } catch (err) {
        processQueue(err, null);
        // Refresh başarısız olduysa çıkış yap
        useAuthStore.getState().clearAuth();
        return Promise.reject(err);
      } finally {
        isRefreshing = false;
      }
    }

    // 403 Forbidden (Resimler vb. için Cloudflare R2 Presigned url yenileme ileride buraya eklenebilir)

    return Promise.reject(error);
  }
);
