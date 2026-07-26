import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import styles from './Profile.module.css';

const ChevronIcon = ({ isOpen }) => (
  <svg 
    width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.3s ease', color: 'var(--text-secondary)' }}
  >
    <polyline points="6 9 12 15 18 9"></polyline>
  </svg>
);

const Profile = ({ user, appearance, onToggleAppearance, theme, setTheme }) => {
  const [openSections, setOpenSections] = useState({ theme: false, settings: false });
  const toggleSection = (sec) => setOpenSections(prev => ({ ...prev, [sec]: !prev[sec] }));

  const displayName = user?.displayName || user?.email?.split('@')[0] || 'Öğrenci';
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <motion.div
      className={styles.profileContainer}
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
    >
      {/* ── Kullanıcı Kartı ─────────────────────────────────────────────────── */}
      <div className={styles.userCard}>
        <div className={styles.avatar}>{initial}</div>
        <div className={styles.userInfo}>
          <h2 className={styles.userName}>{displayName}</h2>
          <span className={styles.userEmail}>{user?.email || 'ogrenci@planlama.app'}</span>
          <span className={styles.roleBadge}>Öğrenci Hesabı</span>
        </div>
      </div>

      {/* ── TEMA BÖLÜMÜ ─────────────────── */}
      <div className={styles.sectionCard}>
        <div 
          className={styles.sectionHeader} 
          onClick={() => toggleSection('theme')}
          style={{ cursor: 'pointer' }}
        >
          <h3 className={styles.sectionTitle}>
            <span className={styles.sectionIcon}>🎨</span> Tema ve Görünüm
          </h3>
          <ChevronIcon isOpen={openSections.theme} />
        </div>

        <AnimatePresence>
          {openSections.theme && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              style={{ overflow: 'hidden' }}
            >
              <div className={styles.sectionBody}>
                <p className={styles.themeDesc}>
                  Uygulamanın renk paletini ve görünüm modunu kişiselleştirin.
                </p>

                {/* Görünüm (Aydınlık/Karanlık) */}
                <h4 style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '12px' }}>Görünüm Modu</h4>
                <div className={styles.themeGrid} style={{ marginBottom: '24px' }}>
                  <div
                    className={`${styles.themeOption} ${appearance === 'dark' ? styles.active : ''}`}
                    onClick={onToggleAppearance}
                  >
                    <div
                      className={styles.themePreviewCircle}
                      style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)' }}
                    />
                    <span className={styles.themeName}>Karanlık</span>
                  </div>

                  <div
                    className={`${styles.themeOption} ${appearance === 'light' ? styles.active : ''}`}
                    onClick={onToggleAppearance}
                  >
                    <div
                      className={styles.themePreviewCircle}
                      style={{ background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)', border: '1px solid #e2e8f0' }}
                    />
                    <span className={styles.themeName}>Aydınlık</span>
                  </div>
                </div>

                {/* Stil (Temalar) */}
                <h4 style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '12px' }}>Tema Stili</h4>
                <div className={styles.themeGrid}>
                  <div
                    className={`${styles.themeOption} ${theme === 'classic' ? styles.active : ''}`}
                    onClick={() => setTheme('classic')}
                  >
                    <div className={styles.themePreviewCircle} style={{ background: '#6366f1' }} />
                    <span className={styles.themeName}>Klasik</span>
                  </div>

                  <div
                    className={`${styles.themeOption} ${theme === 'nature' ? styles.active : ''}`}
                    onClick={() => setTheme('nature')}
                  >
                    <div className={styles.themePreviewCircle} style={{ background: '#10b981' }} />
                    <span className={styles.themeName}>Doğa</span>
                  </div>

                  <div
                    className={`${styles.themeOption} ${theme === 'lovely' ? styles.active : ''}`}
                    onClick={() => setTheme('lovely')}
                  >
                    <div className={styles.themePreviewCircle} style={{ background: '#f43f5e' }} />
                    <span className={styles.themeName}>Sevecen</span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── GENEL AYARLAR (Placeholderlar) ─────────────────────────────────── */}
      <div className={styles.sectionCard}>
        <div 
          className={styles.sectionHeader} 
          onClick={() => toggleSection('settings')}
          style={{ cursor: 'pointer' }}
        >
          <h3 className={styles.sectionTitle}>
            <span className={styles.sectionIcon}>⚙️</span> Hesap & Tercihler
          </h3>
          <ChevronIcon isOpen={openSections.settings} />
        </div>

        <AnimatePresence>
          {openSections.settings && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              style={{ overflow: 'hidden' }}
            >
              <div className={styles.sectionBody}>
                <div className={styles.settingItem}>
                  <span className={styles.settingLabel}>Bildirimler</span>
                  <span className={styles.settingValue}>Açık</span>
                </div>
                <div className={styles.settingItem}>
                  <span className={styles.settingLabel}>Dil / Bölge</span>
                  <span className={styles.settingValue}>Türkçe (TR)</span>
                </div>
                <div className={styles.settingItem}>
                  <span className={styles.settingLabel}>Uygulama Sürümü</span>
                  <span className={styles.settingValue}>v1.0.0 (Faz 2)</span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

export default Profile;
