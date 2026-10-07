import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from './authStore';
import { apiClient } from '../../api/apiClient';
import Button from '../../components/common/Button/Button';
import Input from '../../components/common/Input/Input';
import Card from '../../components/common/Card/Card';
import styles from './LoginPage.module.css';

const LoginPage = () => {
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const googleButtonRef = useRef(null);

  const redirectByRole = (role) => {
    navigate(
      role === 'Student' ? '/student/home' :
      role === 'Parent' ? '/parent/summary' :
      role === 'Teacher' ? '/teacher/courses' :
      '/coach/dashboard'
    );
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const data = await apiClient.post('/auth/login', { email, password });
      setAuth(data.user, data.accessToken);
      redirectByRole(data.user.role);
    } catch (err) {
      const code = err?.response?.data?.code;
      if (code === 'COACH_PENDING') setError('Hesabınız onay bekliyor. Yönetici onayı sonrası tekrar deneyin.');
      else if (code === 'COACH_REJECTED') setError('Başvurunuz reddedildi.');
      else setError(err.response?.data?.error?.message || 'Giriş başarısız. Lütfen bilgilerinizi kontrol edin.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleCredential = async (response) => {
    setError('');
    setIsLoading(true);
    try {
      const data = await apiClient.post('/auth/google', { idToken: response.credential });
      setAuth(data.user, data.accessToken);
      redirectByRole(data.user.role);
    } catch (err) {
      const code = err?.response?.data?.code;
      if (code === 'COACH_PENDING') setError('Hesabınız onay bekliyor. Yönetici onayı sonrası tekrar deneyin.');
      else if (code === 'COACH_REJECTED') setError('Başvurunuz reddedildi.');
      else setError('Google girişi başarısız. Lütfen tekrar deneyin.');
    } finally {
      setIsLoading(false);
    }
  };

  // [MOBILE_PORT_TODO]: Google Identity Services (GIS) web'e özgüdür; Capacitor native'de
  // @capacitor-community/google-sign-in (veya Firebase Auth native) ile değiştirilmelidir.
  useEffect(() => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (!clientId) return;

    const initGoogle = () => {
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: handleGoogleCredential,
      });
      if (googleButtonRef.current) {
        window.google.accounts.id.renderButton(googleButtonRef.current, {
          theme: 'outline', size: 'large', width: 320,
        });
      }
    };

    if (window.google?.accounts?.id) {
      initGoogle();
    } else {
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = initGoogle;
      document.head.appendChild(script);
    }
  }, []);

  return (
    <div className={styles.pageContainer}>
      {/* Dekoratif Arka Plan Elementleri */}
      <div className={styles.bgCircle1}></div>
      <div className={styles.bgCircle2}></div>

      <div className={styles.contentWrapper}>
        <div className={styles.brandSection}>
          <h1 className={styles.logo}>Mentörüm</h1>
          <p className={styles.slogan}>Sınavlara hazırlık sürecindeki en iyi rehberin.</p>
        </div>

        <Card className={styles.loginCard} padding="lg">
          <h2 className={styles.formTitle}>Hoş Geldiniz</h2>
          <p className={styles.formSubtitle}>Hesabınıza giriş yaparak devam edin.</p>

          <form onSubmit={handleLogin} className={styles.form}>
            <Input
              label="E-posta Adresi"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ornek@email.com"
              required
              icon={<span role="img" aria-label="email">✉️</span>}
            />

            <Input
              label="Şifre"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              icon={<span role="img" aria-label="lock">🔒</span>}
            />

            {error && <div className={styles.errorBox}>{error}</div>}

            <div className={styles.forgotPassword}>
              <a href="#forgot" onClick={(e) => { e.preventDefault(); alert('Yakında eklenecek!'); }}>
                Şifremi Unuttum
              </a>
            </div>

            <Button 
              type="submit" 
              fullWidth 
              size="lg" 
              isLoading={isLoading}
            >
              Giriş Yap
            </Button>
          </form>

          <div className={styles.divider}>
            <span>veya</span>
          </div>

          <div ref={googleButtonRef} style={{ display: 'flex', justifyContent: 'center', minHeight: 40 }} />
        </Card>
      </div>
    </div>
  );
};

export default LoginPage;
