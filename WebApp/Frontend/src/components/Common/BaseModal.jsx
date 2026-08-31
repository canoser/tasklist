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
  className = '',
  keepMounted = false
}) => {
  const dragControls = useDragControls();
  const [isClosing, setIsClosing] = useState(false);

  // ==============================================================================================
  // 🔴 KRİTİK UYARI (DOKUNMAYIN) - MİMARİ KARAR (31 AĞUSTOS 2026)
  // ==============================================================================================
  // SORUN: Modal kapanırken (özellikle drag veya X tuşuyla) onClose anında tetiklenirse,
  // Global DOM (App.jsx) anında re-render edilir. Bu ağır işlem Framer Motion'ın 60fps çalışan
  // "closed" animasyonunu bloke ederek stuttering'e (kasmaya ve takılmaya) neden olur.
  // ÇÖZÜM: Kapanışta isClosing(true) yapılıp, animasyonun akıp bitmesi için 300ms BEKLENMELİDİR.
  // 
  // BUG: Eğer isClosing sadece isOpen(true) olduğunda false'a çekilirse, "Çift Tıklama" bug'ı olur.
  // Çünkü ilk açılış render'ında eski isClosing (true) kalır, modal kapalı gibi davranır.
  // NİHAİ ÇÖZÜM: isClosing SADECE modal tam kapandıktan sonra (!isOpen) sıfırlanmalıdır. 
  // LÜTFEN BU useEffect VE handleDelayedClose MANTIĞINI DEĞİŞTİRMEYİN!
  // ==============================================================================================
  useEffect(() => {
    if (!isOpen) {
      setIsClosing(false);
    }
  }, [isOpen]);

  const handleDelayedClose = () => {
    if (preventClose || isClosing) return;
    
    if (keepMounted) {
      setIsClosing(true);
      setTimeout(() => {
        onClose();
      }, 300); // Framer motion duration: 0.35 civarı. 300-350ms arası güvenlidir.
    } else {
      onClose();
    }
  };
  // ==============================================================================================

  // ── Sürükleme (Framer Motion) ───────────────────────────────
  const handleDragEnd = (event, info) => {
    if (preventClose || isClosing) return;
    
    if (info.offset.y > 100 || info.velocity.y > 400) {
      handleDelayedClose();
    }
  };

  const startDrag = (event) => {
    if (!preventClose) {
      dragControls.start(event);
    }
  };

  const contentInner = (
    <>
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
          onPointerDown={startDrag}
        >
          <div className={styles.headerText}>
            <h3 className={styles.title}>{title}</h3>
            {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
          </div>
          {!preventClose && (
            <button 
              type="button" 
              className={styles.closeBtn} 
              onClick={handleDelayedClose}
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
    </>
  );

  const modalContent = keepMounted ? (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            className={styles.modalOverlay}
            onClick={!preventClose ? handleDelayedClose : undefined}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
          />
        )}
      </AnimatePresence>

      <motion.div 
        className={`${styles.modalContent} ${className}`}
        style={{ maxWidth, position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', zIndex: 3001, width: '100%' }}
        onClick={(e) => e.stopPropagation()}
        
        // Animasyonlar (Varyant tabanlı DOM caching)
        initial="closed"
        animate={isOpen ? (isClosing ? "closed" : "open") : "closed"}
        variants={{
          open: { y: 0, x: '-50%', visibility: 'visible', pointerEvents: 'auto' },
          closed: { y: '100%', x: '-50%', pointerEvents: 'none', transitionEnd: { visibility: 'hidden' } }
        }}
        transition={{ type: 'spring', bounce: 0, duration: 0.35 }}
        
        // Sürükleme Ayarları
        drag={!preventClose && isOpen ? "y" : false}
        dragListener={false}
        dragControls={dragControls}
        dragConstraints={{ top: 0 }}
        dragElastic={{ top: 0, bottom: 0.5 }}
        onDragEnd={handleDragEnd}
        
        // Accessibility ve Focus Trap önlemi
        inert={!isOpen ? "true" : undefined}
      >
        {contentInner}
      </motion.div>
    </>
  ) : (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          className={styles.modalOverlay}
          onClick={!preventClose ? handleDelayedClose : undefined}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
        >
          <motion.div 
            className={`${styles.modalContent} ${className}`}
            style={{ maxWidth }}
            onClick={(e) => e.stopPropagation()}
            
            initial={{ y: '100%' }}
            animate={{ y: isClosing ? '100%' : 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', bounce: 0, duration: 0.35 }}
            
            drag={!preventClose ? "y" : false}
            dragListener={false}
            dragControls={dragControls}
            dragConstraints={{ top: 0 }}
            dragElastic={{ top: 0, bottom: 0.5 }}
            onDragEnd={handleDragEnd}
          >
            {contentInner}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
};

export default BaseModal;
