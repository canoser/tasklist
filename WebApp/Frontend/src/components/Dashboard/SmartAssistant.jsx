import React, { useState } from 'react';
import { App } from '@capacitor/app';
import { motion, AnimatePresence } from 'framer-motion';
import { CloseIcon, SparkleIcon } from '../Common/Icons';
import styles from './SmartAssistant.module.css';

// ── Sihirbaz Adımları ─────────────────────────────────────────────────────────
const WIZARD_STEPS = [
  {
    step: 'Adım 1 / 3',
    question: 'Ülkeni seç',
    options: [
      { emoji: '🇹🇷', label: 'Türkiye' },
      { emoji: '🇺🇸', label: 'ABD' },
      { emoji: '🇩🇪', label: 'Almanya' },
      { emoji: '🌍', label: 'Diğer' },
    ],
    progress: 33,
  },
  {
    step: 'Adım 2 / 3',
    question: 'Hedef sınavın hangisi?',
    options: [
      { emoji: '📚', label: 'YKS (TYT/AYT)' },
      { emoji: '🏫', label: 'LGS' },
      { emoji: '🌐', label: 'SAT / ACT' },
      { emoji: '✏️', label: 'Diğer' },
    ],
    progress: 66,
  },
  {
    step: 'Adım 3 / 3',
    question: 'Sınıfın kaçıncı?',
    options: [
      { emoji: '9️⃣', label: '9. Sınıf' },
      { emoji: '🔟', label: '10. Sınıf' },
      { emoji: '1️⃣1️⃣', label: '11. Sınıf' },
      { emoji: '1️⃣2️⃣', label: '12. Sınıf' },
    ],
    progress: 100,
  },
];



// ── Ana SmartAssistant Bileşeni ───────────────────────────────────────────────
// isVisible ve onHide props'ları ile Dashboard'dan gizleme kontrolü yapılır
const SmartAssistant = ({ isVisible = true, onHide, onOpenAi, isOpen, onOpen, onClose }) => {
  const [stepIndex, setStepIndex] = useState(0);
  const [selected, setSelected] = useState(null);

  const currentStep = WIZARD_STEPS[stepIndex];
  const isLastStep = stepIndex === WIZARD_STEPS.length - 1;

  const handleOpen = () => {
    if (onOpenAi) {
      onOpenAi();
      return;
    }
    setStepIndex(0);
    setSelected(null);
    if (onOpen) onOpen();
  };

  const handleClose = () => {
    if (onClose) onClose();
  };

  const handleHide = (e) => {
    e.stopPropagation(); // FAB'ın handleOpen'ını tetiklemesin
    if (onHide) onHide();
  };

  const handleNext = () => {
    if (isLastStep) {
      handleClose();
    } else {
      setStepIndex((prev) => prev + 1);
      setSelected(null);
    }
  };

  // Dashboard'dan gizlendiyse hiçbir şey render etme
  if (!isVisible) return null;

  return (
    <>
      {/* ── FAB Butonu + X Kapatma ─────────────────────────────────────────── */}
      <AnimatePresence>
        {!isOpen && (
          <motion.div
            className={styles.fabWrapper}
            drag
            dragConstraints={{
              top: -(typeof window !== 'undefined' ? window.innerHeight - 160 : 500),
              bottom: 10,
              left: -(typeof window !== 'undefined' ? window.innerWidth - 80 : 300),
              right: 10,
            }}
            dragElastic={0.1}
            dragMomentum={false}
            whileDrag={{ scale: 1.08, cursor: 'grabbing' }}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
          >
            {/* FAB ana butonu */}
            <motion.button
              className={styles.fab}
              onClick={handleOpen}
              whileTap={{ scale: 0.9 }}
              aria-label="Akıllı Asistanı Aç"
            >
              <SparkleIcon />
            </motion.button>

            {/* FAB üzerindeki mini X butonu (tamamen gizlemek için) */}
            <button
              className={styles.fabClose}
              onClick={handleHide}
              aria-label="Asistanı Gizle"
            >
              <CloseIcon size={18} strokeWidth={2.8} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Sihirbaz Modalı ────────────────────────────────────────────────── */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              className={styles.backdrop}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleClose}
            />

            {/* Wizard Card — Standart Scale/Opacity animasyonu */}
            <div className={styles.wizardContainer}>
              <motion.div
                className={styles.wizardCard}
                initial={{ scale: 0.8, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.8, opacity: 0, y: 20 }}
                transition={{ type: 'tween', ease: [0.16, 1, 0.3, 1], duration: 0.25 }}
              >
                {/* Başlık */}
                <div className={styles.wizardHeader}>
                  <div className={styles.wizardHeaderLeft}>
                    <span className={styles.wizardEmoji}>✨</span>
                    <span className={styles.wizardTitle}>Akıllı Kurulum</span>
                    <span className={styles.wizardSubtitle}>Sana özel plan oluşturalım</span>
                  </div>
                  <button
                    className={styles.closeBtn}
                    onClick={handleClose}
                    aria-label="Kapat"
                  >
                    <CloseIcon />
                  </button>
                </div>

                {/* İlerleme çubuğu */}
                <div className={styles.progressBar}>
                  <motion.div
                    className={styles.progressFill}
                    animate={{ width: `${currentStep.progress}%` }}
                    transition={{ duration: 0.4, ease: 'easeOut' }}
                  />
                </div>

                {/* Gövde */}
                <div className={styles.wizardBody}>
                  <span className={styles.wizardStep}>{currentStep.step}</span>
                  <h2 className={styles.wizardQuestion}>{currentStep.question}</h2>

                  <div className={styles.optionGrid}>
                    {currentStep.options.map((opt) => (
                      <button
                        key={opt.label}
                        className={`${styles.optionBtn} ${selected === opt.label ? styles.selected : ''}`}
                        onClick={() => setSelected(opt.label)}
                      >
                        <span className={styles.optionEmoji}>{opt.emoji}</span>
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Alt */}
                <div className={styles.wizardFooter}>
                  <span className={styles.stepIndicator}>
                    {stepIndex + 1} / {WIZARD_STEPS.length}
                  </span>
                  <button
                    className={styles.nextBtn}
                    onClick={handleNext}
                    disabled={!selected}
                  >
                    {isLastStep ? 'Tamamla 🚀' : 'İleri →'}
                  </button>
                </div>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

export default SmartAssistant;
