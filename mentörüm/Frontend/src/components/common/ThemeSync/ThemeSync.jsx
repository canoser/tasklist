import { useEffect } from 'react';
import { useAuthStore } from '../../../features/auth/authStore';
import { useUIStore } from '../../../store/uiStore';
import { apiClient } from '../../../api/apiClient';

// Kullanıcının temasını girişte yükler, tema değişince sunucuya kaydeder.
// "Gözüyle Gör" aktifken GET /me, X-View-As header'ı sayesinde hedef kullanıcının temasını döndürür.
export default function ThemeSync() {
  const { user, viewAs } = useAuthStore();
  const { themeMode, themeStyle } = useUIStore();

  useEffect(() => {
    if (!user) return;
    apiClient.get('/me').then((me) => {
      if (me?.themeStyle) useUIStore.getState().setThemeStyle(me.themeStyle);
      if (me?.themeMode) useUIStore.getState().setThemeMode(me.themeMode);
    }).catch(() => {});
  }, [user, viewAs]);

  useEffect(() => {
    if (!user) return;
    const t = setTimeout(() => {
      apiClient.put('/me/theme', { themeMode, themeStyle }).catch(() => {});
    }, 500);
    return () => clearTimeout(t);
  }, [themeMode, themeStyle, user]);

  return null;
}
