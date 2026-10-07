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
  
  const [isRegister, setIsRegister] = useState(false);
  const [isForgot, setIsForgot] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('Coach');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const googleButtonRef = useRef(null);

  const redirectByRole = (role) => {
    navigate(
      role === 'Student' ? '/student/home' :
      role === 'Parent' ? '/parent/summary' :
      role === 'Teacher' ? '/teacher/courses' :
      '/coach/dashboard'  // Coach + Admin (süper yönetici)
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setIsLoading(true);

    try {
      if (isForgot) {
        await apiClient.post('/auth/forgot-password', { email });
        setSuccessMsg('Eğer e-posta kayıtlıysa şifre sıfırlama bağlantısı gönderildi.');
        setIsForgot(false);
        return;
      }

      if (isRegister) {
        const data = await apiClient.post('/auth/register', { email, password, fullName, role });
        if (data.pendingApproval) {
          setSuccessMsg('Kayıt başarılı! Yönetici onayından sonra giriş yapabilirsiniz.');
          setIsRegister(false);
          setPassword('');
        } else {
          setAuth(data.user, data.accessToken);
          redirectByRole(data.user.role);
        }
      } else {
        const data = await apiClient.post('/auth/login', { email, password });
        setAuth(data.user, data.accessToken);
        redirectByRole(data.user.role);
      }
    } catch (err) {
      const code = err?.response?.data?.code;
      if (code === 'PENDING_APPROVAL') setError('Hesabınız onay bekliyor. Yönetici onayı sonrası tekrar deneyin.');
      else if (code === 'COACH_REJECTED') setError('Başvurunuz reddedildi.');
      else setError(err.response?.data?.error || err.response?.data?.error?.message || (isRegister ? 'Kayıt başarısız.' : 'Giriş başarısız. Bilgilerinizi kontrol edin.'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleCredential = async (response) => {
    setError('');
    setSuccessMsg('');
    setIsLoading(true);
    try {
      const data = await apiClient.post('/auth/google', { idToken: response.credential });
      if (data.pendingApproval) {
        setSuccessMsg('Kayıt başarılı! Yönetici onayından sonra giriş yapabilirsiniz.');
      } else {
        setAuth(data.user, data.accessToken);
        redirectByRole(data.user.role);
      }
    } catch (err) {
      const code = err?.response?.data?.code;
      if (code === 'PENDING_APPROVAL') setError('Hesabınız onay bekliyor. Yönetici onayı sonrası tekrar deneyin.');
      else if (code === 'COACH_REJECTED') setError('Başvurunuz reddedildi.');
      else setError('Google işlemi başarısız. Lütfen tekrar deneyin.');
    } finally {
      setIsLoading(false);
    }
  };

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
          theme: 'outline', size: 'large', width: 320, text: isRegister ? 'signup_with' : 'signin_with'
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
  }, [isRegister]); // isRegister değiştiğinde Google buton metnini güncelle

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
          <h2 className={styles.formTitle}>{isForgot ? 'Şifremi Unuttum' : isRegister ? 'Kayıt Ol' : 'Hoş Geldiniz'}</h2>
          <p className={styles.formSubtitle}>
            {isRegister ? 'Aramıza katılmak için hesap oluşturun.' : 'Hesabınıza giriş yaparak devam edin.'}
          </p>

          <form onSubmit={handleSubmit} className={styles.form}>
            {isRegister && (
              <Input
                label="Ad Soyad"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Örn: Ahmet Yılmaz"
                required
                icon={<span role="img" aria-label="user">👤</span>}
              />
            )}

            {isRegister && (
              <div className={styles.roleGroup} style={{ marginBottom: '14px' }}>
                <label className={styles.roleLabel} style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '8px' }}>Ben:</label>
                {['Student', 'Parent', 'Coach'].map((r) => (
                  <label key={r} style={{ display: 'inline-flex', alignItems: 'center', marginRight: '16px', fontSize: '14px', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="role"
                      value={r}
                      checked={role === r}
                      onChange={() => setRole(r)}
                      style={{ marginRight: '6px' }}
                    />
                    {{ Student: 'Öğrenciyim', Parent: 'Veliyim', Coach: 'Koçum' }[r]}
                  </label>
                ))}
              </div>
            )}

            <Input
              label="E-posta Adresi"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ornek@email.com"
              required
              icon={<span role="img" aria-label="email">✉️</span>}
            />

            {!isForgot && (
              <Input
                label="Şifre"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                icon={<span role="img" aria-label="lock">🔒</span>}
              />
            )}

            {error && <div className={styles.errorBox}>{error}</div>}
            {successMsg && <div className={styles.successBox} style={{ color: 'green', padding: '10px', backgroundColor: '#e6ffe6', borderRadius: '8px', fontSize: '14px', marginBottom: '15px' }}>{successMsg}</div>}

            {!isRegister && !isForgot && (
              <div className={styles.forgotPassword}>
                <a href="#forgot" onClick={(e) => { e.preventDefault(); setIsForgot(true); setError(''); setSuccessMsg(''); }}>
                  Şifremi Unuttum
                </a>
              </div>
            )}

            {isForgot && (
              <div className={styles.forgotPassword}>
                <a href="#login" onClick={(e) => { e.preventDefault(); setIsForgot(false); }}>
                  ← Girişe Dön
                </a>
              </div>
            )}

            <Button 
              type="submit" 
              fullWidth 
              size="lg" 
              isLoading={isLoading}
            >
              {isForgot ? 'Gönder' : isRegister ? 'Kayıt Ol' : 'Giriş Yap'}
            </Button>
          </form>

          <div style={{ textAlign: 'center', marginTop: '15px', fontSize: '14px' }}>
            {isRegister ? (
              <span>Zaten hesabınız var mı? <a href="#login" onClick={(e) => { e.preventDefault(); setIsRegister(false); setError(''); setSuccessMsg(''); }} style={{ color: 'var(--primary-color)', fontWeight: 'bold' }}>Giriş Yap</a></span>
            ) : (
              <span>Hesabınız yok mu? <a href="#register" onClick={(e) => { e.preventDefault(); setIsRegister(true); setError(''); setSuccessMsg(''); }} style={{ color: 'var(--primary-color)', fontWeight: 'bold' }}>Kayıt Ol</a></span>
            )}
          </div>

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
