import React, { useState } from 'react';
import BaseModal from '../Common/BaseModal';
import { useTranslation } from 'react-i18next';
import styles from './WorkspaceModals.module.css';

const EditWorkspaceModal = ({ isOpen, onClose, onEdit, workspace, tone }) => {
  const { t } = useTranslation('common');
  const [name, setName] = useState(workspace?.name || '');
  const [description, setDescription] = useState(workspace?.description || '');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onEdit({ ...workspace, name, description });
      onClose();
    } catch (err) {
      console.error(err);
      alert('Güncelleme başarısız');
    } finally {
      setLoading(false);
    }
  };

  return (
    <BaseModal isOpen={isOpen} onClose={onClose}>
      <div className={styles.modalContent}>
        <h2>Alanı Düzenle</h2>
        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.formGroup}>
            <label>{t('ws_lbl_name', { context: tone })}</label>
            <input 
              type="text" 
              value={name} 
              onChange={e => setName(e.target.value)} 
              required 
            />
          </div>
          <div className={styles.formGroup}>
            <label>{t('ws_lbl_desc', { context: tone })}</label>
            <input 
              type="text" 
              value={description} 
              onChange={e => setDescription(e.target.value)} 
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1rem' }}>
            <button 
              type="button" 
              className={`${styles.btnSubmit} ${styles.btnDanger}`} 
              onClick={async () => {
                if (window.confirm(t('ws_delete_confirm', { defaultValue: 'Bu alanı silmek istediğinize emin misiniz? Bu işlem geri alınamaz.', context: tone }))) {
                  try {
                    setLoading(true);
                    await onEdit({ ...workspace, isDeleting: true });
                    onClose();
                  } catch (err) {
                    console.error(err);
                    alert('Silme başarısız');
                  } finally {
                    setLoading(false);
                  }
                }
              }}
              disabled={loading}
              style={{ backgroundColor: 'var(--danger-color, #dc3545)', width: 'auto', flex: 1, marginRight: '10px' }}
            >
              {loading ? t('loading', { context: tone }) : t('delete', { defaultValue: 'Sil', context: tone })}
            </button>
            <button type="submit" className={styles.btnSubmit} disabled={loading} style={{ width: 'auto', flex: 1, marginLeft: '10px' }}>
              {loading ? t('loading', { context: tone }) : t('save', { defaultValue: 'Kaydet', context: tone })}
            </button>
          </div>
        </form>
      </div>
    </BaseModal>
  );
};

export default EditWorkspaceModal;
