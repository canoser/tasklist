import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

// Firebase Yapılandırması (Kendi projenizin env değişkenleri ile doldurulabilir)
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyDemoKeyForPlanningApp123456",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "planlamaapp-demo.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "planlamaapp-demo",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "planlamaapp-demo.appspot.com",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "1234567890",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:1234567890:web:demoapp123456"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
