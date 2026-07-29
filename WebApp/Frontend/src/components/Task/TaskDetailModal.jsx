import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';
import { CloseIcon } from '../Common/Icons';
import styles from './TaskDetailModal.module.css';

const CheckIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

export default function TaskDetailModal({ task, isOpen, onClose, onCompleteTask }) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!task) return null;

  const modalContent = (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            className={styles.backdrop}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <div className={styles.sheetContainer}>
            <motion.div
              className={styles.sheet}
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            >
              <div className={styles.header}>
                <div className={styles.titleGroup}>
                  <div className={styles.badgeRow}>
                    <span className={styles.typeBadge}>{task.type}</span>
                    {task.isTeacherAssigned && (
                      <span className={styles.teacherBadge}>Öğretmen Görevi</span>
                    )}
                    {task.isCompleted && (
                      <span className={styles.completedBadge}>✓ Tamamlandı</span>
                    )}
                  </div>
                  <h2 className={styles.title}>{task.title}</h2>
                </div>
                <button className={styles.closeBtn} onClick={onClose} aria-label="Kapat">
                  <CloseIcon />
                </button>
              </div>

              <div className={styles.infoGrid}>
                <div className={styles.infoItem}>
                  <span className={styles.infoLabel}>Teslim Tarihi</span>
                  <span className={styles.infoValue}>📅 {task.deadline || 'Belirtilmedi'}</span>
                </div>
                <div className={styles.infoItem}>
                  <span className={styles.infoLabel}>Görevi Atayan</span>
                  <span className={styles.infoValue}>
                    {task.isTeacherAssigned ? '👨‍🏫 Taylan Hoca' : '👤 Bireysel'}
                  </span>
                </div>
                <div className={styles.infoItem}>
                  <span className={styles.infoLabel}>Ders / Konu</span>
                  <span className={styles.infoValue}>{task.subject || 'Genel'}</span>
                </div>
                <div className={styles.infoItem}>
                  <span className={styles.infoLabel}>Hedef Miktar</span>
                  <span className={styles.infoValue}>{task.count || '-'}</span>
                </div>
              </div>

              <div className={styles.section}>
                <span className={styles.sectionTitle}>Öğretmen Notu</span>
                <div className={styles.noteBox}>
                  {task.teacherNote || 'Bu görev için öğretmen notu eklenmemiştir.'}
                </div>
              </div>

              {!task.isCompleted ? (
                <button
                  className={styles.completeBtn}
                  onClick={() => {
                    onClose();
                    onCompleteTask(task);
                  }}
                >
                  <CheckIcon />
                  Görevi Tamamla
                </button>
              ) : (
                <div className={styles.completedInfo}>
                  🎉 Bu görev daha önce tamamlanmıştır.
                </div>
              )}
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
}
