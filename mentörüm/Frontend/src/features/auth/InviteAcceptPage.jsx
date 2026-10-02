import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiClient } from '../../api/apiClient';
import { useAuthStore } from './authStore';
import Button from '../../components/common/Button/Button';
import Input from '../../components/common/Input/Input';
import Card from '../../components/common/Card/Card';
import styles from './InviteAcceptPage.module.css';

const InviteAcceptPage = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  
  const [inviteData, setInviteData] = useState(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Sayfa yüklendiğinde token'ı doğrula
  useEffect(() => {
    const fetchInviteInfo = async () => {
      try {
        const response = await apiClient.get(`/invites/${token}`);
        const data = response.data || response;
        setInviteData(data.data); // { email, role, fullName }
      } catch {
        setError('Davetiye geçersiz veya süresi dolmuş.');
      } finally {
        setIsLoading(false);
      }
    };
    
    if (token) fetchInviteInfo();
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Şifreler eşleşmiyor.');
      return;
    }

    if (password.length < 6) {
      setError('Şifre en az 6 karakter olmalıdır.');
      return;
    }

    setIsSubmitting(true);

    try {
      // Daveti kabul et ve şifre belirle
      await apiClient.post(`/invites/${token}/accept`, { password });
      
      // Kayıt başarılı, artık giriş yapabiliriz. 
      // Accept endpoint'i genelde direkt login yapmaz, login sayfasına yönlendiririz
      // ya da response içerisinde auth data geliyorsa otomatik login yaparız.
      // KOD_PLANI'na göre: "Kullanıcı şifre girer... Hesap aktifleşir... Normal login akışına geçilir."
      
      // Kullanıcıyı bilgilendirip login'e atalım.
      alert('Hesabınız başarıyla oluşturuldu! Şimdi giriş yapabilirsiniz.');
      navigate('/login');
      
    } catch (err) {
      setError(err.response?.data?.error?.message || 'İşlem sırasında bir hata oluştu.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <div className={styles.loadingScreen}>Davetiye kontrol ediliyor...</div>;
  }

  return (
    <div className={styles.pageContainer}>
      <div className={styles.bgCircle}></div>

      <div className={styles.contentWrapper}>
        <Card className={styles.inviteCard} padding="lg">
          
          <div className={styles.header}>
            <div className={styles.iconWrapper}>
              🎉
            </div>
            <h2 className={styles.title}>Aramıza Hoş Geldin!</h2>
            {inviteData ? (
              <p className={styles.subtitle}>
                <strong>{inviteData.fullName || inviteData.email}</strong>, Mentörüm uygulamasına 
                {inviteData.role === 'Student' ? ' öğrenci' : ' veli'} olarak davet edildin.
              </p>
            ) : (
              <p className={styles.subtitle}>Davetiye bilgileri alınamadı.</p>
            )}
          </div>

          {error && <div className={styles.errorBox}>{error}</div>}

          {inviteData && !error.includes('geçersiz') && (
            <form onSubmit={handleSubmit} className={styles.form}>
              <div className={styles.infoAlert}>
                Lütfen hesabınızı güvende tutmak için bir şifre belirleyin.
              </div>

              <Input
                label="Yeni Şifre"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />

              <Input
                label="Şifreyi Onayla"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                required
              />

              <div className={styles.actions}>
                <Button 
                  type="submit" 
                  fullWidth 
                  size="lg" 
                  isLoading={isSubmitting}
                >
                  Hesabımı Aktifleştir
                </Button>
              </div>
            </form>
          )}

          {error.includes('geçersiz') && (
            <Button fullWidth onClick={() => navigate('/login')} variant="secondary">
              Giriş Ekranına Dön
            </Button>
          )}

        </Card>
      </div>
    </div>
  );
};

export default InviteAcceptPage;
