import React, { useState } from 'react';
import styles from './TaskCompletionForm.module.css';

export default function TaskCompletionForm({ task, onSubmit, onCancel }) {
  const [duration, setDuration] = useState('');
  const [correct, setCorrect] = useState('');
  const [wrong, setWrong] = useState('');
  const [blank, setBlank] = useState('');
  const [notes, setNotes] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // YKS için standart Net formülü: Doğru - (Yanlış / 4)
    const c = parseInt(correct) || 0;
    const w = parseInt(wrong) || 0;
    const b = parseInt(blank) || 0;
    const net = c - (w / 4);

    onSubmit({
      duration: parseInt(duration) || 0,
      correct: c,
      wrong: w,
      blank: b,
      net: parseFloat(net.toFixed(2)),
      notes
    });
  };

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <h3>Görevi Tamamla</h3>
        <p className={styles.taskTitle}>{task.title}</p>
        
        <form onSubmit={handleSubmit}>
          {task.requirePerformanceEntry && (
            <>
              <div className={styles.formGroup}>
                <label>Doğru Sayısı</label>
                <input type="number" value={correct} onChange={e => setCorrect(e.target.value)} min="0" required />
              </div>
              <div className={styles.formGroup}>
                <label>Yanlış Sayısı</label>
                <input type="number" value={wrong} onChange={e => setWrong(e.target.value)} min="0" required />
              </div>
              <div className={styles.formGroup}>
                <label>Boş Sayısı</label>
                <input type="number" value={blank} onChange={e => setBlank(e.target.value)} min="0" required />
              </div>
            </>
          )}

          <div className={styles.formGroup}>
            <label>Çalışma Süresi (Dakika)</label>
            <input type="number" value={duration} onChange={e => setDuration(e.target.value)} min="1" required />
          </div>

          <div className={styles.formGroup}>
            <label>Notlar (Opsiyonel)</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows="3" placeholder="Görevi yaparken zorlandığın yerler vb." />
          </div>

          <div className={styles.actions}>
            <button type="button" onClick={onCancel} className={styles.cancelBtn}>İptal</button>
            <button type="submit" className={styles.submitBtn}>Kaydet</button>
          </div>
        </form>
      </div>
    </div>
  );
}
