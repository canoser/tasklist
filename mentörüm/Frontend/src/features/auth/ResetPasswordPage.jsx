import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { apiClient } from '../../api/apiClient';
import Button from '../../components/common/Button/Button';
import Input from '../../components/common/Input/Input';
import Card from '../../components/common/Card/Card';
import ThemeDecorContainer from '../../components/common/ThemeDecor/ThemeDecorContainer';
import ThemeSelector from '../../components/common/ThemeSelector/ThemeSelector';
import styles from './LoginPage.module.css';

const ResetPasswordPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (!token) {
      setError('Geçersiz veya eksik sıfırlama bağlantısı. Lütfen e-postanızdaki bağlantıyı kontrol edin.');
      return;
    }

    if (newPassword.length < 6) {
      setError('Şifre en az 6 karakter olmalıdır.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Şifreler birbiriyle eşleşmiyor.');
      return;
    }

    setIsLoading(true);
    try {
      await apiClient.post('/auth/reset-password', {
        token,
        newPassword,
      });

      setSuccessMsg('Şifreniz başarıyla sıfırlandı! Giriş sayfasına yönlendiriliyorsunuz...');
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (err) {
      const msg = err?.response?.data?.error || 'Şifre sıfırlanamadı. Bağlantının süresi dolmuş olabilir.';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.pageContainer}>
      <ThemeDecorContainer />

      <div style={{ position: 'fixed', top: '18px', right: '18px', zIndex: 100 }}>
        <ThemeSelector />
      </div>

      <div className={styles.bgCircle1}></div>
      <div className={styles.bgCircle2}></div>

      <div className={styles.contentWrapper}>
        <div className={styles.brandSection}>
          <h1 className={styles.logo}>Mentörüm</h1>
          <p className={styles.slogan}>Yeni şifrenizi belirleyin.</p>
        </div>

        <Card className={styles.loginCard} padding="lg">
          <h2 className={styles.formTitle}>Şifre Sıfırlama</h2>
          <p className={styles.formSubtitle}>Lütfen yeni şifrenizi girin.</p>

          <form onSubmit={handleSubmit} className={styles.form}>
            <Input
              label="Yeni Şifre"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="••••••••"
              required
              icon={<span role="img" aria-label="lock">🔒</span>}
            />

            <Input
              label="Yeni Şifre (Tekrar)"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              required
              icon={<span role="img" aria-label="lock">🔒</span>}
            />

            {error && <div className={styles.errorBox}>{error}</div>}
            {successMsg && (
              <div
                style={{
                  color: 'var(--color-success, #22c55e)',
                  padding: '10px',
                  backgroundColor: 'rgba(34, 197, 94, 0.1)',
                  borderRadius: '8px',
                  fontSize: '14px',
                  marginBottom: '15px',
                }}
              >
                {successMsg}
              </div>
            )}

            <Button type="submit" fullWidth size="lg" isLoading={isLoading}>
              Şifreyi Güncelle
            </Button>
          </form>

          <div style={{ textAlign: 'center', marginTop: '15px', fontSize: '14px' }}>
            <a
              href="#login"
              onClick={(e) => {
                e.preventDefault();
                navigate('/login');
              }}
              style={{ color: 'var(--color-primary, #6366f1)', fontWeight: 'bold' }}
            >
              ← Giriş Sayfasına Dön
            </a>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default ResetPasswordPage;
