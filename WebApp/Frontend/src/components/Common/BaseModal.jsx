import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useDragControls } from 'framer-motion';
import { createPortal } from 'react-dom';
import { CloseIcon } from './Icons';
import styles from './BaseModal.module.css';

const BaseModal = ({ 
  isOpen, 
  onClose, 
  title, 
  subtitle, 
  footer, 
  children, 
  maxWidth = '500px',
  preventClose = false,
  className = ''
}) => {
  const dragControls = useDragControls();
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsClosing(false);
    }
  }, [isOpen]);
  // ── Capacitor Native Back Button (Sadece Android cihazlar için) ─────────────
  useEffect(() => {
    if (!isOpen) return;
    
    let capListener = null;
    const setupCap = async () => {
      try {
        const { App } = await import('@capacitor/app');
        capListener = await App.addListener('backButton', () => {
          if (!preventClose) {
            onClose();
          }
        });
      } catch (_) { /* Web'de veya Capacitor yüklü değilse yoksay */ }
    };
    
    setupCap();

    return () => {
      if (capListener && capListener.remove) {
        capListener.remove();
      }
    };
  }, [isOpen, preventClose, onClose]);

  // ── Sürükleme (Framer Motion) ───────────────────────────────
  const handleDragEnd = (event, info) => {
    if (preventClose) return;
    
    if (info.offset.y > 100 || info.velocity.y > 400) {
      setIsClosing(true);
      setTimeout(() => {
        onClose();
      }, 250);
    }
  };

  const startDrag = (event) => {
    if (!preventClose) {
      dragControls.start(event);
    }
  };

  const modalContent = (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          className={styles.modalOverlay}
          onClick={!preventClose ? onClose : undefined}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
        >
          <motion.div 
            className={`${styles.modalContent} ${className}`}
            style={{ maxWidth }}
            onClick={(e) => e.stopPropagation()}
            
            // Animasyonlar
            initial={{ y: '100%' }}
            animate={{ y: isClosing ? '100%' : 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', bounce: 0, duration: 0.35 }}
            
            // Yalnızca Y ekseninde sürüklemeye izin ver
            drag={!preventClose ? "y" : false}
            // Tüm gövdeden sürüklemeyi Kapat (Scroll çakışmasını engeller!)
            dragListener={false}
            // Kendi drag controller'ımızı veriyoruz
            dragControls={dragControls}
            // Sadece yukarı doğru sürüklemeyi engelle (top: 0). 
            // Aşağısını (bottom) serbest bırakıyoruz ki framer-motion kendi kendine sekip state'i bozmasın.
            dragConstraints={{ top: 0 }}
            dragElastic={{ top: 0, bottom: 0.5 }}
            onDragEnd={handleDragEnd}
          >
            {/* Sürükleme Tutamağı (Drag Handle) */}
            <div 
              className={styles.dragHandleContainer}
              onPointerDown={startDrag}
              style={{ touchAction: 'none' }}
            >
              <div className={styles.dragPill} />
            </div>

            {title && (
              <div 
                className={styles.header}
                onPointerDown={startDrag} // Başlığa tıklayıp da sürükleyebilsin
              >
                <div className={styles.headerText}>
                  <h3 className={styles.title}>{title}</h3>
                  {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
                </div>
                {!preventClose && (
                  <button 
                    type="button" 
                    className={styles.closeBtn} 
                    onClick={onClose}
                    aria-label="Close"
                  >
                    <CloseIcon size={18} />
                  </button>
                )}
              </div>
            )}
            
            <div className={styles.body}>
              {children}
            </div>

            {footer && (
              <div className={styles.footer}>
                {footer}
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
};

export default BaseModal;
