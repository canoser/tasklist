import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import BaseModal from '../Common/BaseModal';
import modalStyles from '../Common/BaseModal.module.css';

const EditWorkspaceModal = ({ isOpen, onClose, onEdit, workspace, tone }) => {
  const { t } = useTranslation('common');
  const [name, setName] = useState(workspace?.name || '');
  const [description, setDescription] = useState(workspace?.description || '');
  const [requiresApproval, setRequiresApproval] = useState(workspace?.requiresApproval ?? true);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onEdit({ ...workspace, name, description, requiresApproval });
      onClose();
    } catch (err) {
      console.error(err);
      alert(t('ws_err_update_failed', { context: tone, defaultValue: 'Güncelleme başarısız' }));
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (window.confirm(t('ws_delete_confirm', { defaultValue: 'Bu alanı silmek istediğinize emin misiniz? Bu işlem geri alınamaz.', context: tone }))) {
      try {
        setLoading(true);
        await onEdit({ ...workspace, isDeleting: true });
        onClose();
      } catch (err) {
        console.error(err);
        alert(t('ws_err_delete_failed', { context: tone, defaultValue: 'Silme başarısız' }));
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <BaseModal 
      isOpen={isOpen} 
      onClose={onClose}
      title={t('ws_edit_title', { context: tone, defaultValue: 'Alanı Düzenle' })}
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
            required 
          />
        </div>
        <div className={modalStyles.formGroup}>
          <label className={modalStyles.label}>{t('ws_lbl_desc', { context: tone, defaultValue: 'Açıklama' })}</label>
          <textarea 
            className={modalStyles.textarea}
            value={description} 
            onChange={e => setDescription(e.target.value)} 
            rows={3}
          />
        </div>
        <div className={modalStyles.formGroup} style={{ flexDirection: 'row', alignItems: 'center', gap: '0.5rem' }}>
          <input 
            type="checkbox" 
            id="requiresApprovalEdit"
            checked={requiresApproval} 
            onChange={e => setRequiresApproval(e.target.checked)} 
            style={{ width: '16px', height: '16px', cursor: 'pointer' }}
          />
          <label htmlFor="requiresApprovalEdit" className={modalStyles.label} style={{ marginBottom: 0, cursor: 'pointer' }}>
            {t('ws_lbl_requires_approval', { context: tone, defaultValue: 'Katılım Onaya Tabi Olsun (Hemen Giremesinler)' })}
          </label>
        </div>
        <div className={modalStyles.actions} style={{ justifyContent: 'space-between' }}>
          <button 
            type="button" 
            className={modalStyles.btnDanger} 
            onClick={handleDelete}
            disabled={loading}
          >
            {loading ? t('loading', { context: tone, defaultValue: 'Yükleniyor...' }) : t('btn_delete', { defaultValue: 'Sil', context: tone })}
          </button>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button 
              type="button" 
              className={modalStyles.btnSecondary} 
              onClick={onClose}
              disabled={loading}
            >
              {t('btn_cancel', { context: tone, defaultValue: 'İptal' })}
            </button>
            <button 
              type="submit" 
              className={modalStyles.btnPrimary} 
              disabled={loading}
            >
              {loading ? t('loading', { context: tone, defaultValue: 'Yükleniyor...' }) : t('btn_save', { defaultValue: 'Kaydet', context: tone })}
            </button>
          </div>
        </div>
      </form>
    </BaseModal>
  );
};

export default EditWorkspaceModal;

