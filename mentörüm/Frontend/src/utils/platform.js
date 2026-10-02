/**
 * Platform utilities for Web and Capacitor compatibility.
 * When Capacitor is installed in Phase 25, this will handle native APIs.
 * Currently falls back to standard Web API to avoid crashes.
 */

export const Platform = {
    // Gelecekte Capacitor ile check edilecek (e.g., Capacitor.isNativePlatform())
    isNative: false,
    
    // Güvenli Storage Wrapper'ı
    storage: {
        setItem: async (key, value) => {
            // İleride Capacitor Preferences API ile değiştirilecek
            localStorage.setItem(key, value);
        },
        getItem: async (key) => {
            // İleride Capacitor Preferences API ile değiştirilecek
            return localStorage.getItem(key);
        },
        removeItem: async (key) => {
            // İleride Capacitor Preferences API ile değiştirilecek
            localStorage.removeItem(key);
        }
    }
};
