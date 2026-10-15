import React, { useState } from 'react';
import Card from '../../../components/common/Card/Card';
import styles from './CoachReports.module.css';
import { useReportsOverview, useStudents, useStudentReport, useReportsDetail } from '../coachApi';

const CoachReports = () => {
  const { data: report, isLoading, isError } = useReportsOverview();
  const { data: students } = useStudents();
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const { data: studentReport } = useStudentReport(selectedStudentId || null);
  const { data: detail } = useReportsDetail();

  if (isLoading) return <div className={styles.pageContainer}>Raporlar Yükleniyor...</div>;
  if (isError) return <div className={styles.pageContainer}>Raporlar alınırken bir hata oluştu.</div>;

  const hasStudents = (report?.totalStudents || 0) > 0;
  const successRate = selectedStudentId ? studentReport?.successRate : report?.successRate;

  const stats = selectedStudentId
    ? [
        { label: 'Toplam Atanan', value: studentReport?.totalAssigned ?? 0, color: '#6366f1' },
        { label: 'Tamamlanan', value: studentReport?.totalCompleted ?? 0, color: '#22c55e' },
        { label: 'Gecikmiş', value: studentReport?.totalOverdue ?? 0, color: '#ef4444' },
      ]
    : [
        { label: 'Toplam Öğrenci', value: report?.totalStudents ?? 0, color: '#6366f1' },
        { label: 'Bu Hafta Verilen', value: report?.assignedThisWeek ?? 0, color: '#0ea5e9' },
        { label: 'Bugün Biten', value: report?.completedToday ?? 0, color: '#22c55e' },
        { label: 'Toplam Gecikmiş', value: report?.totalOverdue ?? 0, color: '#ef4444' },
      ];

  return (
    <div className={styles.pageContainer}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Raporlar ve Analizler</h1>
          <p className={styles.subtitle}>Öğrenci performanslarını detaylı olarak inceleyin.</p>
        </div>
        <select
          value={selectedStudentId}
          onChange={(e) => setSelectedStudentId(e.target.value)}
          style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0' }}
        >
          <option value="">Tüm Öğrenciler</option>
          {students?.map((s) => (
            <option key={s.id} value={s.id}>{s.fullName}</option>
          ))}
        </select>
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
        <>
          <div className={styles.grid}>
          <Card title={selectedStudentId ? 'Öğrenci Durumu' : 'Bu Hafta Genel Durum'}>
            <div className={styles.summaryStats}>
              {stats.map((s) => (
                <div key={s.label} className={styles.statBox}>
                  <span className={styles.statLabel}>{s.label}</span>
                  <span className={styles.statNumber} style={{ color: s.color }}>{s.value}</span>
                </div>
              ))}
            </div>
          </Card>

          <Card title="Genel Başarı Oranı">
            <div className={styles.pieChartContainer}>
              <div className={styles.pieChart}>
                <span className={styles.pieCenter}>%{Math.round(successRate || 0)}</span>
              </div>
              <div className={styles.pieLegend}>
                <div className={styles.legendItem}>
                  <span className={styles.dot} style={{ backgroundColor: '#6366f1' }}></span> Başarı Oranı
                </div>
              </div>
            </div>
          </Card>
        </div>

        <div className={styles.detailGrid}>
          <Card title="Ders Bazlı Başarı">
            {detail?.subjectBreakdown?.length ? detail.subjectBreakdown.map((s) => (
              <div key={s.subjectName} style={{ marginBottom: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                  <span>{s.subjectName}</span>
                  <span>{s.completed}/{s.total} (%{s.successRate})</span>
                </div>
                <div style={{ height: 8, background: '#e2e8f0', borderRadius: 4, marginTop: 4 }}>
                  <div style={{ height: 8, background: '#6366f1', borderRadius: 4, width: `${s.successRate}%` }} />
                </div>
              </div>
            )) : <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Henüz ders bazlı veri yok.</p>}
          </Card>

          <Card title="Son Tamamlanan Ödevler">
            {detail?.recentHomework?.length ? detail.recentHomework.map((h, i) => (
              <div key={i} style={{ padding: '6px 0', borderBottom: '1px solid #f1f5f9', fontSize: '0.85rem', display: 'flex', justifyContent: 'space-between' }}>
                <span>✅ {h.title}</span>
                <span style={{ color: '#94a3b8' }}>{h.studentName}</span>
              </div>
            )) : <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Henüz tamamlanan ödev yok.</p>}
          </Card>

          <Card title="Gecikmiş Ödevler">
            {detail?.overdueHomework?.length ? detail.overdueHomework.map((h, i) => (
              <div key={i} style={{ padding: '6px 0', borderBottom: '1px solid #f1f5f9', fontSize: '0.85rem', display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#ef4444' }}>🔴 {h.title}</span>
                <span style={{ color: '#94a3b8' }}>{h.studentName}</span>
              </div>
            )) : <p style={{ color: '#16a34a', fontSize: '0.85rem' }}>Gecikmiş ödev yok. 🎉</p>}
          </Card>

          <Card title="Haftalık Tamamlama (Son 4 Hafta)">
            {detail?.weeklyTrend?.length ? (
              <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', height: 80 }}>
                {detail.weeklyTrend.map((w, i) => (
                  <div key={i} style={{ flex: 1, textAlign: 'center' }}>
                    <div style={{ background: '#6366f1', borderRadius: '4px 4px 0 0', minHeight: 4, height: Math.max(4, w.completed * 12) }} />
                    <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>{w.completed}</div>
                  </div>
                ))}
              </div>
            ) : <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Henüz trend verisi yok.</p>}
          </Card>
        </div>
        </>
      )}
    </div>
  );
};

export default CoachReports;

