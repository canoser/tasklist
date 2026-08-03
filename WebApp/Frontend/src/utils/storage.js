/**
 * storage.js
 * A wrapper for client-side storage.
 * In a pure web environment, this uses localStorage.
 * // [MOBILE_PORT_TODO]: For a native Capacitor app, localStorage is unreliable on iOS.
 * // Swap this implementation to use @capacitor/preferences or @capacitor-community/sqlite.
 */

export const storage = {
  get: (key) => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : null;
    } catch (e) {
      console.error('Storage get error:', e);
      return null;
    }
  },
  set: (key, value) => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.error('Storage set error:', e);
    }
  },
  remove: (key) => {
    try {
      localStorage.removeItem(key);
    } catch (e) {
      console.error('Storage remove error:', e);
    }
  },
  getString: (key) => {
    try {
      return localStorage.getItem(key);
    } catch (e) {
      console.error('Storage getString error:', e);
      return null;
    }
  },
  setString: (key, value) => {
    try {
      localStorage.setItem(key, value);
    } catch (e) {
      console.error('Storage setString error:', e);
    }
  }
};

export default storage;
