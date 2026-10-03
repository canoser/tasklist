import React, { useState } from 'react';
import styles from './InviteSharePanel.module.css';

const InviteSharePanel = ({ code, link, expiresAt }) => {
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const copyToClipboard = async (text, setState) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Fallback: eski tarayıcılar için
      const el = document.createElement('textarea');
      el.value = text;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
    }
    setState(true);
    setTimeout(() => setState(false), 2000);
  };

  const shareWhatsApp = () => {
    const text = `Mentörüm daveti!\nKod: ${code}\nLink: ${link}\n(48 saat geçerli)`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  const expiryText = expiresAt ? new Date(expiresAt).toLocaleString('tr-TR') : null;

  return (
    <div className={styles.panel}>
      <p className={styles.label}>Davet Kodu (48 saat geçerli)</p>

      <div className={styles.codeRow}>
        <span className={styles.code}>{code}</span>
        <button type="button" className={styles.copyBtn} onClick={() => copyToClipboard(code, setCopiedCode)}>
          {copiedCode ? '✓ Kopyalandı' : 'Kodu Kopyala'}
        </button>
      </div>

      <div className={styles.linkRow}>
        <span className={styles.link} title={link}>{link}</span>
        <button type="button" className={styles.copyBtn} onClick={() => copyToClipboard(link, setCopiedLink)}>
          {copiedLink ? '✓' : 'Linki Kopyala'}
        </button>
      </div>

      <button type="button" className={styles.whatsappBtn} onClick={shareWhatsApp}>
        🟢 WhatsApp ile Gönder
      </button>

      {expiryText && <p className={styles.expiry}>Geçerlilik: {expiryText}</p>}
    </div>
  );
};

export default InviteSharePanel;
