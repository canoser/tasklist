import { useState, useEffect } from 'react';
import { motion, AnimatePresence, useDragControls } from 'framer-motion';
import { createPortal } from 'react-dom';
import { CloseIcon } from './Icons';
import styles from './BaseModal.module.css';

// ─────────────────────────────────────────────────────────────────────────────
// BaseModal — TEK, TUTARLI ANİMASYON MİMARİSİ
//
// Nasıl çalışır:
//  1. isOpen prop'u true olduğunda modal DOM'a eklenir ve localIsOpen=true ile
//     açılış animasyonu (y: 100% → 0) tetiklenir.
//
//  2. Kullanıcı kapatmak istediğinde handleDelayedClose çalışır:
//     a. localIsOpen=false → Framer Motion kapanış animasyonunu başlatır (y: 0 → 100%)
//     b. 350ms bekler (spring animasyonu tamamlanır)
//     c. onClose() çağrılır → isOpen=false → AnimatePresence modal'ı DOM'dan kaldırır
//
//  Bu sayede ağır global React render'ları (URL state değişimi) animasyonu
//  asla donduramaz. Tüm modaller (AddTaskModal, CalendarDayModal vb.) aynı
//  akıcılıkta çalışır. keepMounted prop'u artık gereksiz, kaldırıldı.
//
// DEĞİŞTİRMEYİN: Bu mimariyi değiştirmek animasyon kasmasına veya
// "ilk tıklamada açılmama" bug'ına neden olur.
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

  // localIsOpen: Framer Motion animasyonunu kontrol eder.
  // isOpen'dan BAĞIMSIZDIR — kapanış animasyonunun bitmesini bekleyebilmek için.
  const [localIsOpen, setLocalIsOpen] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setLocalIsOpen(true);
    }
    // isOpen false olursa (örn. URL geri tuşuyla) animasyonlu kapat
    if (!isOpen && localIsOpen) {
      setLocalIsOpen(false);
    }
  }, [isOpen]);

  // ── Kapatma (Gecikmeli) ──────────────────────────────────────
  const handleDelayedClose = () => {
    if (preventClose || !localIsOpen) return;
    setLocalIsOpen(false);       // 1. Kapanış animasyonunu başlat
    setTimeout(() => {
      onClose();                 // 2. 350ms sonra global state'i güncelle
    }, 350);
  };

  // ── Sürükleme ───────────────────────────────────────────────
  const handleDragEnd = (event, info) => {
    if (preventClose || !localIsOpen) return;
    if (info.offset.y > 100 || info.velocity.y > 400) {
      handleDelayedClose();
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
              onClick={handleDelayedClose}
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
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Arka Plan (Overlay) */}
          <motion.div
            key="overlay"
            className={styles.modalOverlay}
            onClick={!preventClose ? handleDelayedClose : undefined}
            initial={{ opacity: 0 }}
            animate={{ opacity: localIsOpen ? 1 : 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
          />

          {/* Panel */}
          <motion.div
            key="panel"
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
            initial={{ y: '100%', x: '-50%' }}
            animate={{ y: localIsOpen ? 0 : '100%', x: '-50%' }}
            exit={{ y: '100%', x: '-50%' }}
            transition={{ type: 'spring', bounce: 0, duration: 0.35 }}
            drag={!preventClose && localIsOpen ? 'y' : false}
            dragListener={false}
            dragControls={dragControls}
            dragConstraints={{ top: 0 }}
            dragElastic={{ top: 0, bottom: 0.5 }}
            onDragEnd={handleDragEnd}
            inert={!localIsOpen ? 'true' : undefined}
          >
            {contentInner}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );

  return typeof document !== 'undefined'
    ? createPortal(modalContent, document.body)
    : modalContent;
};

export default BaseModal;
