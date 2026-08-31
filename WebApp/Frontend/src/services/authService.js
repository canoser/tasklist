import apiClient from "./apiClient";

let currentUser = null;
const authListeners = new Set();

const notifyListeners = (user) => {
  currentUser = user;
  authListeners.forEach(cb => cb(user));
};

export const checkAuthStatus = async () => {
  try {
    const response = await apiClient.get('/auth/me');
    notifyListeners(response.data);
    return response.data;
  } catch (error) {
    notifyListeners(null);
    return null;
  }
};

export const loginWithGoogle = async (credential) => {
  try {
    // [MOBILE_PORT_TODO]: Mobil uygulamalarda (Capacitor) Native Google Sign-In eklentisi (örn. @capacitor-community/google-sign-in)
    // kullanarak cihazın yerel OAuth akışı çağrılmalı ve alınan ID Token buraya iletilmelidir.
    if (!credential) {
      return { user: null, error: 'Google kimlik doğrulama tokenı alınamadı.' };
    }
    
    // ZORUNLU KURAL: Zero-Trust gereği Google ID Token C# Backend'e iletilir
    const response = await apiClient.post('/auth/google', { idToken: credential });
    
    if (response.data.token) {
      localStorage.setItem('auth_token', response.data.token);
    }
    
    notifyListeners(response.data.user);
    return { user: response.data.user, error: null };
  } catch (error) {
    console.warn("Google login failed:", error);
    const errorMsg = error.response?.data?.message || error.response?.data || error.message || 'Google ile giriş başarısız.';
    return { user: null, error: errorMsg };
  }
};

export const loginWithEmail = async (email, password) => {
  try {
    const response = await apiClient.post('/auth/login', { email, password });
    
    if (response.data.token) {
      // [MOBILE_PORT_TODO]: In native apps, use Secure Storage (e.g. Capacitor Preferences or iOS Keychain) instead of localStorage for tokens.
      localStorage.setItem('auth_token', response.data.token);
    }
    
    notifyListeners(response.data.user);
    return { user: response.data.user, error: null };
  } catch (error) {
    console.warn("Email login failed:", error);
    // Account enumeration protection: Hata detayı backend'den jenerik gelir
    const errorMsg = error.response?.data?.message || error.response?.data || 'Giriş başarısız.';
    return { user: null, error: errorMsg };
  }
};

export const registerWithEmail = async (email, password, name = '') => {
  try {
    const response = await apiClient.post('/auth/register', { email, password, name });
    
    if (response.data.token) {
      localStorage.setItem('auth_token', response.data.token);
    }
    
    notifyListeners(response.data.user);
    return { user: response.data.user, error: null };
  } catch (error) {
    console.warn("Register failed:", error);
    const errorMsg = error.response?.data?.message || error.response?.data || 'Kayıt başarısız.';
    return { user: null, error: errorMsg };
  }
};

export const logoutUser = async () => {
  try {
    await apiClient.post('/auth/logout');
  } catch (error) {
    console.warn("Logout failed:", error);
  }
  
  // Cookie yerine LocalStorage temizliği
  localStorage.removeItem('auth_token');
  
  notifyListeners(null);
  
  // Tam sayfa yenilemesi ile React state'ini bellekten tamamen temizle
  window.location.href = '/';
  
  return { error: null };
};

export const subscribeToAuthChanges = (callback) => {
  authListeners.add(callback);
  // İlk bağlantıda Auth durumunu backend'den kontrol et (HttpOnly Cookie ile)
  checkAuthStatus().then(user => callback(user));
  
  return () => {
    authListeners.delete(callback);
  };
};
