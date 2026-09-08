import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import styles from './CoachDashboard.module.css';
import { getCoachDashboard } from '../../services/coachingApi';

export default function CoachDashboard({ user, tone }) {
  const { t } = useTranslation('coaching');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const result = await getCoachDashboard();
        setData(result);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return <div className={styles.loading}>Yükleniyor...</div>;
  }

  return (
    <div className={styles.dashboardContainer}>
      <h2 className={styles.title}>{t('dashboard.title', { context: tone, defaultValue: 'Koçluk Paneli' })}</h2>
      
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <h3>{t('dashboard.totalStudents', { context: tone, defaultValue: 'Toplam Öğrenci' })}</h3>
          <p className={styles.statValue}>{data?.totalStudents || 0}</p>
        </div>
        <div className={styles.statCard}>
          <h3>{t('dashboard.activeTasks', { context: tone, defaultValue: 'Aktif Görevler' })}</h3>
          <p className={styles.statValue}>{data?.activeTasks || 0}</p>
        </div>
        <div className={styles.statCard}>
          <h3>{t('dashboard.unpaidPayments', { context: tone, defaultValue: 'Bekleyen Ödemeler' })}</h3>
          <p className={styles.statValue}>{data?.unpaidPayments || 0}</p>
        </div>
      </div>

      <div className={styles.recentActivity}>
        <h3>Son Etkinlikler & Uyarılar</h3>
        {data?.alerts && data.alerts.length > 0 ? (
          <ul className={styles.alertList}>
            {data.alerts.map((alert, idx) => (
              <li key={idx} className={styles.alertItem}>
                <span className={styles.alertType}>{alert.type}:</span> {alert.message}
              </li>
            ))}
          </ul>
        ) : (
          <p className={styles.emptyState}>Şu an için yeni uyarı yok.</p>
        )}
      </div>
    </div>
  );
}
