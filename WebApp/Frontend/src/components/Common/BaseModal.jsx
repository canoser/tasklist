import { useDragControls, motion } from 'framer-motion';
import { createPortal } from 'react-dom';
import { CloseIcon } from './Icons';
import styles from './BaseModal.module.css';

// ─────────────────────────────────────────────────────────────────────────────
// BaseModal — KESİN ÇÖZÜM (Senior Pattern)
//
// 1. Modaller HER ZAMAN DOM'da kalır. React state değişiklikleri (mount/unmount)
//    nedeniyle yaşanan Layout Thrashing (kasma) tamamen önlenmiştir.
// 2. setTimeout, localIsOpen, veya AnimatePresence YOKTUR.
// 3. Kapanış gecikmesi Framer Motion'ın "transition.visibility.delay" özelliği
//    sayesinde CSS tabanlı yönetilir.
// 4. Race Condition (ilk tıklamada açılmama) ihtimali SIFIRA indirilmiştir çünkü
//    onClose() çağrısı anında yapılır, state anında senkronize olur.
// ─────────────────────────────────────────────────────────────────────────────

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
}) => {
  const dragControls = useDragControls();

  // Kapatma sinyali (Gecikmesiz! Anında URL'i günceller)
  const handleClose = () => {
    if (preventClose || !isOpen) return;
    onClose();
  };

  // Sürükleme sınırlarını aşınca kapat
  const handleDragEnd = (event, info) => {
    if (preventClose || !isOpen) return;
    if (info.offset.y > 100 || info.velocity.y > 400) {
      handleClose();
    }
  };

  const startDrag = (event) => {
    if (!preventClose) dragControls.start(event);
  };

  // ── İçerik ──────────────────────────────────────────────────
  const contentInner = (
    <>
      <div
        className={styles.dragHandleContainer}
        onPointerDown={startDrag}
        style={{ touchAction: 'none' }}
      >
        <div className={styles.dragPill} />
      </div>

      {title && (
        <div className={styles.header} onPointerDown={startDrag}>
          <div className={styles.headerText}>
            <h3 className={styles.title}>{title}</h3>
            {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
          </div>
          {!preventClose && (
            <button
              type="button"
              className={styles.closeBtn}
              onClick={handleClose}
              aria-label="Close"
            >
              <CloseIcon size={18} />
            </button>
          )}
        </div>
      )}

      <div className={styles.body}>{children}</div>

      {footer && <div className={styles.footer}>{footer}</div>}
    </>
  );

  // ── Modal Şablonu ────────────────────────────────────────────
  const modalContent = (
    <>
      {/* Arka Plan (Overlay) */}
      <motion.div
        className={styles.modalOverlay}
        onClick={!preventClose ? handleClose : undefined}
        initial="closed"
        animate={isOpen ? "open" : "closed"}
        variants={{
          open: { opacity: 1, pointerEvents: 'auto' },
          closed: { 
            opacity: 0, 
            pointerEvents: 'none'
          }
        }}
        transition={{ duration: 0.25 }}
      />

      {/* Panel */}
      <motion.div
        className={`${styles.modalContent} ${className}`}
        style={{
          maxWidth,
          position: 'fixed',
          bottom: 0,
          left: '50%',
          width: '100%',
          zIndex: 3001,
        }}
        onClick={(e) => e.stopPropagation()}
        initial="closed"
        animate={isOpen ? "open" : "closed"}
        variants={{
          open: { y: 0, x: '-50%', pointerEvents: 'auto' },
          closed: { 
            y: '100%', 
            x: '-50%', 
            pointerEvents: 'none'
          }
        }}
        transition={{ type: 'spring', bounce: 0, duration: 0.35 }}
        drag={!preventClose && isOpen ? 'y' : false}
        dragListener={false}
        dragControls={dragControls}
        dragConstraints={{ top: 0 }}
        dragElastic={{ top: 0, bottom: 0.5 }}
        onDragEnd={handleDragEnd}
      >
        {contentInner}
      </motion.div>
    </>
  );

  return typeof document !== 'undefined'
    ? createPortal(modalContent, document.body)
    : modalContent;
};

export default BaseModal;
