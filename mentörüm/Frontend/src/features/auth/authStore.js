import { create } from 'zustand';
import axios from 'axios';

export const useAuthStore = create((set) => ({
  user: null, // { id, email, role, fullName, avatarUrl }
  accessToken: null, // Yalnızca memory'de tutulur, XSS koruması için localStorage'a yazılmaz.
  viewAs: null, // { role: 'Student' | 'Teacher' | 'Parent', id: string, name: string } | null

  setAuth: (user, accessToken) => set({ user, accessToken }),
  setAccessToken: (accessToken) => set({ accessToken }),
  setViewAs: (viewAs) => set({ viewAs }),
  clearAuth: () => set({ user: null, accessToken: null, viewAs: null }),
  logoutUser: async (navigate) => {
    try {
      await axios.post(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1'}/auth/logout`,
        {},
        { withCredentials: true }
      );
    } catch {
      // Logout hataları oturum temizliğini engellemez
    }
    set({ user: null, accessToken: null, viewAs: null });
    if (navigate) navigate('/login');
  },
}));

