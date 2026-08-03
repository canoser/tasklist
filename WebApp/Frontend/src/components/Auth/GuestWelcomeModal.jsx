import { useState, useEffect } from 'react';
import styles from './GuestWelcomeModal.module.css';
import storage from '../../utils/storage';
import { useTranslation } from 'react-i18next';

export default function GuestWelcomeModal({ onComplete, tone, onToneChange }) {
  const [name, setName] = useState('');
  const [selectedTone, setSelectedTone] = useState(tone || storage.getString('planlama_tone') || 'formal');
  const [isOpen, setIsOpen] = useState(false);
  const { t } = useTranslation('auth');

  useEffect(() => {
    // Check if guest name already exists
    const guestName = storage.getString('guest_name');
    if (!guestName) {
      setIsOpen(true);
    } else {
      onComplete(guestName);
    }
  }, [onComplete]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (name.trim()) {
      storage.setString('guest_name', name.trim());
      onToneChange?.(selectedTone);
      setIsOpen(false);
      onComplete(name.trim());
    }
  };

  if (!isOpen) return null;

  return (
    <div className={styles.overlay}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2 className={styles.title}>
            {t('guest_welcome_title', { context: selectedTone, defaultValue: 'Welcome!' })}
          </h2>
          <p className={styles.subtitle}>
            {t('guest_welcome_subtitle', { context: selectedTone, defaultValue: 'How should we address you to get started?' })}
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className={styles.formGroup}>
            <label className={styles.label}>
              {t('guest_name_label', { context: selectedTone, defaultValue: 'Your Name or Nickname' })}
            </label>
            <input 
              type="text" 
              className={styles.input} 
              placeholder={t('guest_name_placeholder', { context: selectedTone, defaultValue: 'e.g. Alex' })}
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>
              {t('setting_tone', { ns: 'profile', context: selectedTone, defaultValue: 'App Tone' })}
            </label>
            <select
              className={styles.select}
              value={selectedTone}
              onChange={(e) => {
                const newTone = e.target.value;
                setSelectedTone(newTone);
                onToneChange?.(newTone);
              }}
            >
              <option value="formal">{t('setting_tone_formal', { ns: 'profile', defaultValue: 'Formal' })}</option>
              <option value="semi">{t('setting_tone_semi', { ns: 'profile', defaultValue: 'Semi-Formal' })}</option>
              <option value="buddy">{t('setting_tone_buddy', { ns: 'profile', defaultValue: 'Buddy Mode 😎' })}</option>
            </select>
          </div>

          <button type="submit" className={styles.submitBtn}>
            {t('guest_continue_btn', { context: tone, defaultValue: 'Continue' })}
          </button>
        </form>
        
        <p className={styles.footerNote}>
          {t('guest_note', { context: tone, defaultValue: 'Note: You are currently in guest mode. Your data will be saved on your device.' })}
        </p>
      </div>
    </div>
  );
}
