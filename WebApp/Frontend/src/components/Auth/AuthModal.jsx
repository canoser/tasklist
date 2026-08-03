import { useState } from 'react';
import styles from './AuthModal.module.css';
import { loginWithGoogle, loginWithEmail, registerWithEmail } from '../../services/authService';
import { useTranslation } from 'react-i18next';
import { GoogleLogin } from '@react-oauth/google';

export default function AuthModal({ isOpen, onClose, tone }) {
  const { t } = useTranslation('auth');
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleGoogleSuccess = async (credentialResponse) => {
    setError(null);
    setLoading(true);
    const { user, error } = await loginWithGoogle(credentialResponse.credential);
    setLoading(false);
    if (error) {
      setError(typeof error === 'string' ? error : 'Google ile giriş başarısız.');
    } else if (user) {
      onClose();
    }
  };

  const handleGoogleError = () => {
    setError('Google oturum açma işlemi iptal edildi veya başarısız oldu.');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    let res;
    if (isRegister) {
      res = await registerWithEmail(email, password);
    } else {
      res = await loginWithEmail(email, password);
    }

    setLoading(false);
    if (res.error) {
      setError(res.error);
    } else if (res.user) {
      onClose();
    }
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2 className={styles.title}>
            {isRegister ? t('register_title', { context: tone, defaultValue: 'Hesap Oluştur' }) : t('login_title', { context: tone, defaultValue: 'Giriş Yap' })}
          </h2>
          <p className={styles.subtitle}>
            {t('auth_subtitle', { context: tone, defaultValue: 'PlanlamaApp SaaS Platformuna Hoş Geldiniz' })}
          </p>
        </div>

        {error && <div className={styles.errorAlert}>{error}</div>}

        <div className={styles.googleBtnContainer} style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
          <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={handleGoogleError}
            useOneTap
            text="continue_with"
            locale="tr"
          />
        </div>

        <div className={styles.divider}>
          <span>{t('or_with_email', { context: tone, defaultValue: 'veya e-posta ile' })}</span>
        </div>

        <form onSubmit={handleSubmit}>
          <div className={styles.formGroup}>
            <label className={styles.label}>{t('email_label', { context: tone, defaultValue: 'E-Posta Adresi' })}</label>
            <input 
              type="email" 
              className={styles.input} 
              placeholder="ornek@domain.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>{t('password_label', { context: tone, defaultValue: 'Şifre' })}</label>
            <input 
              type="password" 
              className={styles.input} 
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button type="submit" className={styles.submitBtn} disabled={loading}>
            {loading ? t('loading', { ns: 'common', defaultValue: 'İşleniyor...' }) : (isRegister ? t('btn_register', { context: tone, defaultValue: 'Kayıt Ol' }) : t('btn_login', { context: tone, defaultValue: 'Giriş Yap' }))}
          </button>
        </form>

        <div className={styles.toggleMode}>
          <span 
            className={styles.toggleLink} 
            onClick={() => { setIsRegister(!isRegister); setError(null); }}
          >
            {isRegister ? t('switch_to_login', { context: tone, defaultValue: 'Zaten hesabınız var mı? Giriş Yap' }) : t('switch_to_register', { context: tone, defaultValue: 'Hesabınız yok mu? Kayıt Ol' })}
          </span>
        </div>
      </div>
    </div>
  );
}
