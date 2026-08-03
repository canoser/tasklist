import { useState } from 'react';
import BaseModal from '../Common/BaseModal';
import { CloseIcon, AlertIcon } from '../Common/Icons';
import styles from './AccountModal.module.css';
import { useTranslation } from 'react-i18next';
import apiClient from '../../services/apiClient';
import storage from '../../utils/storage';
import { logoutUser } from '../../services/authService';

const AccountModal = ({ isOpen, onClose, user, openAuth }) => {
  const { t } = useTranslation('profile');
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  if (!isOpen) return null;

  const handleDeleteAccount = async () => {
    if (!deleteConfirm) return;
    
    // Güvenlik uyarısı
    // [MOBILE_PORT_TODO]: window.confirm arayüzü dondurur, özel Modal kullanılmalı
    const confirmPrompt = window.confirm("Tüm verileriniz kalıcı olarak silinecek. Bu işlem geri alınamaz. Emin misiniz?");
    if (!confirmPrompt) return;

    setIsDeleting(true);
    try {
      if (user) {
        // 1. Backend'den kullanıcı ve tüm verilerini sil
        await apiClient.delete('/users/me');
      } else {
        // Misafir ise sadece yerel verileri temizle
        storage.remove('guest_tasks');
        storage.remove('guest_name');
      }
      
      // Çıkış yap
      await logoutUser();
      await logoutUser();
    } catch (error) {
      console.error("Hesap silinirken hata:", error);
      alert("Güvenlik nedeniyle hesabınızı silmek için son girişinizden bu yana kısa bir süre geçmiş olması gerekir. Lütfen çıkış yapıp tekrar giriş yapın ve tekrar deneyin.");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleExportData = () => {
    alert("Bu özellik Premium planda aktiftir. Yakında sizlerle!");
  };

  const handleResetData = () => {
    // [MOBILE_PORT_TODO]: window.confirm arayüzü dondurur, özel Modal kullanılmalı
    const confirmPrompt = window.confirm("Mevcut tüm görev ve takvim verileriniz sıfırlanacak. Emin misiniz?");
    if (confirmPrompt) {
      // Sadece frontend mock
      alert("Görev verileri sıfırlandı. (Mock)");
    }
  };

  return (
    <BaseModal isOpen={isOpen} onClose={onClose}>
      <div className={styles.scrollableContainer}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>{t('account_title', { defaultValue: 'Hesabım' })}</h2>
          <button className={styles.closeBtn} onClick={onClose}><CloseIcon /></button>
        </div>

        {/* Misafir Kullanıcı Yükseltme */}
        {!user && (
          <div className={styles.upgradeCard}>
            <div className={styles.upgradeText}>
              <span className={styles.upgradeTitle}>Verilerinizi Bulutta Saklayın</span>
              <span className={styles.upgradeDesc}>Cihazınız bozulursa verileriniz kaybolabilir.</span>
            </div>
            <button className={styles.upgradeBtn} onClick={() => { onClose(); openAuth(); }}>Kayıt Ol</button>
          </div>
        )}

        {/* Kimlik ve Güvenlik */}
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>Kimlik ve Güvenlik</h3>
          
          <div className={styles.settingItem}>
            <div className={styles.settingInfo}>
              <span className={styles.settingLabel}>Giriş Yöntemi</span>
              <span className={styles.settingDesc}>
                {user ? (user.providerData?.[0]?.providerId === 'google.com' ? 'Google ile Bağlandı' : 'E-posta ile Bağlandı') : 'Misafir (Yerel Cihaz)'}
              </span>
            </div>
          </div>

          {user && user.providerData?.[0]?.providerId === 'password' && (
            <div className={styles.settingItem}>
              <div className={styles.settingInfo}>
                <span className={styles.settingLabel}>Şifre Değiştir</span>
              </div>
              <button className={styles.actionBtn}>Güncelle</button>
            </div>
          )}
        </div>

        {/* Abonelik ve Depolama */}
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>Abonelik & Depolama</h3>
          
          <div className={styles.settingItem} style={{ alignItems: 'flex-start' }}>
            <div className={styles.settingInfo} style={{ width: '100%' }}>
              <span className={styles.settingLabel}>
                PlanlamaApp Standart
              </span>
              <span className={styles.settingDesc}>Bulutta 15 MB / 100 MB kullanılıyor</span>
              <div className={styles.storageBarContainer}>
                <div className={styles.storageBarFill} style={{ width: '15%' }}></div>
              </div>
            </div>
          </div>
        </div>

        {/* Veri ve Gizlilik Merkezi */}
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>Veri ve Gizlilik Merkezi</h3>
          
          <div className={styles.settingItem}>
            <div className={styles.settingInfo}>
              <span className={styles.settingLabel}>
                Verilerimi İndir
                <span className={styles.premiumBadge}>👑 PREMİUM</span>
              </span>
              <span className={styles.settingDesc}>Tüm istatistikleri PDF/CSV olarak dışa aktar</span>
            </div>
            <button className={styles.actionBtn} onClick={handleExportData}>İndir</button>
          </div>

          <div className={styles.settingItem}>
            <div className={styles.settingInfo}>
              <span className={styles.settingLabel}>Verilerimi Sıfırla</span>
              <span className={styles.settingDesc}>Sadece görev ve takvim kayıtlarını siler</span>
            </div>
            <button className={styles.actionBtn} onClick={handleResetData}>Sıfırla</button>
          </div>
        </div>

        {/* Tehlike Alanı (App Store Kuralı) */}
        <div className={styles.section}>
          <div className={styles.dangerZone}>
            <div className={styles.dangerTitle}><AlertIcon /> Hesabı Kalıcı Olarak Sil</div>
            <div className={styles.dangerDesc}>
              Hesabınızı silmek, geri dönüşü olmayan bir işlemdir. 
              Firebase kimliğiniz, veritabanı kayıtlarınız ve çalışma alanlarınız tamamen yok edilecektir.
            </div>
            <div className={styles.dangerCheckboxRow}>
              <input 
                type="checkbox" 
                id="confirmDelete" 
                className={styles.dangerCheckbox}
                checked={deleteConfirm}
                onChange={(e) => setDeleteConfirm(e.target.checked)}
              />
              <label htmlFor="confirmDelete" className={styles.dangerCheckboxLabel}>
                Tüm verilerimin kalıcı olarak silinmesini onaylıyorum.
              </label>
            </div>
            <button 
              className={styles.deleteBtn} 
              disabled={!deleteConfirm || isDeleting}
              onClick={handleDeleteAccount}
            >
              {isDeleting ? 'Siliniyor...' : 'Hesabımı Sil'}
            </button>
          </div>
        </div>
      </div>
    </BaseModal>
  );
};

export default AccountModal;
