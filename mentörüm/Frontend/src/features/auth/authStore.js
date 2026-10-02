import { create } from 'zustand';

export const useAuthStore = create((set) => ({
  user: null, // { id, email, role, fullName, avatarUrl }
  accessToken: null, // Yalnızca memory'de tutulur, XSS koruması için localStorage'a yazılmaz.

  setAuth: (user, accessToken) => set({ user, accessToken }),
  
  setAccessToken: (accessToken) => set({ accessToken }),
  
  clearAuth: () => set({ user: null, accessToken: null }),
}));
