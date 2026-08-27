import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import BaseModal from '../Common/BaseModal';
import modalStyles from '../Common/BaseModal.module.css';

const CreateWorkspaceModal = ({ isOpen, onClose, onCreate, tone }) => {
  const { t } = useTranslation('common');
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [desc, setDesc] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || !role.trim()) return;
    setLoading(true);
    try {
      await onCreate({ name, description: desc, settings: JSON.stringify({ role }) }); 
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
      title={t('ws_create_title', { context: tone, defaultValue: 'Yeni Alan Oluştur' })}
      preventClose={loading}
      maxWidth="440px"
    >
      <form onSubmit={handleSubmit} className={modalStyles.form}>
        <div className={modalStyles.formGroup}>
          <label className={modalStyles.label}>{t('ws_lbl_name', { context: tone, defaultValue: 'Alan Adı' })}</label>
          <input 
            type="text" 
            className={modalStyles.input}
            value={name} 
            onChange={e => setName(e.target.value)} 
            placeholder={t('ws_name_placeholder', { context: tone, defaultValue: 'Örn: Sınav Hazırlık Grubu' })}
            required 
            autoFocus
          />
        </div>
        
        <div className={modalStyles.formGroup}>
          <label className={modalStyles.label}>{t('ws_lbl_role', { context: tone, defaultValue: 'Rolünüz' })}</label>
          <input 
            type="text" 
            className={modalStyles.input}
            value={role} 
            onChange={e => setRole(e.target.value)} 
            placeholder={t('ws_role_placeholder', { context: tone, defaultValue: 'Örn: Koç, Öğretmen, Lider' })}
            required 
          />
        </div>

        <div className={modalStyles.formGroup}>
          <label className={modalStyles.label}>{t('ws_lbl_desc', { context: tone, defaultValue: 'Açıklama' })}</label>
          <textarea 
            className={modalStyles.textarea}
            value={desc} 
            onChange={e => setDesc(e.target.value)} 
            rows={3}
          />
        </div>

        <div className={modalStyles.actions}>
          <button type="button" className={modalStyles.btnSecondary} onClick={onClose} disabled={loading}>
            {t('btn_cancel', { context: tone, defaultValue: 'İptal' })}
          </button>
          <button type="submit" className={modalStyles.btnPrimary} disabled={loading}>
            {loading ? t('creating', { context: tone, defaultValue: 'Oluşturuluyor...' }) : t('btn_save', { context: tone, defaultValue: 'Kaydet' })}
          </button>
        </div>
      </form>
    </BaseModal>
  );
};

export default CreateWorkspaceModal;

