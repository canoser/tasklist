import { useEffect } from 'react';

/**
 * useKeyboardScrollFix.js
 * 
 * Mobil cihazlarda sanal klavye (ekran klavyesi) açıldığında,
 * odaklanılan input/textarea elemanının klavyenin altında kalmasını önlemek için
 * elemanı otomatik olarak ekranın ortasına (görünür alana) kaydırır.
 * 
 * Tüm uygulamada geçerli olması için App.jsx'te çağrılması yeterlidir.
 */
export const useKeyboardScrollFix = () => {
  useEffect(() => {
    const handleFocus = (e) => {
      const target = e.target;
      
      // Sadece veri girişi yapılan elemanları dinle
      if (
        target.tagName === 'INPUT' || 
        target.tagName === 'TEXTAREA' || 
        target.isContentEditable
      ) {
        // Mobil klavyenin ekranı daraltma (açılma) animasyonuna zaman tanımak için 
        // ufak bir gecikme ekliyoruz (genelde 300ms yeterlidir).
        setTimeout(() => {
          target.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'center' // Elemanı ekranın tam ortasına hizala
          });
        }, 300);
      }
    };

    // 'focus' eventi bubble(yukarı sekme) yapmaz, bu yüzden 'focusin' kullanıyoruz.
    document.addEventListener('focusin', handleFocus);
    
    return () => {
      document.removeEventListener('focusin', handleFocus);
    };
  }, []);
};
