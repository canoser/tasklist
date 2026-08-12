import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Dev proxy hedefi: VITE_API_TARGET veya localhost
  const apiTarget = process.env.VITE_API_TARGET || 'http://localhost:5268';

  return {
  server: {
    host: '0.0.0.0',
    port: 5173,
    proxy: {
      // [MOBILE_PORT_TODO]: Capacitor (Native iOS/Android) build'lerinde Vite Proxy ÇALIŞMAZ!
      // Native uygulamalar doğrudan mutlak URL'ye (Örn: https://api.site.com) istek atmalıdır.
      // Geliştirme ortamında (Web) tüm /api isteklerini backend'e yönlendir.
      // Böylece cookie same-origin olur, SameSite=Lax sorunsuz çalışır.
      '/api': {
        target: apiTarget,
        changeOrigin: true,
        secure: false,
      }
    }
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      devOptions: {
        enabled: true
      },
      manifest: {
        name: 'Planlama App',
        short_name: 'Planlama',
        description: 'Görev ve planlama yönetimi uygulaması',
        theme_color: '#0f172a',
        background_color: '#0f172a',
        display: 'standalone',
        icons: [
          {
            src: '/favicon.svg',
            sizes: '192x192',
            type: 'image/svg+xml'
          },
          {
            src: '/favicon.svg',
            sizes: '512x512',
            type: 'image/svg+xml'
          },
          {
            src: '/favicon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any maskable'
          }
        ]
      }
    })
  ],
  };
});
