import { useState } from 'react';
import styles from './AuthModal.module.css';
import { loginWithGoogle, loginWithEmail, registerWithEmail } from '../../services/authService';

export default function AuthModal({ isOpen, onClose }) {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleGoogleLogin = async () => {
    setError(null);
    setLoading(true);
    const { user, error } = await loginWithGoogle();
    setLoading(false);
    if (error) {
      setError(error);
    } else if (user) {
      onClose();
    }
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
            {isRegister ? 'Hesap Oluştur' : 'Giriş Yap'}
          </h2>
          <p className={styles.subtitle}>
            PlanlamaApp SaaS Platformuna Hoş Geldiniz
          </p>
        </div>

        {error && <div className={styles.errorAlert}>{error}</div>}

        <button className={styles.googleBtn} onClick={handleGoogleLogin} disabled={loading}>
          <svg width="18" height="18" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"/>
            <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.15C3.26 21.3 7.31 24 12 24z"/>
            <path fill="#FBBC05" d="M5.28 14.24c-.25-.72-.38-1.49-.38-2.24s.13-1.52.38-2.24V6.61H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.39l3.99-3.15z"/>
            <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.61l3.99 3.15c.95-2.85 3.6-4.96 6.72-4.96z"/>
          </svg>
          Google ile Devam Et
        </button>

        <div className={styles.divider}>
          <span>veya e-posta ile</span>
        </div>

        <form onSubmit={handleSubmit}>
          <div className={styles.formGroup}>
            <label className={styles.label}>E-Posta Adresi</label>
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
            <label className={styles.label}>Şifre</label>
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
            {loading ? 'İşleniyor...' : (isRegister ? 'Kayıt Ol' : 'Giriş Yap')}
          </button>
        </form>

        <div className={styles.toggleMode}>
          {isRegister ? 'Zaten hesabınız var mı?' : 'Hesabınız yok mu?'}
          <span 
            className={styles.toggleLink} 
            onClick={() => { setIsRegister(!isRegister); setError(null); }}
          >
            {isRegister ? 'Giriş Yap' : 'Kayıt Ol'}
          </span>
        </div>
      </div>
    </div>
  );
}
