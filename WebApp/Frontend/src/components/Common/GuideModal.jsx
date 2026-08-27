import React from 'react';
import { useTranslation } from 'react-i18next';
import BaseModal from './BaseModal';
import modalStyles from './BaseModal.module.css';

const GuideModal = ({ isOpen, onClose, titleKey, contentKeys, tone }) => {
  const { t } = useTranslation('admin');

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={t(titleKey, { context: tone, defaultValue: 'Kullanım Kılavuzu' })}
      maxWidth="560px"
    >
      <div style={{ color: 'var(--text2)', lineHeight: '1.6', fontSize: '0.95rem' }}>
        {contentKeys.map((key, index) => (
          <p key={index} style={{ marginBottom: '16px' }} dangerouslySetInnerHTML={{ __html: t(key, { context: tone }) }} />
        ))}
      </div>

      <div className={modalStyles.actions} style={{ marginTop: '20px' }}>
        <button type="button" className={modalStyles.btnPrimary} onClick={onClose}>
          {t('btn_close_guide', { context: tone, defaultValue: 'Anladım, Teşekkürler' })}
        </button>
      </div>
    </BaseModal>
  );
};

export default GuideModal;

