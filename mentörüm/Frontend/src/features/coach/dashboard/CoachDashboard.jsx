import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  useStudents,
  useCalendarEvents,
  useCoachCompleteHomework,
  usePaymentPlans,
  useApprovals,
  useApproveItem,
  useRejectItem,
  useRecentTeacherNotes,
} from '../coachApi';
import { usePrograms } from '../coachSchoolApi';
import AssignHomeworkModal from '../homework/AssignHomeworkModal';
import DashboardRightColumn from './DashboardRightColumn';
import { format, addDays, subDays } from 'date-fns';
import {
  Users,
  AlertTriangle,
  Plus,
  PlusCircle,
  Calendar as CalendarIcon,
  ArrowUpRight,
  Sparkles,
  AlertCircle,
  CreditCard,
  Clock,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';
import styles from './CoachDashboard.module.css';

const CoachDashboard = () => {
  const navigate = useNavigate();

  // Aktif Sekme: 'OVERDUE' | 'APPROVALS' | 'TEACHER_NOTES'
  const [activeTab, setActiveTab] = useState('OVERDUE');
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedStudentForAssign, setSelectedStudentForAssign] = useState(null);
  const [selectedEventModal, setSelectedEventModal] = useState(null);

  // Veri Çekme
  const { data: students = [], isLoading: isStudentsLoading } = useStudents();
  const completeHomeworkMutation = useCoachCompleteHomework();
  const { data: programs = [] } = usePrograms();
  // 'all' = tüm programlar toplulaştırılmış; aksi halde tek program
  const [selectedProgramId, setSelectedProgramId] = useState('all');
  const activeProgramId = selectedProgramId === 'all' ? undefined : selectedProgramId;
  const { data: paymentPlans = [] } = usePaymentPlans(activeProgramId);
  const { data: coachApprovals = [] } = useApprovals(activeProgramId, 'PENDING');
  const approveMutation = useApproveItem();
  const rejectMutation = useRejectItem();
  const { data: recentTeacherNotes = [] } = useRecentTeacherNotes();

  // Bugün ve Yarının Tarihleri
  const today = useMemo(() => new Date(), []);
  const tomorrow = useMemo(() => addDays(new Date(), 1), []);
  const todayStr = useMemo(() => format(today, 'yyyy-MM-dd'), [today]);
  const tomorrowStr = useMemo(() => format(tomorrow, 'yyyy-MM-dd'), [tomorrow]);

  // Takvim Etkinlikleri (Geçmiş 30 gün ve gelecek 14 gün — gecikmiş ödevler dahil)
  const eventStartStr = useMemo(() => format(subDays(today, 30), 'yyyy-MM-dd'), [today]);
  const eventEndStr = useMemo(() => format(addDays(today, 14), 'yyyy-MM-dd'), [today]);

  const { data: events = [] } = useCalendarEvents(eventStartStr, eventEndStr);

  const formattedEvents = useMemo(() => {
    return events.map((ev) => ({
      ...ev,
      start: new Date(ev.start || ev.date),
      end: new Date(ev.end || ev.date),
      title: ev.studentName ? `${ev.title} — ${ev.studentName}` : ev.title,
    })).sort((a, b) => a.start - b.start);
  }, [events]);

  // Bugün ve Yarın Olan Etkinlikler (Zaman Çizelgesi)
  const todayEvents = useMemo(() => {
    return formattedEvents.filter((ev) => format(ev.start, 'yyyy-MM-dd') === todayStr);
  }, [formattedEvents, todayStr]);

  const tomorrowEvents = useMemo(() => {
    return formattedEvents.filter((ev) => format(ev.start, 'yyyy-MM-dd') === tomorrowStr);
  }, [formattedEvents, tomorrowStr]);

  // Sıradaki Etkinlik
  const nextEvent = useMemo(() => {
    const now = new Date();
    return todayEvents.find((ev) => ev.start >= now) || todayEvents[0] || null;
  }, [todayEvents]);

  // Gecikmiş / Acil Takip Bekleyen Görevler
  const overdueTasks = useMemo(() => {
    return formattedEvents.filter((ev) => {
      const isHomework = ev.type === 'HOMEWORK' || ev.type === 'HOMEWORK_DUE';
      if (!isHomework) return false;
      if (ev.status === 'COMPLETED' || ev.status === 'DONE') return false;
      return ev.isOverdue || new Date(ev.start) < new Date(todayStr);
    });
  }, [formattedEvents, todayStr]);

  // KPI Hesaplamaları
  const totalStudentsCount = students.length;
  const totalOverdueCount = useMemo(() => {
    const studentOverdue = students.reduce((sum, s) => sum + (s.overdueHomeworkCount || 0), 0);
    return Math.max(studentOverdue, overdueTasks.length);
  }, [students, overdueTasks]);

  const weeklyCompletionRate = useMemo(() => {
    const totalCompleted = students.reduce((sum, s) => sum + (s.completedHomeworkCount || 0), 0);
    const totalPending = students.reduce((sum, s) => sum + (s.activeHomeworkCount || 0), 0);
    const totalHw = totalCompleted + totalPending;
    return totalHw > 0 ? Math.round((totalCompleted / totalHw) * 100) : 100;
  }, [students]);

  // Finans Özeti
  const financeStats = useMemo(() => {
    let totalPlanned = 0;
    let totalCollected = 0;
    let totalOverdue = 0;

    paymentPlans.forEach((plan) => {
      (plan.items || []).forEach((item) => {
        const baseAmt = parseFloat(item.baseAmount ?? item.amount) || 0;
        const paidAmt = parseFloat(item.paidAmount) || 0;
        const remAmt = item.remainingAmount != null ? parseFloat(item.remainingAmount) : Math.max(0, baseAmt - paidAmt);
        totalPlanned += baseAmt;
        totalCollected += paidAmt;
        if (item.status !== 'PAID' && remAmt > 0 && item.dueDate && new Date(item.dueDate) < new Date()) {
          totalOverdue += remAmt;
        }
      });
    });

    const pendingCollection = Math.max(0, totalPlanned - totalCollected);
    return {
      totalPlanned,
      totalCollected,
      totalOverdue,
      pendingCollection,
    };
  }, [paymentPlans]);

  const handleOpenAssign = (student = null) => {
    setSelectedStudentForAssign(student);
    setIsAssignModalOpen(true);
  };

  const handleCompleteTask = (ev, e) => {
    e.stopPropagation();
    if (!ev.id) return;
    completeHomeworkMutation.mutate({ assignmentId: ev.id });
  };

  const handleApprove = (id, e) => {
    e.stopPropagation();
    approveMutation.mutate(id);
  };

  const handleReject = (id, e) => {
    e.stopPropagation();
    rejectMutation.mutate({ id, reason: 'Koç tarafından reddedildi' });
  };

  return (
    <div className={styles.dashboardContainer}>
      {programs.length > 1 && (
        <div className={styles.dashboardFilterBar}>
          <span className={styles.filterBarLabel}>Program:</span>
          <select
            value={selectedProgramId}
            onChange={(e) => setSelectedProgramId(e.target.value)}
            className={styles.programSelect}
          >
            <option value="all">Tüm Programlar</option>
            {programs.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
      )}

      {/* ── KATMAN 1: ÜST AKSİYONLU KPI ŞERİDİ (4 NET KART) ──────── */}
      <section className={styles.kpiGrid}>
        <div
          className={styles.kpiCard}
          onClick={() => navigate('/coach/students')}
          title="Öğrenciler listesine git"
        >
          <div className={styles.kpiHeader}>
            <span className={styles.kpiLabel}>AKTİF ÖĞRENCİ & UYUM</span>
            <div className={`${styles.kpiIconWrap} ${styles.iconIndigo}`}>
              <Users size={20} strokeWidth={1.75} />
            </div>
          </div>
          <div className={styles.kpiValue}>{totalStudentsCount} Öğrenci</div>
          <div className={styles.kpiSubtext}>
            <span className={styles.subtextDot} />
            {programs.length} Program • %{weeklyCompletionRate} Haftalık Tamamlama
          </div>
        </div>

        <div
          className={`
            ${styles.kpiCard} 
            ${(totalOverdueCount > 0 || coachApprovals.length > 0) ? styles.kpiAlertBorder : ''}
          `}
          onClick={() => setActiveTab(totalOverdueCount > 0 ? 'OVERDUE' : 'APPROVALS')}
          title="İşlem bekleyen görevleri görüntüle"
        >
          <div className={styles.kpiHeader}>
            <span className={styles.kpiLabel}>İŞLEM BEKLEYENLER</span>
            <div className={`${styles.kpiIconWrap} ${styles.iconRose}`}>
              <AlertTriangle size={20} strokeWidth={1.75} />
            </div>
          </div>
          <div className={`${styles.kpiValue} ${(totalOverdueCount > 0 || coachApprovals.length > 0) ? styles.valAlert : ''}`}>
            {totalOverdueCount + coachApprovals.length} İşlem
          </div>
          <div className={styles.kpiSubtext}>
            {totalOverdueCount > 0 ? (
              <span className={styles.dangerNotice}>⚠️ {totalOverdueCount} Gecikmiş Ödev</span>
            ) : (
              'Gecikmiş ödev yok'
            )}
            {coachApprovals.length > 0 && ` • ${coachApprovals.length} Onay Talebi`}
          </div>
        </div>

        <div
          className={styles.kpiCard}
          onClick={() => navigate('/coach/calendar')}
          title="Tam takvimi aç"
        >
          <div className={styles.kpiHeader}>
            <span className={styles.kpiLabel}>BUGÜNKÜ AKIŞ</span>
            <div className={`${styles.kpiIconWrap} ${styles.iconSky}`}>
              <Clock size={20} strokeWidth={1.75} />
            </div>
          </div>
          <div className={styles.kpiValue}>{todayEvents.length} Etkinlik</div>
          <div className={styles.kpiSubtext}>
            {nextEvent ? (
              <span>Sıradaki: <strong className={styles.highlightText}>{format(nextEvent.start, 'HH:mm')}</strong> — {nextEvent.title}</span>
            ) : (
              'Bugün için planlanmış etkinlik yok'
            )}
          </div>
        </div>

        <div
          className={styles.kpiCard}
          onClick={() => navigate('/coach/payments')}
          title="Finans ve tahsilat merkezine git"
        >
          <div className={styles.kpiHeader}>
            <span className={styles.kpiLabel}>FİNANS & TAHSİLAT</span>
            <div className={`${styles.kpiIconWrap} ${styles.iconEmerald}`}>
              <CreditCard size={20} strokeWidth={1.75} />
            </div>
          </div>
          <div className={styles.kpiValue}>
            ₺{financeStats.pendingCollection.toLocaleString('tr-TR')}
          </div>
          <div className={styles.kpiSubtext}>
            Tahsil edilen: ₺{financeStats.totalCollected.toLocaleString('tr-TR')} • {paymentPlans.length} Plan
          </div>
        </div>
      </section>

      {/* ── KATMAN 2: ORTA ÇALIŞMA ALANI (Sol 7 Kolon + Sağ 5 Kolon) ─ */}
      <DashboardRightColumn
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        overdueTasks={overdueTasks}
        coachApprovals={coachApprovals}
        recentTeacherNotes={recentTeacherNotes}
        today={today}
        tomorrow={tomorrow}
        todayEvents={todayEvents}
        tomorrowEvents={tomorrowEvents}
        selectedEventModal={selectedEventModal}
        setSelectedEventModal={setSelectedEventModal}
        onCompleteTask={handleCompleteTask}
        onApprove={handleApprove}
        onReject={handleReject}
        onOpenAssign={handleOpenAssign}
        navigate={navigate}
      />

      {/* ── KATMAN 3: ALT BÖLÜM — ÖĞRENCİ PERFORMANS & ÇALIŞMA RADARI ─ */}
      <section className={styles.bottomSection}>
        <div className={styles.radarHeaderRow}>
          <div className={styles.radarTitleWrap}>
            <Sparkles size={18} className={styles.sparkleIcon} />
            <h2 className={styles.radarTitle}>Öğrenci Performans & Çalışma Radarı</h2>
            <span className={styles.countPill}>{students.length} Öğrenci</span>
          </div>

          <button
            type="button"
            className={styles.addStudentBtn}
            onClick={() => navigate('/coach/students')}
          >
            <Plus size={15} strokeWidth={2.5} />
            <span>Yeni Öğrenci Ekle</span>
          </button>
        </div>

        {isStudentsLoading ? (
          <div className={styles.emptyNotice}>Öğrenciler yükleniyor...</div>
        ) : students.length > 0 ? (
          <div className={styles.radarGrid}>
            {students.map((student) => {
              const initial = student.fullName?.charAt(0)?.toUpperCase() || 'Ö';
              const hasGrade = student.grade != null;
              const completedHw = student.completedHomeworkCount || 0;
              const totalHw = completedHw + (student.activeHomeworkCount || 0);
              const studentProgress = totalHw > 0 ? Math.round((completedHw / totalHw) * 100) : 100;

              const studyMins = student.thisWeekStudyMinutes || 0;
              const studyFormatted = studyMins > 0
                ? `${Math.floor(studyMins / 60)}s ${studyMins % 60}dk`
                : '0 dk';

              const lastNet = student.lastExamNet;
              const prevNet = student.prevExamNet;
              const netDiff = (lastNet != null && prevNet != null)
                ? (lastNet - prevNet).toFixed(1)
                : null;

              return (
                <div key={student.id} className={styles.radarCard}>
                  <div className={styles.radarCardTop}>
                    <div className={styles.radarStudentMeta}>
                      <div className={styles.radarAvatar}>{initial}</div>
                      <div className={styles.radarStudentText}>
                        <span
                          className={styles.radarStudentName}
                          onClick={() => navigate(`/coach/students/${student.id}`)}
                          title={student.fullName}
                        >
                          {student.fullName}
                        </span>
                        {hasGrade ? (
                          <span className={styles.gradeBadge}>
                            {student.grade}. Sınıf {student.track ? `• ${student.track}` : ''}
                          </span>
                        ) : (
                          <span
                            className={styles.noGradeBadge}
                            onClick={() => navigate(`/coach/students/${student.id}`)}
                            title="Sınıf bilgisi ekle"
                          >
                            <AlertCircle size={11} /> Sınıf Belirtilmemiş
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className={styles.radarMetricsStrip}>
                    <div className={styles.radarMetricBox}>
                      <span className={styles.radarMetricVal}>{studyFormatted}</span>
                      <span className={styles.radarMetricLabel}>Bu Hafta Çalışma</span>
                    </div>

                    <div className={`${styles.radarMetricBox} ${styles.radarMetricDivider}`}>
                      <span className={styles.radarMetricVal}>{student.thisWeekQuestionCount || 0}</span>
                      <span className={styles.radarMetricLabel}>Çözülen Soru</span>
                    </div>

                    <div className={styles.radarMetricBox}>
                      <span className={styles.radarMetricVal}>
                        {lastNet != null ? `${lastNet} Net` : '-'}
                        {netDiff != null && (
                          parseFloat(netDiff) >= 0 ? (
                            <span className={styles.netPositive} title={`Önceki sınava göre +${netDiff}`}>
                              <TrendingUp size={12} />
                            </span>
                          ) : (
                            <span className={styles.netNegative} title={`Önceki sınava göre ${netDiff}`}>
                              <TrendingDown size={12} />
                            </span>
                          )
                        )}
                      </span>
                      <span className={styles.radarMetricLabel}>Son Deneme</span>
                    </div>
                  </div>

                  <div className={styles.radarProgressRow}>
                    <div className={styles.radarProgressHeader}>
                      <span>Haftalık Ödev Uyumu</span>
                      <strong>%{studentProgress}</strong>
                    </div>
                    <div className={styles.radarProgressBar}>
                      <div
                        className={styles.radarProgressFill}
                        style={{ width: `${studentProgress}%` }}
                      />
                    </div>
                  </div>

                  <div className={styles.radarCardActions}>
                    <button
                      type="button"
                      className={styles.cardActionBtn}
                      onClick={() => handleOpenAssign(student)}
                      title="Ödev Ver"
                    >
                      <PlusCircle size={14} />
                      <span>Ödev Ver</span>
                    </button>
                    <button
                      type="button"
                      className={styles.cardActionBtn}
                      onClick={() => navigate(`/coach/students/${student.id}`)}
                      title="Öğrenci Takvimi"
                    >
                      <CalendarIcon size={14} />
                      <span>Takvim</span>
                    </button>
                    <button
                      type="button"
                      className={styles.cardActionBtn}
                      onClick={() => navigate(`/coach/students/${student.id}`)}
                      title="Detay Görüntüle"
                    >
                      <ArrowUpRight size={14} />
                      <span>Detay</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className={styles.emptyNotice}>
            Henüz öğrenciniz bulunmuyor. Sağ üstteki butondan yeni öğrenci ekleyebilirsiniz.
          </div>
        )}
      </section>

      <AssignHomeworkModal
        isOpen={isAssignModalOpen}
        onClose={() => setIsAssignModalOpen(false)}
        selectedStudent={selectedStudentForAssign}
      />
    </div>
  );
};

export default CoachDashboard;
