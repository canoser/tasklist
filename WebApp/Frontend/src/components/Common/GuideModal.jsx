import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, HelpCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const GuideModal = ({ isOpen, onClose, titleKey, contentKeys, tone }) => {
  const { t } = useTranslation('admin');

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9999 }}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            style={{ 
              position: 'fixed', top: '10%', left: '50%', transform: 'translateX(-50%)', 
              background: 'var(--bg)', padding: '24px', borderRadius: '16px', 
              width: '90%', maxWidth: '600px', zIndex: 10000, maxHeight: '80vh', overflowY: 'auto',
              boxShadow: '0 10px 25px rgba(0,0,0,0.2)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '16px', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <HelpCircle size={24} color="var(--accent)" />
                <h2 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--text)' }}>{t(titleKey, { context: tone, defaultValue: 'Kullanım Kılavuzu' })}</h2>
              </div>
              <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text2)' }}>
                <X size={24} />
              </button>
            </div>
            
            <div style={{ color: 'var(--text2)', lineHeight: '1.6', fontSize: '0.95rem' }}>
              {contentKeys.map((key, index) => (
                <p key={index} style={{ marginBottom: '16px' }} dangerouslySetInnerHTML={{ __html: t(key, { context: tone }) }} />
              ))}
            </div>

            <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={onClose} style={{ padding: '10px 20px', background: 'var(--accent)', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
                {t('btn_close_guide', { context: tone, defaultValue: 'Anladım, Teşekkürler' })}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default GuideModal;
