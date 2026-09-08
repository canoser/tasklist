import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import styles from './SharedViewScreen.module.css';
import { authSharedLink, getSharedLinkData } from '../../services/coachingApi';
import WeeklySchedule from './WeeklySchedule';

export default function SharedViewScreen({ tone }) {
  const { t } = useTranslation('coaching');
  const [token, setToken] = useState('');
  const [pin, setPin] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const authResult = await authSharedLink(token, pin);
      
      if (authResult.isValid) {
        setIsAuthenticated(true);
        // Get data
        const sharedData = await getSharedLinkData(token, pin);
        setData(sharedData);
      } else {
        setError('Token veya PIN hatalı.');
      }
    } catch (err) {
      if (err.response && err.response.status === 403) {
        setError('Token veya PIN hatalı. Çok fazla deneme yapıldıysa kilitlenmiş olabilirsiniz.');
      } else {
        setError('Doğrulama sırasında bir hata oluştu.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className={styles.container}>
        <div className={styles.authBox}>
          <h3>Veli / Öğretmen Girişi</h3>
          <p>Lütfen size verilen Link Token ve PIN kodunu giriniz.</p>
          <form onSubmit={handleLogin} className={styles.form}>
            <div className={styles.formGroup}>
              <label>Token</label>
              <input type="text" value={token} onChange={e => setToken(e.target.value)} required placeholder="1234-abcd" />
            </div>
            <div className={styles.formGroup}>
              <label>PIN (Eğer varsa)</label>
              <input type="password" value={pin} onChange={e => setPin(e.target.value)} placeholder="Opsiyonel" />
            </div>
            {error && <div className={styles.error}>{error}</div>}
            <button type="submit" disabled={loading} className={styles.submitBtn}>
              {loading ? 'Doğrulanıyor...' : 'Giriş Yap'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (!data) return <div className={styles.loading}>Veriler yükleniyor...</div>;

  return (
    <div className={styles.container}>
      <div className={styles.dashboard}>
        <header className={styles.header}>
          <h2>{data.studentName} - Gelişim Raporu</h2>
          <span className={styles.roleBadge}>{data.role} Erişimi</span>
        </header>

        <div className={styles.section}>
          <h3>Özet</h3>
          <div className={styles.statsRow}>
            <div className={styles.statCard}>
              <span className={styles.statLabel}>Tamamlanan Görevler</span>
              <span className={styles.statValue}>{data.stats?.completedTasks || 0}</span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statLabel}>Güncel Seri</span>
              <span className={styles.statValue}>{data.stats?.currentStreak || 0}</span>
            </div>
          </div>
        </div>

        <div className={styles.section}>
          <h3>Haftalık Program</h3>
          <WeeklySchedule studentId={data.studentProfileId} tone={tone} readOnly={data.role === 'Parent'} />
        </div>

      </div>
    </div>
  );
}
