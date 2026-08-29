import storage from '../utils/storage';
import { toast } from 'react-hot-toast';

const PERMISSION_ASKED_KEY = 'notification_permission_asked';
const PERMISSION_GRANTED_KEY = 'notification_permission_granted';

export const notificationService = {
  /**
   * Check if we have already asked the user for notification permissions (Soft-prompt)
   */
  hasAskedPermission: () => {
    return storage.getString(PERMISSION_ASKED_KEY) === 'true';
  },

  /**
   * Mark that we've asked the user for permission
   */
  markPermissionAsked: () => {
    storage.setString(PERMISSION_ASKED_KEY, 'true');
  },

  /**
   * Check if we currently have the permission
   */
  hasPermission: () => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      return Notification.permission === 'granted';
    }
    return storage.getString(PERMISSION_GRANTED_KEY) === 'true';
  },

  /**
   * Request system permission (After user says "Yes" to soft-prompt)
   */
  requestPermission: async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return false; // Not supported
    }

    try {
      const permission = await Notification.requestPermission();
      const granted = permission === 'granted';
      storage.setString(PERMISSION_GRANTED_KEY, granted ? 'true' : 'false');
      return granted;
    } catch (e) {
      console.error('Error requesting notification permission:', e);
      return false;
    }
  },

  /**
   * Show a notification using the Fallback Chain:
   * 1. Native LocalNotifications (Capacitor - To be implemented)
   * 2. Web API Notifications (If granted)
   * 3. In-App Toast (Fallback)
   */
  showNotification: (title, body) => {
    // [MOBILE_PORT_TODO]: Add @capacitor/local-notifications logic here if native platform

    // Web Fallback
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification(title, {
          body,
          icon: '/favicon.svg' // Ensure this exists
        });
        return;
      } catch (e) {
        console.warn('Web Notification failed, falling back to toast', e);
      }
    }

    // In-App Toast Fallback
    toast.success(`${title}\n${body}`, {
      duration: 5000,
      position: 'top-right',
      style: {
        background: '#333',
        color: '#fff',
        padding: '16px',
        borderRadius: '10px'
      }
    });
  }
};

export default notificationService;
