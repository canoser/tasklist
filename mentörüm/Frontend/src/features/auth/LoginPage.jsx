import React, { useState } from 'react';
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

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      // GEÇİCİ BYPASS (Sadece UI Testi İçin - Backend DB olmadan girebilmek adına)
      if (email === 'test@coach.com' || email === 'test@student.com') {
        const fakeRole = email.includes('coach') ? 'Coach' : 'Student';
        const fakeUser = { id: 'test-1', email, role: fakeRole, fullName: 'Test Kullanıcısı' };
        setAuth(fakeUser, 'fake-token');
        navigate(fakeRole === 'Student' ? '/student/home' : '/coach/dashboard');
        return;
      }

      const response = await apiClient.post('/auth/login', { email, password });
      // API yanıtına göre data extraction
      const data = response.data || response;
      
      setAuth(data.user, data.accessToken);
      
      // Role göre yönlendir
      navigate(data.user.role === 'Student' ? '/student/home' : '/coach/dashboard');
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Giriş başarısız. Lütfen bilgilerinizi kontrol edin.');
    } finally {
      setIsLoading(false);
    }
  };

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

          <Button 
            variant="outline" 
            fullWidth 
            size="md"
            onClick={() => alert('Google girişi yakında eklenecek!')}
            className={styles.googleBtn}
          >
            <span className={styles.googleIcon}>G</span>
            Google ile Giriş Yap
          </Button>
        </Card>
      </div>
    </div>
  );
};

export default LoginPage;
