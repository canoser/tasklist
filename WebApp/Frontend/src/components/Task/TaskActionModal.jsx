import { useState } from 'react';
import BaseModal from '../Common/BaseModal';
import { CloseIcon, AlertIcon } from '../Common/Icons';
import styles from './TaskActionModal.module.css';
import { useTranslation } from 'react-i18next';

import chainService from '../../services/chainService';

const TaskActionModal = ({ isOpen, onClose, task, onComplete, onPartialComplete, onPostpone }) => {
  const { t } = useTranslation('common');
  const [mode, setMode] = useState('menu'); // 'menu' | 'partial' | 'postpone'
  const [doneAmount, setDoneAmount] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [postponeAll, setPostponeAll] = useState(false);

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

  const submitPostpone = async () => {
    if (!targetDate) return;
    try {
      const today = new Date();
      const targetDateObj = new Date(targetDate);
      const daysToShift = Math.round((targetDateObj - today) / (1000 * 60 * 60 * 24));
      
      await chainService.postponeTask(task.id, daysToShift, postponeAll);
      onPostpone(task, targetDate, postponeAll); // State'i yerel olarak güncellemesi için (CalendarScreen)
      handleClose();
    } catch (err) {
      console.error('Erteleme hatası:', err);
      handleClose();
    }
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
              <button className={styles.cancelBtn} onClick={() => setMode('menu')}>{t('btn_cancel', { defaultValue: 'Geri' })}</button>
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
            
            {/* Zincirleme Erteleme Uyarısı */}
            {task.chainId && (
              <div className={styles.warningBox}>
                <div className={styles.warningTitle}><AlertIcon /> Zincirleme Erteleme</div>
                <div className={styles.warningText}>
                  Bu görev bir zincirin parçası. Sonraki görevler de kaydırılsın mı?
                </div>
                <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                    <input 
                      type="radio" 
                      name="postponeMode" 
                      checked={!postponeAll} 
                      onChange={() => setPostponeAll(false)} 
                    />
                    Sadece bu görevi ertele
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                    <input 
                      type="radio" 
                      name="postponeMode" 
                      checked={postponeAll} 
                      onChange={() => setPostponeAll(true)} 
                    />
                    Zinciri de kaydır
                  </label>
                </div>
              </div>
            )}

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
              <button className={styles.cancelBtn} onClick={() => setMode('menu')}>{t('btn_cancel', { defaultValue: 'Geri' })}</button>
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
