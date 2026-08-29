import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import notificationService from '../../services/notificationService';

const NotificationBanner = () => {
  const { t } = useTranslation('common');
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Show banner after 2 seconds if not asked yet
    const timer = setTimeout(() => {
      if (!notificationService.hasAskedPermission() && !notificationService.hasPermission()) {
        setIsVisible(true);
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  const handleAccept = async () => {
    notificationService.markPermissionAsked();
    setIsVisible(false);
    
    // Yalnızca tarayıcı ortamındaysak ve bildirim destekleniyorsa
    const granted = await notificationService.requestPermission();
    if (granted) {
      notificationService.showNotification("Harika!", "Görev hatırlatmalarınızı başarıyla açtınız.");
    }
  };

  const handleDismiss = () => {
    notificationService.markPermissionAsked();
    setIsVisible(false);
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div 
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -50 }}
          style={{
            position: 'fixed',
            top: '20px',
            left: '20px',
            right: '20px',
            maxWidth: '400px',
            margin: '0 auto',
            background: 'var(--color-surface, #1e1e2e)',
            borderRadius: '12px',
            padding: '16px',
            boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
            zIndex: 9999,
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            border: '1px solid var(--color-border, #333)'
          }}
        >
          <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
            <div style={{
              background: 'rgba(108, 92, 231, 0.2)',
              padding: '8px',
              borderRadius: '50%',
              color: 'var(--color-primary, #6c5ce7)'
            }}>
              <Bell size={20} />
            </div>
            <div style={{ flex: 1 }}>
              <h3 style={{ margin: '0 0 4px', fontSize: '15px', color: 'var(--color-text)' }}>
                Bildirimleri Açmak İster misin?
              </h3>
              <p style={{ margin: 0, fontSize: '13px', color: 'var(--color-text-light)', lineHeight: '1.4' }}>
                Görevlerini kaçırmaman ve serini devam ettirebilmen için sana ara sıra küçük hatırlatmalar yapabiliriz.
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            <button 
              onClick={handleDismiss}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--color-text-light)',
                padding: '6px 12px',
                fontSize: '13px',
                cursor: 'pointer',
                borderRadius: '6px'
              }}
            >
              Daha Sonra
            </button>
            <button 
              onClick={handleAccept}
              style={{
                background: 'var(--color-primary, #6c5ce7)',
                border: 'none',
                color: '#fff',
                padding: '6px 16px',
                fontSize: '13px',
                fontWeight: '600',
                cursor: 'pointer',
                borderRadius: '6px',
                boxShadow: '0 2px 5px rgba(108, 92, 231, 0.4)'
              }}
            >
              Evet, İsterim
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default NotificationBanner;
