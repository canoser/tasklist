import React from 'react';
import Card from '../../../components/common/Card/Card';
import styles from './CoachReports.module.css';
import { useReportsOverview } from '../coachApi';

const CoachReports = () => {
  const { data: report, isLoading, isError } = useReportsOverview();

  if (isLoading) return <div className={styles.pageContainer}>Raporlar Yükleniyor...</div>;
  if (isError) return <div className={styles.pageContainer}>Raporlar alınırken bir hata oluştu.</div>;

  return (
    <div className={styles.pageContainer}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Raporlar ve Analizler</h1>
          <p className={styles.subtitle}>Öğrenci performanslarını detaylı olarak inceleyin.</p>
        </div>
      </header>

      <div className={styles.grid}>
        
        {/* Haftalık Özet Kartı */}
        <Card title="Bu Hafta Genel Durum">
          <div className={styles.summaryStats}>
            <div className={styles.statBox}>
              <span className={styles.statLabel}>Bu Hafta Verilen</span>
              <span className={styles.statNumber}>{report?.assignedThisWeek || 0}</span>
            </div>
            <div className={styles.statBox}>
              <span className={styles.statLabel}>Bugün Biten</span>
              <span className={styles.statNumber} style={{color: '#22c55e'}}>{report?.completedToday || 0}</span>
            </div>
            <div className={styles.statBox}>
              <span className={styles.statLabel}>Toplam Gecikmiş</span>
              <span className={styles.statNumber} style={{color: '#ef4444'}}>{report?.totalOverdue || 0}</span>
            </div>
          </div>
        </Card>

        {/* Pasta Grafik Simülasyonu (Tamamlama Oranı) */}
        <Card title="Genel Başarı Oranı">
          <div className={styles.pieChartContainer}>
            <div className={styles.pieChart}>
              <span className={styles.pieCenter}>%{report?.successRate ? Math.round(report.successRate) : 0}</span>
            </div>
            <div className={styles.pieLegend}>
              <div className={styles.legendItem}>
                <span className={styles.dot} style={{backgroundColor: '#6366f1'}}></span> Başarı Oranı
              </div>
              <div className={styles.legendItem}>
                <span className={styles.dot} style={{backgroundColor: '#e2e8f0'}}></span> Toplam Öğrenci: {report?.totalStudents || 0}
              </div>
            </div>
          </div>
        </Card>

        {/* Bar Chart Simülasyonu (Trend) */}
        <Card className={styles.fullWidth} title="Son 4 Hafta Gecikme Eğilimi">
          <div className={styles.barChart}>
            
            <div className={styles.barGroup}>
              <div className={styles.barValue}>18</div>
              <div className={styles.bar} style={{height: '60%'}}></div>
              <div className={styles.barLabel}>Hafta 1</div>
            </div>

            <div className={styles.barGroup}>
              <div className={styles.barValue}>14</div>
              <div className={styles.bar} style={{height: '45%'}}></div>
              <div className={styles.barLabel}>Hafta 2</div>
            </div>

            <div className={styles.barGroup}>
              <div className={styles.barValue}>22</div>
              <div className={styles.bar} style={{height: '75%', backgroundColor: '#ef4444'}}></div>
              <div className={styles.barLabel}>Hafta 3</div>
            </div>

            <div className={styles.barGroup}>
              <div className={styles.barValue}>12</div>
              <div className={styles.bar} style={{height: '40%'}}></div>
              <div className={styles.barLabel}>Hafta 4</div>
            </div>

          </div>
        </Card>

      </div>
    </div>
  );
};

export default CoachReports;
