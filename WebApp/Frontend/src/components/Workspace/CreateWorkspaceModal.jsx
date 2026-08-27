import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import BaseModal from '../Common/BaseModal';
import modalStyles from '../Common/BaseModal.module.css';

const CreateWorkspaceModal = ({ isOpen, onClose, onCreate, tone }) => {
  const { t } = useTranslation('common');
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [desc, setDesc] = useState('');
  const [requiresApproval, setRequiresApproval] = useState(true);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || !role.trim()) return;
    setLoading(true);
    try {
      await onCreate({ name, description: desc, requiresApproval, settings: JSON.stringify({ role }) }); 
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

        <div className={modalStyles.formGroup} style={{ flexDirection: 'row', alignItems: 'center', gap: '0.5rem' }}>
          <input 
            type="checkbox" 
            id="requiresApproval"
            checked={requiresApproval} 
            onChange={e => setRequiresApproval(e.target.checked)} 
            style={{ width: '16px', height: '16px', cursor: 'pointer' }}
          />
          <label htmlFor="requiresApproval" className={modalStyles.label} style={{ marginBottom: 0, cursor: 'pointer' }}>
            {t('ws_lbl_requires_approval', { context: tone, defaultValue: 'Katılım Onaya Tabi Olsun (Hemen Giremesinler)' })}
          </label>
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

