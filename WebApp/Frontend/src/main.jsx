import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { GoogleOAuthProvider } from '@react-oauth/google'
import { GOOGLE_CLIENT_ID } from './config/googleAuth'

// PWA Service Worker Registration
import { registerSW } from 'virtual:pwa-register'
import { seedDummyTasks } from './seed'

const updateSW = registerSW({
  onNeedRefresh() {},
  onOfflineReady() {},
})

seedDummyTasks(); // Geçici görevleri yükle

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <App />
    </GoogleOAuthProvider>
  </StrictMode>,
)
