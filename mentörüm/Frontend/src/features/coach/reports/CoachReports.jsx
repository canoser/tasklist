import React from 'react';
import Card from '../../../components/common/Card/Card';
import styles from './CoachReports.module.css';
import { useReportsOverview } from '../coachApi';

const CoachReports = () => {
  const { data: report, isLoading, isError } = useReportsOverview();

  if (isLoading) return <div className={styles.pageContainer}>Raporlar Yükleniyor...</div>;
  if (isError) return <div className={styles.pageContainer}>Raporlar alınırken bir hata oluştu.</div>;

  const hasStudents = (report?.totalStudents || 0) > 0;

  return (
    <div className={styles.pageContainer}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Raporlar ve Analizler</h1>
          <p className={styles.subtitle}>Öğrenci performanslarını detaylı olarak inceleyin.</p>
        </div>
      </header>

      {!hasStudents ? (
        <Card className={styles.emptyCard}>
          <div style={{ textAlign: 'center', padding: '24px' }}>
            <div style={{ fontSize: '2rem' }}>📊</div>
            <h3 style={{ margin: '8px 0' }}>Henüz rapor verisi yok</h3>
            <p style={{ color: '#64748b', margin: 0 }}>Raporlar, öğrencilerinize ödev atadıktan sonra oluşur.</p>
          </div>
        </Card>
      ) : (
        <div className={styles.grid}>
          <Card title="Bu Hafta Genel Durum">
            <div className={styles.summaryStats}>
              <div className={styles.statBox}>
                <span className={styles.statLabel}>Toplam Öğrenci</span>
                <span className={styles.statNumber}>{report?.totalStudents || 0}</span>
              </div>
              <div className={styles.statBox}>
                <span className={styles.statLabel}>Bu Hafta Verilen</span>
                <span className={styles.statNumber}>{report?.assignedThisWeek || 0}</span>
              </div>
              <div className={styles.statBox}>
                <span className={styles.statLabel}>Bugün Biten</span>
                <span className={styles.statNumber} style={{ color: '#22c55e' }}>{report?.completedToday || 0}</span>
              </div>
              <div className={styles.statBox}>
                <span className={styles.statLabel}>Toplam Gecikmiş</span>
                <span className={styles.statNumber} style={{ color: '#ef4444' }}>{report?.totalOverdue || 0}</span>
              </div>
            </div>
          </Card>

          <Card title="Genel Başarı Oranı">
            <div className={styles.pieChartContainer}>
              <div className={styles.pieChart}>
                <span className={styles.pieCenter}>%{Math.round(report?.successRate || 0)}</span>
              </div>
              <div className={styles.pieLegend}>
                <div className={styles.legendItem}>
                  <span className={styles.dot} style={{ backgroundColor: '#6366f1' }}></span> Başarı Oranı
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default CoachReports;

