import { create } from 'zustand';

export const useAuthStore = create((set) => ({
  user: null, // { id, email, role, fullName, avatarUrl }
  accessToken: null, // Yalnızca memory'de tutulur, XSS koruması için localStorage'a yazılmaz.
  viewAs: null, // { role: 'Student' | 'Teacher' | 'Parent', id: string, name: string } | null

  setAuth: (user, accessToken) => set({ user, accessToken }),
  setAccessToken: (accessToken) => set({ accessToken }),
  setViewAs: (viewAs) => set({ viewAs }),
  clearAuth: () => set({ user: null, accessToken: null, viewAs: null }),
}));
