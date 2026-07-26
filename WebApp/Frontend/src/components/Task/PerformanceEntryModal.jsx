import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CloseIcon } from '../Common/Icons';
import styles from './PerformanceEntryModal.module.css';

export default function PerformanceEntryModal({ task, isOpen, onClose, onSavePerformance }) {
  const [correct, setCorrect] = useState('');
  const [wrong, setWrong] = useState('');
  const [blank, setBlank] = useState('');

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      setCorrect('');
      setWrong('');
      setBlank('');
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!task) return null;

  const correctNum = Math.max(0, parseInt(correct, 10) || 0);
  const wrongNum = Math.max(0, parseInt(wrong, 10) || 0);
  const calculatedNet = Math.max(0, correctNum - wrongNum / 4);

  const handleSave = () => {
    onSavePerformance({
      taskId: task.id,
      correct: correctNum,
      wrong: wrongNum,
      blank: Math.max(0, parseInt(blank, 10) || 0),
      net: calculatedNet,
    });
    onClose();
  };

  return (
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
          <div className={styles.modalContainer}>
            <motion.div
              className={styles.card}
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.85, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            >
              <div className={styles.header}>
                <div>
                  <h2 className={styles.headerTitle}>Skor & Net Girişi</h2>
                  <p className={styles.headerSub}>{task.title}</p>
                </div>
                <button className={styles.closeBtn} onClick={onClose} aria-label="Kapat">
                  <CloseIcon />
                </button>
              </div>

              {/* Dynamic Net Score Display */}
              <div className={styles.scoreDisplay}>
                <span className={styles.scoreLabel}>Hesaplanan Net</span>
                <span className={styles.scoreValue}>{calculatedNet.toFixed(2)}</span>
              </div>

              {/* Input Fields */}
              <div className={styles.inputsGrid}>
                <div className={styles.inputGroup}>
                  <label className={`${styles.inputLabel} ${styles.correctLabel}`}>Doğru</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={correct}
                    onChange={(e) => setCorrect(e.target.value)}
                    className={styles.numberInput}
                  />
                </div>

                <div className={styles.inputGroup}>
                  <label className={`${styles.inputLabel} ${styles.wrongLabel}`}>Yanlış</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={wrong}
                    onChange={(e) => setWrong(e.target.value)}
                    className={styles.numberInput}
                  />
                </div>

                <div className={styles.inputGroup}>
                  <label className={`${styles.inputLabel} ${styles.blankLabel}`}>Boş</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={blank}
                    onChange={(e) => setBlank(e.target.value)}
                    className={styles.numberInput}
                  />
                </div>
              </div>

              <button className={styles.saveBtn} onClick={handleSave}>
                Kaydet ve Bitir 🎉
              </button>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
