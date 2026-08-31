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
  const [localIsOpen, setLocalIsOpen] = useState(isOpen);

  useEffect(() => {
    // Dışarıdan (App.jsx) gelen isOpen prop'u değiştiğinde local state'i güncelle.
    if (isOpen) {
      setLocalIsOpen(true);
    } else {
      setLocalIsOpen(false);
    }
  }, [isOpen]);

  const handleDelayedClose = () => {
    if (preventClose || !localIsOpen) return;
    
    // 1. Önce görsel olarak (local state ile) pencereyi kapat
    setLocalIsOpen(false);
    
    // 2. Animasyonun akıp bitmesi için 300ms bekle ve sonra global state'i (URL'i) güncelle
    // (Bunu keepMounted olsun veya olmasın her zaman yapıyoruz ki ağır render işlemleri animasyonu dondurmasın)
    setTimeout(() => {
      onClose();
    }, 300);
  };

  // ── Sürükleme (Framer Motion) ───────────────────────────────
  const handleDragEnd = (event, info) => {
    if (preventClose || !localIsOpen) return;
    
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
        {localIsOpen && (
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
        animate={localIsOpen ? "open" : "closed"}
        variants={{
          open: { y: 0, x: '-50%', visibility: 'visible', pointerEvents: 'auto' },
          closed: { y: '100%', x: '-50%', pointerEvents: 'none' }
        }}
        transition={{ type: 'spring', bounce: 0, duration: 0.35 }}
        
        // Sürükleme Ayarları
        drag={!preventClose && localIsOpen ? "y" : false}
        dragListener={false}
        dragControls={dragControls}
        dragConstraints={{ top: 0 }}
        dragElastic={{ top: 0, bottom: 0.5 }}
        onDragEnd={handleDragEnd}
        
        // Accessibility ve Focus Trap önlemi
        inert={!localIsOpen ? "true" : undefined}
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
          animate={{ opacity: localIsOpen ? 1 : 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
        >
          <motion.div 
            className={`${styles.modalContent} ${className}`}
            style={{ maxWidth }}
            onClick={(e) => e.stopPropagation()}
            
            initial={{ y: '100%' }}
            animate={{ y: !localIsOpen ? '100%' : 0 }}
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
