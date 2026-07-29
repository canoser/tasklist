import { signInWithPopup, signOut } from "firebase/auth";
import { auth, googleProvider } from "../config/firebase";
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

export const loginWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const token = await result.user.getIdToken();
    
    // ZORUNLU KURAL: Zero-Trust gereği sadece ID Token backend'e iletilir
    const response = await apiClient.post('/auth/google', { idToken: token });
    notifyListeners(response.data.user);
    return { user: response.data.user, error: null };
  } catch (error) {
    console.warn("Google login failed:", error);
    return { user: null, error: error.response?.data || error.message };
  }
};

export const loginWithEmail = async (email, password) => {
  try {
    const response = await apiClient.post('/auth/login', { email, password });
    notifyListeners(response.data.user);
    return { user: response.data.user, error: null };
  } catch (error) {
    console.warn("Email login failed:", error);
    // Account enumeration protection: Hata detayı backend'den jenerik gelir
    return { user: null, error: error.response?.data || 'Giriş başarısız.' };
  }
};

export const registerWithEmail = async (email, password, name = '') => {
  try {
    const response = await apiClient.post('/auth/register', { email, password, name });
    notifyListeners(response.data.user);
    return { user: response.data.user, error: null };
  } catch (error) {
    console.warn("Register failed:", error);
    return { user: null, error: error.response?.data || 'Kayıt başarısız.' };
  }
};

export const logoutUser = async () => {
  try {
    await apiClient.post('/auth/logout');
    await signOut(auth); // Firebase oturumunu da temizle (istemci tarafında)
  } catch (error) {
    console.warn("Logout failed:", error);
  }
  notifyListeners(null);
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
