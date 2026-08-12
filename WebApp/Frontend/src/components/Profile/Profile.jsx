import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import styles from './Profile.module.css';
import RoleTagSelect from './RoleTagSelect';
import { useTranslation } from 'react-i18next';
import i18n from '../../i18n';
import storage from '../../utils/storage';
import { logoutUser } from '../../services/authService';
import AccountModal from './AccountModal';
import DropdownSelect from '../Common/DropdownSelect/DropdownSelect';

const ChevronIcon = ({ isOpen }) => (
  <svg 
    width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.3s ease', color: 'var(--text-secondary)' }}
  >
    <polyline points="6 9 12 15 18 9"></polyline>
  </svg>
);

const PRESET_AVATARS = ['🎓', '🦊', '🚀', '⚡', '🌟', '🎯', '🦁', '💡'];

const Profile = ({ user, guestName, appearance, onToggleAppearance, theme, setTheme, tone, onToneChange, openAuth, navigateToAdmin }) => {
  const { t } = useTranslation('profile');
  const [openSections, setOpenSections] = useState({ theme: false, settings: false, roles: false });
  const [customAvatar, setCustomAvatar] = useState(storage.getString('user_avatar') || '');
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [localGuestName, setLocalGuestName] = useState(guestName || storage.getString('guest_name') || '');
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [showRoleInfo, setShowRoleInfo] = useState(false);

  const toggleSection = (sec) => setOpenSections(prev => ({ ...prev, [sec]: !prev[sec] }));

  const displayName = user?.displayName || user?.email?.split('@')[0] || localGuestName || t('default_username');
  const initial = displayName.charAt(0).toUpperCase();

  const handleEditName = () => {
    const promptMsg = t('edit_name_prompt', { context: tone, defaultValue: 'Lütfen yeni isminizi girin:' });
    // [MOBILE_PORT_TODO]: Native mobil uygulamalarda window.prompt arayüzü dondurur ve ekranda görünmez.
    // Bunun yerine uygulama içinde özel bir Modal veya Dialog (örn. <EditNameModal>) bileşeni kullanılmalıdır.
    const newName = window.prompt(promptMsg, displayName);
    if (newName && newName.trim()) {
      const trimmed = newName.trim();
      storage.setString('guest_name', trimmed);
      setLocalGuestName(trimmed);
      window.dispatchEvent(new Event('storage'));
    }
  };

  const handleSelectAvatar = (emoji) => {
    setCustomAvatar(emoji);
    storage.setString('user_avatar', emoji);
    setShowAvatarPicker(false);
  };

  return (
    <motion.div
      className={styles.profileContainer}
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
    >
      {/* ── Kullanıcı Kartı ─────────────────────────────────────────────────── */}
      <div className={styles.userCard}>
        {user?.photoURL ? (
          <img src={user.photoURL} className={styles.avatarImg} alt={displayName} />
        ) : (
          <div 
            className={`${styles.avatar} ${styles.avatarClickable}`}
            onClick={() => setShowAvatarPicker(!showAvatarPicker)}
            title={t('avatar_picker_title', { context: tone, defaultValue: 'Profil Avatarı Seçin' })}
          >
            {customAvatar || initial}
            <span className={styles.avatarBadge}>✏️</span>
          </div>
        )}

        <div className={styles.userInfo}>
          <div className={styles.userNameRow}>
            <h2 className={styles.userName}>{displayName}</h2>
            {!user && (
              <button 
                className={styles.editNameBtn} 
                onClick={handleEditName}
                title="İsmi Düzenle"
              >
                ✏️
              </button>
            )}
          </div>

          <span className={styles.userEmail}>{user?.email || t('default_email')}</span>

          <div className={styles.userBadgeRow}>
            {user ? (
              <span className={styles.roleBadge}>{t('role_badge', { context: tone })}</span>
            ) : (
              <span className={styles.guestBadge}>{t('badge_guest', { context: tone })}</span>
            )}
            <button className={styles.accountBtn} onClick={() => setIsAccountModalOpen(true)}>
              ⚙️ {t('account_title', { defaultValue: 'Hesabım' })}
            </button>
            {user?.email === 'canoser@gmail.com' && (
              <button 
                className={styles.accountBtn} 
                onClick={navigateToAdmin}
                style={{ background: 'var(--accent-color, #ff3366)', color: 'white' }}
              >
                🔐 Yönetim Paneli
              </button>
            )}
            {user && (
              <button className={styles.logoutCardBtn} onClick={logoutUser}>
                🚪 {t('logout', { ns: 'common', context: tone, defaultValue: 'Çıkış Yap' })}
              </button>
            )}
          </div>
        </div>
      </div>

      <AccountModal 
        isOpen={isAccountModalOpen} 
        onClose={() => setIsAccountModalOpen(false)} 
        user={user} 
        openAuth={openAuth} 
      />

      {/* Avatar Seçim Paneli */}
      {showAvatarPicker && !user?.photoURL && (
        <motion.div 
          className={styles.sectionCard}
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <span className={styles.settingLabel}>{t('avatar_picker_title', { context: tone, defaultValue: 'Profil Avatarı Seçin' })}</span>
          <div className={styles.avatarPickerGrid}>
            {PRESET_AVATARS.map((emoji) => (
              <div 
                key={emoji} 
                className={styles.avatarOption} 
                onClick={() => handleSelectAvatar(emoji)}
              >
                {emoji}
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* ── Kayıt Teşvik Kartı (Cloud Sync Banner - Sadece Misafirler İçin) ───── */}
      {!user && (
        <div className={styles.cloudBanner}>
          <div className={styles.cloudBannerHeader}>
            <span className={styles.cloudBannerText}>
              ☁️ {t('cloud_banner_text', { context: tone })}
            </span>
          </div>
          <button className={styles.cloudBannerBtn} onClick={openAuth}>
            {t('cloud_banner_btn', { context: tone, defaultValue: 'Kayıt Ol / Giriş Yap' })}
          </button>
        </div>
      )}

      {/* ── TEMA BÖLÜMÜ ─────────────────── */}
      <div className={styles.sectionCard}>
        <div 
          className={styles.sectionHeader} 
          onClick={() => toggleSection('theme')}
          style={{ cursor: 'pointer' }}
        >
          <h3 className={styles.sectionTitle}>
            <span className={styles.sectionIcon}>🎨</span> {t('section_theme', { context: tone })}
          </h3>
          <ChevronIcon isOpen={openSections.theme} />
        </div>

        <AnimatePresence>
          {openSections.theme && (
            <motion.div
              initial={{ height: 0, opacity: 0, overflow: 'hidden' }}
              animate={{ height: 'auto', opacity: 1, transitionEnd: { overflow: 'visible' } }}
              exit={{ height: 0, opacity: 0, overflow: 'hidden' }}
            >
              <div className={styles.sectionBody}>
                <p className={styles.themeDesc}>
                  {t('theme_desc', { context: tone })}
                </p>

                {/* Görünüm (Aydınlık/Karanlık) */}
                <h4 style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '12px' }}>{t('appearance_mode', { context: tone })}</h4>
                <div className={styles.themeGrid} style={{ marginBottom: '24px' }}>
                  <div
                    className={`${styles.themeOption} ${appearance === 'dark' ? styles.active : ''}`}
                    onClick={onToggleAppearance}
                  >
                    <div
                      className={styles.themePreviewCircle}
                      style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)' }}
                    />
                    <span className={styles.themeName}>{t('theme_dark', { context: tone })}</span>
                  </div>

                  <div
                    className={`${styles.themeOption} ${appearance === 'light' ? styles.active : ''}`}
                    onClick={onToggleAppearance}
                  >
                    <div
                      className={styles.themePreviewCircle}
                      style={{ background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)', border: '1px solid #e2e8f0' }}
                    />
                    <span className={styles.themeName}>{t('theme_light', { context: tone })}</span>
                  </div>
                </div>

                {/* Stil (Temalar) */}
                <h4 style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '12px' }}>{t('theme_style', { context: tone })}</h4>
                <div className={styles.themeGrid}>
                  <div
                    className={`${styles.themeOption} ${theme === 'classic' ? styles.active : ''}`}
                    onClick={() => setTheme('classic')}
                  >
                    <div className={styles.themePreviewCircle} style={{ background: '#6366f1' }} />
                    <span className={styles.themeName}>{t('theme_classic', { context: tone })}</span>
                  </div>

                  <div
                    className={`${styles.themeOption} ${theme === 'nature' ? styles.active : ''}`}
                    onClick={() => setTheme('nature')}
                  >
                    <div className={styles.themePreviewCircle} style={{ background: '#10b981' }} />
                    <span className={styles.themeName}>{t('theme_nature', { context: tone })}</span>
                  </div>

                  <div
                    className={`${styles.themeOption} ${theme === 'lovely' ? styles.active : ''}`}
                    onClick={() => setTheme('lovely')}
                  >
                    <div className={styles.themePreviewCircle} style={{ background: '#f43f5e' }} />
                    <span className={styles.themeName}>{t('theme_lovely', { context: tone })}</span>
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
            <span className={styles.sectionIcon}>⚙️</span> {t('section_settings', { context: tone })}
          </h3>
          <ChevronIcon isOpen={openSections.settings} />
        </div>

        <AnimatePresence>
          {openSections.settings && (
            <motion.div
              initial={{ height: 0, opacity: 0, overflow: 'hidden' }}
              animate={{ height: 'auto', opacity: 1, transitionEnd: { overflow: 'visible' } }}
              exit={{ height: 0, opacity: 0, overflow: 'hidden' }}
            >
              <div className={styles.sectionBody}>
                <div className={styles.settingItem}>
                  <span className={styles.settingLabel}>{t('setting_language', { context: tone })}</span>
                  <DropdownSelect
                    value={i18n.language}
                    onChange={newLang => {
                      storage.setString('planlama_lang', newLang);
                      i18n.changeLanguage(newLang);
                    }}
                    options={[
                      { value: 'tr', label: 'Türkçe' },
                      { value: 'en', label: 'English' },
                      { value: 'es', label: 'Español' },
                      { value: 'fr', label: 'Français' },
                      { value: 'de', label: 'Deutsch' },
                      { value: 'ro', label: 'Română' }
                    ]}
                  />
                </div>
                <div className={styles.settingItem}>
                  <span className={styles.settingLabel}>{t('setting_tone', { context: tone })}</span>
                  <DropdownSelect
                    value={tone}
                    onChange={onToneChange}
                    options={[
                      { value: 'formal', label: t('setting_tone_formal') },
                      { value: 'semi', label: t('setting_tone_semi') },
                      { value: 'buddy', label: t('setting_tone_buddy') }
                    ]}
                  />
                </div>
                <div className={styles.settingItem}>
                  <span className={styles.settingLabel}>{t('setting_version', { context: tone })}</span>
                  <span className={styles.settingValue}>v1.0.0 (Faz 2)</span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── ROLLER BÖLÜMÜ ─────────────────────────────────────────────────── */}
      <div className={styles.sectionCard}>
        <div
          className={styles.sectionHeader}
          onClick={() => toggleSection('roles')}
          style={{ cursor: 'pointer' }}
        >
          <h3 className={styles.sectionTitle}>
            <span className={styles.sectionIcon}>👤</span> {t('section_roles', { context: tone })}
          </h3>
          <ChevronIcon isOpen={openSections.roles} />
        </div>

        <AnimatePresence>
          {openSections.roles && (
            <motion.div
              initial={{ height: 0, opacity: 0, overflow: 'hidden' }}
              animate={{ height: 'auto', opacity: 1, transitionEnd: { overflow: 'visible' } }}
              exit={{ height: 0, opacity: 0, overflow: 'hidden' }}
            >
              <div className={styles.sectionBody}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                  <p className={styles.themeDesc} style={{ marginBottom: 0 }}>
                    {t('roles_desc', { context: tone })}
                  </p>
                  <span 
                    onClick={() => setShowRoleInfo(!showRoleInfo)}
                    style={{ 
                      fontSize: '12px', 
                      color: 'var(--accent-primary, #3b82f6)', 
                      cursor: 'pointer', 
                      fontWeight: '600',
                      whiteSpace: 'nowrap',
                      marginLeft: '12px'
                    }}
                  >
                    {t('roles_how_to_use_link', { defaultValue: 'Nasıl Kullanılır?' })}
                  </span>
                </div>

                <AnimatePresence>
                  {showRoleInfo && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      style={{ overflow: 'hidden', marginBottom: '16px' }}
                    >
                      <div style={{ 
                        padding: '12px', 
                        background: 'var(--bg-primary, #f9fafb)', 
                        border: '1px solid var(--border-color, #e5e7eb)',
                        borderLeft: '4px solid var(--accent-primary, #3b82f6)',
                        borderRadius: '8px',
                        fontSize: '13px',
                        color: 'var(--text-secondary, #4b5563)',
                        lineHeight: '1.5'
                      }}>
                        {t('roles_how_to_use_info', { context: tone, defaultValue: 'Roller, görevlerinizi belirli kimlikler altında (Örn: Öğrenci, Müdür, Baba) organize etmenizi sağlar. Kutucuğa tıklayarak listeden bir rol seçebilir veya kendi özel rolünüzü yazıp Enter tuşuna basarak listeye yeni bir rol ekleyebilirsiniz.' })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <RoleTagSelect userId={user?.id || user?.uid} tone={tone} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

export default Profile;
