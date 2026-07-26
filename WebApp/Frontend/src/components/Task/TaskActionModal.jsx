import { useState } from 'react';
import BaseModal from '../Common/BaseModal';
import { CloseIcon, AlertIcon } from '../Common/Icons';
import styles from './TaskActionModal.module.css';

const TaskActionModal = ({ isOpen, onClose, task, onComplete, onPartialComplete, onPostpone }) => {
  const [mode, setMode] = useState('menu'); // 'menu' | 'partial' | 'postpone'
  const [doneAmount, setDoneAmount] = useState('');
  const [targetDate, setTargetDate] = useState('');

  if (!isOpen || !task) return null;

  // ── Handlers ─────────────────────────────────────────────────────────────────
  const handleClose = () => {
    setMode('menu');
    setDoneAmount('');
    setTargetDate('');
    onClose();
  };

  const handleFullComplete = () => {
    onComplete(task);
    handleClose();
  };

  const submitPartial = () => {
    if (!doneAmount || !targetDate) return;
    const total = parseInt(task.targetCount || task.count || 10, 10);
    const done = parseInt(doneAmount, 10);
    
    // Kısmi tamamlama mantığı: Geriye kalanlar için seçilen güne kopyası oluşturulacak.
    // Mevcut task %60 (örneğin) tamamlandı olarak kalacak.
    onPartialComplete(task, done, total, targetDate);
    handleClose();
  };

  const submitPostpone = () => {
    if (!targetDate) return;
    onPostpone(task, targetDate, true); // true = Zincirleme öteleme onayı (UI'da basitleştirildi)
    handleClose();
  };

  // Toplam hedef sayısını bul (örn: "30 Soru" -> 30)
  const totalTarget = parseInt(task.targetCount || task.count || 10, 10);

  return (
    <BaseModal isOpen={isOpen} onClose={handleClose}>
      <div className={styles.header}>
        <span className={styles.title}>{task.title}</span>
        <button className={styles.closeBtn} onClick={handleClose}><CloseIcon /></button>
      </div>

      <div className={styles.body}>
        {/* 1. Menü Modu */}
        {mode === 'menu' && (
          <div className={styles.actionList}>
            <button className={`${styles.actionBtn} ${styles.btnPrimary}`} onClick={handleFullComplete}>
              ✓ Hepsini Bitirdim
            </button>
            <button className={styles.actionBtn} onClick={() => setMode('partial')}>
              ⏳ Birazını Yaptım
            </button>
            <button className={styles.actionBtn} onClick={() => setMode('postpone')}>
              ➡️ Ertele
            </button>
          </div>
        )}

        {/* 2. Kısmi Tamamlama Modu */}
        {mode === 'partial' && (
          <div className={styles.partialForm}>
            <div className={styles.inputGroup}>
              <label className={styles.label}>Ne kadarını tamamladın?</label>
              <div className={styles.inputRow}>
                <input 
                  type="number" 
                  className={styles.numberInput} 
                  value={doneAmount} 
                  onChange={(e) => setDoneAmount(e.target.value)}
                  placeholder="Örn: 6"
                  autoFocus
                />
                <span className={styles.totalText}>/ {totalTarget}</span>
              </div>
            </div>

            {doneAmount && parseInt(doneAmount) < totalTarget && (
              <div className={styles.inputGroup}>
                <label className={styles.label}>Kalan {totalTarget - parseInt(doneAmount)} hedefi ne zamana erteleyelim?</label>
                <input 
                  type="date" 
                  className={styles.dateSelect} 
                  value={targetDate} 
                  onChange={(e) => setTargetDate(e.target.value)} 
                />
              </div>
            )}

            <div className={styles.formActions}>
              <button className={styles.cancelBtn} onClick={() => setMode('menu')}>Geri</button>
              <button 
                className={styles.submitBtn} 
                onClick={submitPartial}
                disabled={!doneAmount || !targetDate}
                style={{ opacity: (!doneAmount || !targetDate) ? 0.5 : 1 }}
              >
                Onayla
              </button>
            </div>
          </div>
        )}

        {/* 3. Ertele Modu */}
        {mode === 'postpone' && (
          <div className={styles.partialForm}>
            
            {/* Zincirleme Erteleme Uyarısı (Mock) */}
            <div className={styles.warningBox}>
              <div className={styles.warningTitle}><AlertIcon /> Zincirleme Erteleme</div>
              <div className={styles.warningText}>
                Bu göreve bağlı {Math.floor(Math.random() * 3) + 1} alt görev daha bulunuyor. Bu görevi ertelerseniz, programa uygun şekilde ondan sonraki görevler de kaydırılacaktır.
              </div>
            </div>

            <div className={styles.inputGroup}>
              <label className={styles.label}>Yeni Tarihi Seçin</label>
              <input 
                type="date" 
                className={styles.dateSelect} 
                value={targetDate} 
                onChange={(e) => setTargetDate(e.target.value)} 
              />
            </div>

            <div className={styles.formActions}>
              <button className={styles.cancelBtn} onClick={() => setMode('menu')}>Geri</button>
              <button 
                className={styles.submitBtn} 
                onClick={submitPostpone}
                disabled={!targetDate}
                style={{ opacity: !targetDate ? 0.5 : 1 }}
              >
                Tümünü Kaydır
              </button>
            </div>
          </div>
        )}

      </div>
    </BaseModal>
  );
};

export default TaskActionModal;
