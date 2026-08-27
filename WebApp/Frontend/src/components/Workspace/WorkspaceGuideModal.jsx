import React from 'react';
import { useTranslation } from 'react-i18next';
import BaseModal from '../Common/BaseModal';
import modalStyles from '../Common/BaseModal.module.css';

const WorkspaceGuideModal = ({ isOpen, onClose, tone }) => {
  const { t } = useTranslation('common');

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={t('ws_how_to_title', { context: tone, defaultValue: 'Kılavuz' })}
      maxWidth="500px"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', color: 'var(--text2)', fontSize: '0.92rem', lineHeight: '1.5' }}>
        <p><strong style={{ color: 'var(--text)' }}>1. Alan Kurma:</strong> {t('ws_how_to_create', { context: tone })}</p>
        <p><strong style={{ color: 'var(--text)' }}>2. Ekibi Davet Etme:</strong> {t('ws_how_to_invite', { context: tone })}</p>
        <p><strong style={{ color: 'var(--text)' }}>3. Görev Atama:</strong> {t('ws_how_to_assign', { context: tone })}</p>
        
        <p style={{ marginTop: '8px', fontStyle: 'italic', fontSize: '0.85rem', color: 'var(--text3)' }}>
          {t('how_to_ai_joke', { context: tone })}
        </p>
      </div>

      <div className={modalStyles.actions} style={{ marginTop: '20px' }}>
        <button type="button" className={modalStyles.btnPrimary} onClick={onClose}>
          {t('btn_close', { context: tone, defaultValue: 'Kapat' })}
        </button>
      </div>
    </BaseModal>
  );
};

export default WorkspaceGuideModal;

