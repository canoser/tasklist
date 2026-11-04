import React, { useState } from 'react';
import Card from '../../../components/common/Card/Card';
import Button from '../../../components/common/Button/Button';
import SegmentedTabs from '../../../components/common/SegmentedTabs/SegmentedTabs';
import StatusBadge from '../../../components/common/StatusBadge/StatusBadge';
import GradeReportDashboard from '../../../components/common/GradeReportDashboard/GradeReportDashboard';
import styles from './CoachReports.module.css';
import {
  useReportsOverview,
  useStudents,
  useStudentReport,
  useReportsDetail,
  useCohortByGrade,
  downloadStudentReportPdf,
} from '../coachApi';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { BarChart3, CheckCircle2, AlertCircle, Sparkles, FileDown, BookOpen, TrendingUp, Percent, Users } from 'lucide-react';

const GRADE_FILTER_TABS = [
  { id: 'ALL', label: 'Tüm Sınıflar' },
  { id: '6', label: '6. Sınıf' },
  { id: '7', label: '7. Sınıf' },
  { id: '8', label: '8. Sınıf (LGS)' },
  { id: '9', label: '9. Sınıf' },
  { id: '10', label: '10. Sınıf' },
  { id: '11', label: '11. Sınıf' },
  { id: '12', label: '12. Sınıf (YKS)' },
  { id: '13', label: 'Mezun' },
];

const CoachReports = () => {
  const { data: report, isLoading, isError } = useReportsOverview();
  const { data: students } = useStudents();
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [cohortGradeFilter, setCohortGradeFilter] = useState('ALL');
  const { data: studentReport } = useStudentReport(selectedStudentId || null);
  const { data: detail } = useReportsDetail();
  const { data: cohorts = [] } = useCohortByGrade(cohortGradeFilter === 'ALL' ? null : Number(cohortGradeFilter));
  const [isPdfDownloading, setIsPdfDownloading] = useState(false);

  const handleDownloadPdf = async () => {
    const targetStudentId = selectedStudentId || students?.[0]?.id;
    if (!targetStudentId) {
      alert('Rapor indirmek için sistemde en az bir öğrenci bulunmalıdır.');
      return;
    }
    const student = (students || []).find((s) => s.id === targetStudentId);
    try {
      setIsPdfDownloading(true);
      await downloadStudentReportPdf(targetStudentId, student?.fullName);
    } catch (err) {
      console.error('PDF indirme hatası:', err);
      alert('Veli raporu PDF indirilirken bir hata oluştu.');
    } finally {
      setIsPdfDownloading(false);
    }
  };

  if (isLoading) return <div className={styles.pageContainer}>Raporlar Yükleniyor...</div>;
  if (isError) return <div className={styles.pageContainer}>Raporlar alınırken bir hata oluştu.</div>;

  const hasStudents = (report?.totalStudents || 0) > 0;
  const successRate = Math.round((selectedStudentId ? studentReport?.successRate : report?.successRate) || 0);

  const stats = selectedStudentId
    ? [
        { label: 'Toplam Atanan', value: studentReport?.totalAssigned ?? 0, color: '#6366f1' },
        { label: 'Tamamlanan', value: studentReport?.totalCompleted ?? 0, color: '#16a34a' },
        { label: 'Gecikmiş', value: studentReport?.totalOverdue ?? 0, color: '#ef4444' },
      ]
    : [
        { label: 'Toplam Öğrenci', value: report?.totalStudents ?? 0, color: '#6366f1' },
        { label: 'Bu Hafta Verilen', value: report?.assignedThisWeek ?? 0, color: '#0ea5e9' },
        { label: 'Bugün Biten', value: report?.completedToday ?? 0, color: '#16a34a' },
        { label: 'Toplam Gecikmiş', value: report?.totalOverdue ?? 0, color: '#ef4444' },
      ];

  const pieGradient = `conic-gradient(#16a34a 0% ${successRate}%, #f59e0b ${successRate}% ${Math.min(100, successRate + 15)}%, #e2e8f0 ${Math.min(100, successRate + 15)}% 100%)`;

  return (
    <div className={styles.pageContainer}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Raporlar ve Analizler</h1>
          <p className={styles.subtitle}>Öğrenci performanslarını detaylı olarak inceleyin.</p>
        </div>

        <div className={styles.headerActions}>
          <select
            value={selectedStudentId}
            onChange={(e) => setSelectedStudentId(e.target.value)}
            className={styles.studentSelect}
            data-testid="coach-reports-student-select"
          >
            <option value="">Tüm Öğrenciler (Sınıf Kohort Görünümü)</option>
            {students?.map((s) => (
              <option key={s.id} value={s.id}>
                {s.fullName} {s.grade ? `(${s.grade === 13 ? 'Mezun' : `${s.grade}. Sınıf`})` : ''}
              </option>
            ))}
          </select>

          <Button 
            variant="outline" 
            onClick={handleDownloadPdf}
            isLoading={isPdfDownloading}
            className={styles.pdfDownloadBtn}
          >
            <FileDown size={15} />
            <span>Veli Raporu İndir (PDF)</span>
          </Button>
        </div>
      </header>

      {selectedStudentId ? (
        <GradeReportDashboard studentId={selectedStudentId} />
      ) : !hasStudents ? (
        <Card className={styles.emptyCard}>
          <div style={{ textAlign: 'center', padding: '32px' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
              <BarChart3 size={48} color="var(--color-primary)" />
            </div>
            <h3 style={{ margin: '8px 0' }}>Henüz rapor verisi yok</h3>
            <p style={{ color: 'var(--text-color-muted)', margin: 0 }}>Raporlar, öğrencilerinize ödev atadıktan sonra oluşur.</p>
          </div>
        </Card>
      ) : (
        <>
          <Card style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 12 }}>
              <h3 className={styles.cardTitle} style={{ margin: 0 }}>
                <Users size={16} />
                <span>6–12. Sınıf Bazlı Eğitim Koçluğu Kohort Sistemleri</span>
              </h3>
              <SegmentedTabs
                tabs={GRADE_FILTER_TABS}
                activeTab={cohortGradeFilter}
                onChange={setCohortGradeFilter}
                size="sm"
              />
            </div>

            {cohorts.length === 0 ? (
              <p style={{ color: 'var(--text-color-muted)', fontSize: '0.85rem', margin: 0 }}>
                Seçili sınıf düzeyinde aktif öğrenci bulunmuyor.
              </p>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }}>
                {cohorts.map((c) => (
                  <div
                    key={c.grade}
                    data-testid={`cohort-card-grade-${c.grade}`}
                    style={{
                      padding: 14,
                      borderRadius: 10,
                      border: '1px solid var(--border-color)',
                      background: 'var(--bg-app, #f8fafc)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 8,
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                      <strong style={{ fontSize: '0.92rem' }}>{c.systemTitle}</strong>
                      <StatusBadge status="ACTIVE" label={`${c.studentCount} Öğrenci`} />
                    </div>
                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', fontSize: '0.8rem', color: 'var(--text-color-muted)' }}>
                      <span>Ödev: <strong>%{c.avgHomeworkCompletionRate}</strong></span>
                      <span>Son Net Ort: <strong>{c.avgLatestExamNet}</strong></span>
                      <span>Haftalık: <strong>{c.avgWeeklyStudyMinutes} dk</strong></span>
                      {c.atRiskStudentCount > 0 && (
                        <StatusBadge status="OVERDUE" label={`${c.atRiskStudentCount} Riskli`} />
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
                      {(c.students || []).map((st) => (
                        <Button
                          key={st.studentId}
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedStudentId(st.studentId)}
                          data-testid={`cohort-open-student-${st.studentId}`}
                        >
                          <span>{st.studentName}</span>
                        </Button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <div className={styles.grid}>
            <Card>
              <div className={styles.cardHeader}>
                <h3 className={styles.cardTitle}>
                  <BarChart3 size={16} />
                  <span>{selectedStudentId ? 'Öğrenci Performans Durumu' : 'Bu Hafta Genel Durum'}</span>
                </h3>
              </div>
              <div className={styles.summaryStats}>
                {stats.map((s) => (
                  <div key={s.label} className={styles.statBox}>
                    <span className={styles.statLabel}>{s.label}</span>
                    <span className={styles.statNumber} style={{ color: s.color }}>{s.value}</span>
                  </div>
                ))}
              </div>
            </Card>

            <Card>
              <div className={styles.cardHeader}>
                <h3 className={styles.cardTitle}>
                  <Percent size={16} />
                  <span>Genel Başarı Oranı</span>
                </h3>
              </div>
              <div className={styles.pieChartContainer}>
                <div className={styles.pieChart} style={{ background: pieGradient }}>
                  <span className={styles.pieCenter}>%{successRate}</span>
                </div>
                <div className={styles.pieLegend}>
                  <div className={styles.legendItem}>
                    <span className={styles.dot} style={{ backgroundColor: '#16a34a' }}></span>
                    <span>Tamamlanan / Başarı (%{successRate})</span>
                  </div>
                  <div className={styles.legendItem}>
                    <span className={styles.dot} style={{ backgroundColor: '#f59e0b' }}></span>
                    <span>Süreçte / Bekleyen</span>
                  </div>
                  <div className={styles.legendItem}>
                    <span className={styles.dot} style={{ backgroundColor: '#e2e8f0' }}></span>
                    <span>Kalan</span>
                  </div>
                </div>
              </div>
            </Card>
          </div>

          <div className={styles.detailGrid}>
            <Card>
              <div className={styles.cardHeader}>
                <h3 className={styles.cardTitle}>
                  <BookOpen size={16} />
                  <span>Ders Bazlı Başarı</span>
                </h3>
              </div>
              {detail?.subjectBreakdown?.length ? (
                detail.subjectBreakdown.map((s) => (
                  <div key={s.subjectName} style={{ marginBottom: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: 4 }}>
                      <span style={{ fontWeight: 600 }}>{s.subjectName}</span>
                      <span style={{ color: 'var(--text-color-muted)' }}>{s.completed}/{s.total} (%{s.successRate})</span>
                    </div>
                    <div style={{ height: 8, background: 'var(--border-color)', borderRadius: 4, overflow: 'hidden' }}>
                      <div style={{ height: 8, background: 'var(--color-primary, #16a34a)', borderRadius: 4, width: `${s.successRate}%` }} />
                    </div>
                  </div>
                ))
              ) : (
                <p style={{ color: 'var(--text-color-muted)', fontSize: '0.85rem' }}>Henüz ders bazlı veri yok.</p>
              )}
            </Card>

            <Card>
              <div className={styles.cardHeader}>
                <h3 className={styles.cardTitle}>
                  <CheckCircle2 size={16} style={{ color: '#16a34a' }} />
                  <span>Son Tamamlanan Ödevler</span>
                </h3>
              </div>
              {detail?.recentHomework?.length ? (
                detail.recentHomework.map((h, i) => (
                  <div key={i} style={{ padding: '8px 0', borderBottom: '1px solid var(--border-color)', fontSize: '0.85rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 500 }}>
                      <CheckCircle2 size={14} style={{ color: '#16a34a' }} />
                      {h.title}
                    </span>
                    <span style={{ color: 'var(--text-color-muted)', fontSize: '0.8rem' }}>{h.studentName}</span>
                  </div>
                ))
              ) : (
                <p style={{ color: 'var(--text-color-muted)', fontSize: '0.85rem' }}>Henüz tamamlanan ödev yok.</p>
              )}
            </Card>

            <Card>
              <div className={styles.cardHeader}>
                <h3 className={styles.cardTitle}>
                  <AlertCircle size={16} style={{ color: '#ef4444' }} />
                  <span>Gecikmiş Ödevler</span>
                </h3>
              </div>
              {detail?.overdueHomework?.length ? (
                detail.overdueHomework.map((h, i) => (
                  <div key={i} style={{ padding: '8px 0', borderBottom: '1px solid var(--border-color)', fontSize: '0.85rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#ef4444', fontWeight: 600 }}>
                      <AlertCircle size={14} />
                      {h.title}
                    </span>
                    <span style={{ color: 'var(--text-color-muted)', fontSize: '0.8rem' }}>{h.studentName}</span>
                  </div>
                ))
              ) : (
                <p style={{ color: '#16a34a', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Sparkles size={14} />
                  <span>Gecikmiş ödev bulunmuyor.</span>
                </p>
              )}
            </Card>

            <Card>
              <div className={styles.cardHeader}>
                <h3 className={styles.cardTitle}>
                  <TrendingUp size={16} />
                  <span>Haftalık Tamamlama Trendi</span>
                </h3>
              </div>
              {detail?.weeklyTrend?.length ? (
                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', height: 110, paddingTop: 16 }}>
                  {detail.weeklyTrend.map((w, i) => {
                    const maxCompleted = Math.max(...detail.weeklyTrend.map((x) => x.completed), 1);
                    const barHeight = Math.max(8, Math.round((w.completed / maxCompleted) * 60));
                    const weekLabel = w.weekStart 
                      ? format(new Date(w.weekStart), 'd MMM', { locale: tr }) 
                      : `${i + 1}. Hafta`;

                    return (
                      <div key={i} style={{ flex: 1, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#16a34a', marginBottom: 4 }}>
                          {w.completed}
                        </span>
                        <div 
                          style={{ 
                            width: '100%', 
                            maxWidth: 36, 
                            background: 'linear-gradient(180deg, #16a34a 0%, #15803d 100%)', 
                            borderRadius: '4px 4px 0 0', 
                            height: barHeight,
                            transition: 'height 0.3s ease'
                          }} 
                        />
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-color-muted)', marginTop: 6, whiteSpace: 'nowrap' }}>
                          {weekLabel}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p style={{ color: 'var(--text-color-muted)', fontSize: '0.85rem' }}>Henüz trend verisi yok.</p>
              )}
            </Card>
          </div>
        </>
      )}
    </div>
  );
};

export default CoachReports;
