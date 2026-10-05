/**
 * Platform utilities for Web and Capacitor compatibility.
 * When Capacitor is installed in Phase 25, this will handle native APIs.
 * Currently falls back to standard Web API to avoid crashes.
 */
import { Capacitor } from '@capacitor/core';

export const Platform = {
    // Capacitor ile native tespiti (web'de false döner)
    isNative: Capacitor.isNativePlatform(),
    
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
