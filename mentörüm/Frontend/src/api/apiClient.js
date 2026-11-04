import axios from 'axios';
import { useAuthStore } from '../features/auth/authStore';

// Environment variable üzerinden API URL alınır
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5130/api/v1';

export const apiClient = axios.create({
  baseURL: API_URL,
  timeout: 15000, // E4: 15s istek zaman aşımı
  headers: {
    'Content-Type': 'application/json',
  },
  // httpOnly cookie'leri gönderip alabilmek için
  withCredentials: true, 
});

// Request Interceptor: Access token'ı ekle
apiClient.interceptors.request.use(
  (config) => {
    const state = useAuthStore.getState();
    const accessToken = state.accessToken;
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }

    const viewAs = state.viewAs;
    if (viewAs && viewAs.id) {
      if (viewAs.role === 'Student') {
        config.headers['X-View-As-Student-Id'] = viewAs.id;
      } else if (viewAs.role === 'Teacher') {
        config.headers['X-View-As-Teacher-Id'] = viewAs.id;
      } else if (viewAs.role === 'Parent') {
        config.headers['X-View-As-Parent-Id'] = viewAs.id;
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response Interceptor: Hata yönetimi ve 401 Refresh (Single-Flight)
let refreshPromise = null;

export const refreshAccessToken = () => {
  if (!refreshPromise) {
    refreshPromise = axios
      .post(`${API_URL}/auth/refresh`, {}, { withCredentials: true })
      .then((refreshResponse) => {
        const data = refreshResponse.data?.data || refreshResponse.data;
        const newAccessToken = data?.accessToken;
        if (data?.user && newAccessToken) {
          useAuthStore.getState().setAuth(data.user, newAccessToken);
        } else if (newAccessToken) {
          useAuthStore.getState().setAccessToken(newAccessToken);
        }
        if (newAccessToken) {
          apiClient.defaults.headers.common['Authorization'] = `Bearer ${newAccessToken}`;
        }
        return data;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
};

apiClient.interceptors.response.use(
  (response) => {
    // Başarılı yanıttan sadece veriyi dön
    return response.data;
  },
  async (error) => {
    const originalRequest = error.config;

    // E4: Zaman aşımı kontrolü
    if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
      error.userMessage = 'İstek zaman aşımına uğradı. Lütfen bağlantınızı kontrol edin.';
    }

    const requestUrl = originalRequest?.url || '';
    const isAuthEndpoint =
      requestUrl.includes('/auth/refresh') ||
      requestUrl.includes('/auth/login') ||
      requestUrl.includes('/auth/register');

    // 401 Unauthorized ve istek henüz tekrar denenmemişse (ve auth endpoint değilse)
    if (error.response?.status === 401 && originalRequest && !originalRequest._retry && !isAuthEndpoint) {
      originalRequest._retry = true;

      try {
        const data = await refreshAccessToken();
        const newAccessToken = data?.accessToken;
        originalRequest.headers['Authorization'] = `Bearer ${newAccessToken}`;
        return apiClient(originalRequest);
      } catch (err) {
        // Refresh başarısız olduysa çıkış yap
        useAuthStore.getState().clearAuth();
        return Promise.reject(err);
      }
    }

    return Promise.reject(error);
  }
);
