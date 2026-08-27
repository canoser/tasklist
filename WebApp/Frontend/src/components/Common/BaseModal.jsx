import { motion, AnimatePresence } from 'framer-motion';
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
  maxWidth = '480px',
  preventClose = false,
  className = ''
}) => {
  const modalContent = (
    <AnimatePresence>
      {isOpen && (
        <div 
          className={styles.modalOverlay}
          onClick={!preventClose ? onClose : undefined}
        >
          <motion.div 
            className={`${styles.modalContent} ${className}`}
            style={{ maxWidth }}
            initial={{ scale: 0.95, opacity: 0, y: 16 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 16 }}
            transition={{ type: 'spring', damping: 26, stiffness: 320 }}
            onClick={(e) => e.stopPropagation()}
          >
            {title && (
              <div className={styles.header}>
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
        </div>
      )}
    </AnimatePresence>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
};

export default BaseModal;

