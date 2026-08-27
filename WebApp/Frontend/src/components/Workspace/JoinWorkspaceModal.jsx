import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import BaseModal from '../Common/BaseModal';
import modalStyles from '../Common/BaseModal.module.css';

const JoinWorkspaceModal = ({ isOpen, onClose, onJoin, tone, initialCode = '' }) => {
  const { t } = useTranslation('common');
  const [code, setCode] = useState(initialCode);
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && initialCode) {
      setCode(initialCode);
    }
  }, [isOpen, initialCode]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!code.trim() || !displayName.trim()) return;
    setLoading(true);
    try {
      await onJoin(code.trim(), displayName.trim());
      onClose();
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={t('ws_join_title', { context: tone, defaultValue: 'Kod ile Katıl' })}
      preventClose={loading}
      maxWidth="440px"
    >
      <form onSubmit={handleSubmit} className={modalStyles.form}>
        <div className={modalStyles.formGroup}>
          <label className={modalStyles.label}>{t('ws_lbl_invite_code', { context: tone, defaultValue: 'Davet Kodu' })}</label>
          <input 
            type="text" 
            className={modalStyles.input}
            value={code} 
            onChange={e => setCode(e.target.value)} 
            placeholder={t('ws_code_placeholder', { context: tone, defaultValue: '6 haneli kodu girin' })}
            required 
            autoFocus
          />
        </div>

        <div className={modalStyles.formGroup}>
          <label className={modalStyles.label}>{t('ws_lbl_display_name', { context: tone, defaultValue: 'Görünen Ad (Takma Ad)' })}</label>
          <input 
            type="text" 
            className={modalStyles.input}
            value={displayName} 
            onChange={e => setDisplayName(e.target.value)} 
            placeholder={t('ws_display_name_placeholder', { context: tone, defaultValue: 'Örn: Veli, Öğrenci 1' })}
            required 
          />
        </div>
        
        <div className={modalStyles.actions}>
          <button type="button" className={modalStyles.btnSecondary} onClick={onClose} disabled={loading}>
            {t('btn_cancel', { context: tone, defaultValue: 'İptal' })}
          </button>
          <button type="submit" className={modalStyles.btnPrimary} disabled={loading}>
            {loading ? t('loading', { context: tone, defaultValue: 'Yükleniyor...' }) : t('btn_confirm', { context: tone, defaultValue: 'Onayla' })}
          </button>
        </div>
      </form>
    </BaseModal>
  );
};

export default JoinWorkspaceModal;

