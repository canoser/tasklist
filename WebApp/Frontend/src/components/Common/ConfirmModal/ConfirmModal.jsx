/**
 * ConfirmModal.jsx
 * Generic iki-seçenekli onay modalı.
 *
 * Rol silme dışında kullanılabilir: kategori silme, hesap silme, toplu işlem vb.
 * `actions` prop'u dinamik sayıda buton destekler.
 *
 * Props:
 *   isOpen       bool
 *   title        string       Modal başlığı
 *   description  string|node  Açıklama metni
 *   actions      [{label, variant: 'warning'|'danger', onClick}]
 *   onCancel     () => void   İptal / backdrop tıklama
 */

import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';
import styles from './ConfirmModal.module.css';
import { useTranslation } from 'react-i18next';

const VARIANT_CLASS = {
  warning: styles.btnWarning,
  danger: styles.btnDanger,
};

const ConfirmModal = ({ isOpen, title, description, actions = [], onCancel, tone }) => {
  const { t } = useTranslation('common');
  const modalContent = (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className={styles.overlay}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onCancel}
        >
          <motion.div
            className={styles.container}
            initial={{ scale: 0.92, opacity: 0, y: 16 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.92, opacity: 0, y: 16 }}
            transition={{ type: 'tween', ease: [0.16, 1, 0.3, 1], duration: 0.25, opacity: { duration: 0.15 } }}
            onClick={(e) => e.stopPropagation()}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="confirm-modal-title"
            aria-describedby="confirm-modal-desc"
          >
            {/* İkon */}
            <div className={styles.iconWrapper}>
              <span role="img" aria-label="Uyarı">⚠️</span>
            </div>

            {/* Başlık */}
            <h3 id="confirm-modal-title" className={styles.title}>{title}</h3>

            {/* Açıklama */}
            {description && (
              <p id="confirm-modal-desc" className={styles.description}>{description}</p>
            )}

            {/* Aksiyon Butonları */}
            <div className={styles.actions}>
              {actions.map((action, idx) => (
                <button
                  key={idx}
                  className={VARIANT_CLASS[action.variant] || styles.btnWarning}
                  onClick={action.onClick}
                  type="button"
                >
                  {action.label}
                </button>
              ))}
            </div>

            {/* İptal */}
            <button
              className={styles.btnCancel}
              onClick={onCancel}
              type="button"
            >
              {t('btn_cancel', { context: tone })}
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return typeof document !== 'undefined'
    ? createPortal(modalContent, document.body)
    : modalContent;
};

export default ConfirmModal;
