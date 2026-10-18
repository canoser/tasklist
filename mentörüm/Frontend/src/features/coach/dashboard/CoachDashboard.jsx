import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  useStudents, 
  useCalendarEvents, 
  useReportsOverview, 
  useCompleteHomework,
  usePaymentPlans,
  useApprovals,
  useApproveItem,
  useRejectItem,
  useRecentTeacherNotes
} from '../coachApi';
import { usePrograms } from '../coachSchoolApi';
import AssignHomeworkModal from '../homework/AssignHomeworkModal';
import Modal from '../../../components/common/Modal/Modal';
import { format, addDays, startOfWeek, endOfWeek } from 'date-fns';
import { tr } from 'date-fns/locale';
import { 
  Users, 
  CheckCircle2, 
  AlertTriangle, 
  Plus, 
  PlusCircle, 
  Calendar as CalendarIcon, 
  ArrowUpRight, 
  Check, 
  X, 
  BookOpen, 
  Sparkles, 
  AlertCircle,
  FileText,
  CreditCard,
  Clock,
  TrendingUp,
  TrendingDown,
  GraduationCap,
  ChevronRight,
  ShieldCheck
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
  const { data: report } = useReportsOverview();
  const completeHomeworkMutation = useCompleteHomework();
  const { data: programs = [] } = usePrograms();
  const activeProgramId = programs[0]?.id;
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

  // Takvim Etkinlikleri (Bu Hafta)
  const weekStartStr = useMemo(() => format(startOfWeek(today, { weekStartsOn: 1 }), 'yyyy-MM-dd'), [today]);
  const weekEndStr = useMemo(() => format(endOfWeek(today, { weekStartsOn: 1 }), 'yyyy-MM-dd'), [today]);

  const { data: events = [] } = useCalendarEvents(weekStartStr, weekEndStr);

  const formattedEvents = useMemo(() => {
    return events.map((ev) => ({
      ...ev,
      start: new Date(ev.start || ev.date),
      end: new Date(ev.end || ev.date),
      title: ev.studentName ? `${ev.title} — ${ev.studentName}` : ev.title
    })).sort((a, b) => a.start - b.start);
  }, [events]);

  // Bugün ve Yarın Olan Etkinlikler (Zaman Çizelgesi)
  const todayEvents = useMemo(() => {
    return formattedEvents.filter(ev => format(ev.start, 'yyyy-MM-dd') === todayStr);
  }, [formattedEvents, todayStr]);

  const tomorrowEvents = useMemo(() => {
    return formattedEvents.filter(ev => format(ev.start, 'yyyy-MM-dd') === tomorrowStr);
  }, [formattedEvents, tomorrowStr]);

  // Sıradaki Etkinlik
  const nextEvent = useMemo(() => {
    const now = new Date();
    return todayEvents.find(ev => ev.start >= now) || todayEvents[0] || null;
  }, [todayEvents]);

  // Gecikmiş / Acil Takip Bekleyen Görevler
  const overdueTasks = useMemo(() => {
    return formattedEvents.filter(ev => {
      if (ev.type !== 'HOMEWORK') return false;
      if (ev.status === 'COMPLETED') return false;
      return ev.isOverdue || new Date(ev.start) < new Date(todayStr);
    });
  }, [formattedEvents, todayStr]);

  // KPI Hesaplamaları
  const totalStudentsCount = students.length;
  const totalOverdueCount = useMemo(() => {
    return students.reduce((sum, s) => sum + (s.overdueHomeworkCount || 0), overdueTasks.length > 0 ? overdueTasks.length : 0);
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

    paymentPlans.forEach(plan => {
      (plan.items || []).forEach(item => {
        const amt = parseFloat(item.amount) || 0;
        totalPlanned += amt;
        if (item.status === 'PAID') {
          totalCollected += amt;
        } else if (item.dueDate && new Date(item.dueDate) < new Date()) {
          totalOverdue += amt;
        }
      });
    });

    const pendingCollection = totalPlanned - totalCollected;
    return {
      totalPlanned,
      totalCollected,
      totalOverdue,
      pendingCollection
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
      {/* ── KATMAN 1: ÜST AKSİYONLU KPI ŞERİDİ (4 NET KART) ──────── */}
      <section className={styles.kpiGrid}>
        {/* 1. Aktif Öğrenci & Uyum */}
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

        {/* 2. İşlem Bekleyenler (Gecikmişler + Onaylar) */}
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

        {/* 3. Bugünkü Seans & Ders Akışı */}
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

        {/* 4. Finans & Tahsilat Özeti (₺) */}
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
      <div className={styles.middleGrid}>
        {/* SOL BLOK (7 Kolon): 3 Sekmeli Canlı Operasyon Kutusu */}
        <section className={styles.operationCard}>
          <div className={styles.tabHeaderRow}>
            <div className={styles.tabButtonsGroup}>
              <button
                type="button"
                className={`${styles.tabBtn} ${activeTab === 'OVERDUE' ? styles.tabBtnActive : ''}`}
                onClick={() => setActiveTab('OVERDUE')}
              >
                <span>Acil & Gecikenler</span>
                {overdueTasks.length > 0 && (
                  <span className={`${styles.tabBadge} ${styles.badgeAlert}`}>
                    {overdueTasks.length}
                  </span>
                )}
              </button>

              <button
                type="button"
                className={`${styles.tabBtn} ${activeTab === 'APPROVALS' ? styles.tabBtnActive : ''}`}
                onClick={() => setActiveTab('APPROVALS')}
              >
                <span>Onay Bekleyenler</span>
                {coachApprovals.length > 0 && (
                  <span className={styles.tabBadge}>
                    {coachApprovals.length}
                  </span>
                )}
              </button>

              <button
                type="button"
                className={`${styles.tabBtn} ${activeTab === 'TEACHER_NOTES' ? styles.tabBtnActive : ''}`}
                onClick={() => setActiveTab('TEACHER_NOTES')}
              >
                <span>Öğretmen Notları</span>
                {recentTeacherNotes.length > 0 && (
                  <span className={styles.tabBadge}>
                    {recentTeacherNotes.length}
                  </span>
                )}
              </button>
            </div>
          </div>

          <div className={styles.tabContentList}>
            {/* SEKME 1: ACİL & GECİKENLER */}
            {activeTab === 'OVERDUE' && (
              overdueTasks.length > 0 ? (
                overdueTasks.map((ev) => (
                  <div 
                    key={ev.id} 
                    className={styles.operationItemRow}
                    onClick={() => setSelectedEventModal(ev)}
                  >
                    <div className={styles.itemLeft}>
                      <div className={`${styles.itemIconCircle} ${styles.itemIconAlert}`}>
                        <AlertTriangle size={15} strokeWidth={2} />
                      </div>
                      <div className={styles.itemInfoCol}>
                        <span className={styles.itemTitle}>{ev.title}</span>
                        <div className={styles.itemMetaRow}>
                          {ev.studentName && (
                            <span 
                              className={styles.studentTag}
                              onClick={(e) => {
                                e.stopPropagation();
                                if (ev.studentId) navigate(`/coach/students/${ev.studentId}`);
                              }}
                            >
                              {ev.studentName}
                            </span>
                          )}
                          <span>• Son Teslim: {format(ev.start, 'd MMMM', { locale: tr })}</span>
                        </div>
                      </div>
                    </div>

                    <div className={styles.itemRight}>
                      <span className={`${styles.statusBadge} ${styles.statusOverdue}`}>
                        Gecikti
                      </span>
                      <button
                        type="button"
                        className={styles.inlineCheckBtn}
                        onClick={(e) => handleCompleteTask(ev, e)}
                        title="Ödevi Onayla"
                        aria-label="Onayla"
                      >
                        <Check size={14} strokeWidth={2.5} />
                      </button>
                      <button
                        type="button"
                        className={styles.inlineDetailBtn}
                        onClick={() => setSelectedEventModal(ev)}
                        title="Detay Görüntüle"
                      >
                        <ArrowUpRight size={14} strokeWidth={2} />
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className={styles.emptyNotice}>
                  Gecikmiş veya acil müdahale gerektiren ödev bulunmuyor. 🎉
                </div>
              )
            )}

            {/* SEKME 2: ONAY BEKLEYENLER */}
            {activeTab === 'APPROVALS' && (
              coachApprovals.length > 0 ? (
                coachApprovals.map((item) => {
                  let payload = item.payload;
                  if (typeof payload === 'string') {
                    try { payload = JSON.parse(payload); } catch { payload = {}; }
                  }
                  return (
                    <div key={item.id} className={styles.operationItemRow}>
                      <div className={styles.itemLeft}>
                        <div className={styles.itemIconCircle}>
                          <ShieldCheck size={16} strokeWidth={2} />
                        </div>
                        <div className={styles.itemInfoCol}>
                          <span className={styles.itemTitle}>
                            {item.entityType === 'HOMEWORK_DONE' && 'Ödev Tamamlama Talebi'}
                            {item.entityType === 'PAYMENT_CLAIM' && 'Veli Ödeme Bildirimi'}
                            {item.entityType === 'SCHEDULE_CHANGE' && 'Program Değişikliği Talebi'}
                          </span>
                          <div className={styles.itemMetaRow}>
                            <span>{payload?.studentName || payload?.note || 'Talep detayı mevcut'}</span>
                            {payload?.amount && <strong>• ₺{parseFloat(payload.amount).toLocaleString('tr-TR')}</strong>}
                          </div>
                        </div>
                      </div>

                      <div className={styles.itemRight}>
                        <button
                          type="button"
                          className={styles.btnActionApprove}
                          onClick={(e) => handleApprove(item.id, e)}
                        >
                          <Check size={13} strokeWidth={2.5} />
                          <span>Onayla</span>
                        </button>
                        <button
                          type="button"
                          className={styles.btnActionReject}
                          onClick={(e) => handleReject(item.id, e)}
                        >
                          <X size={13} strokeWidth={2.5} />
                          <span>Reddet</span>
                        </button>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className={styles.emptyNotice}>
                  Şu an koç onayı bekleyen bir işlem bulunmuyor.
                </div>
              )
            )}

            {/* SEKME 3: ÖĞRETMEN VE SEANS NOTLARI */}
            {activeTab === 'TEACHER_NOTES' && (
              recentTeacherNotes.length > 0 ? (
                recentTeacherNotes.map((note) => (
                  <div key={note.id} className={styles.operationItemRow}>
                    <div className={styles.itemLeft}>
                      <div className={styles.itemIconCircle}>
                        <GraduationCap size={16} strokeWidth={2} />
                      </div>
                      <div className={styles.itemInfoCol}>
                        <span className={styles.itemTitle}>
                          {note.courseName} — {note.teacherName}
                        </span>
                        <div className={styles.itemMetaRow}>
                          <span 
                            className={styles.studentTag}
                            onClick={() => note.studentId && navigate(`/coach/students/${note.studentId}`)}
                          >
                            {note.studentName}
                          </span>
                          <span>: {note.note || note.summary}</span>
                        </div>
                      </div>
                    </div>

                    <div className={styles.itemRight}>
                      <span className={styles.itemDueDate}>
                        {note.createdAt ? format(new Date(note.createdAt), 'd MMM', { locale: tr }) : ''}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className={styles.emptyNotice}>
                  Henüz öğretmenlerden gelen pedagojik not bulunmuyor.
                </div>
              )
            )}
          </div>
        </section>

        {/* SAĞ BLOK (5 Kolon): Bugün & Yarın Zaman Çizelgesi (Timeline) */}
        <section className={styles.timelineCard}>
          <div className={styles.timelineHeader}>
            <h3 className={styles.timelineTitle}>Bugün & Yarın Zaman Çizelgesi</h3>
            <div className={styles.timelineActions}>
              <button
                type="button"
                className={styles.timelineAddBtn}
                onClick={() => handleOpenAssign()}
                title="Yeni Ödev veya Görev Ata"
              >
                <Plus size={13} strokeWidth={2.5} />
                <span>+ Görev</span>
              </button>
              <button
                type="button"
                className={styles.timelineFullBtn}
                onClick={() => navigate('/coach/calendar')}
                title="Aylık ve haftalık takvimi aç"
              >
                <span>Takvim →</span>
              </button>
            </div>
          </div>

          <div className={styles.timelineScroll}>
            {/* Bugün */}
            <div className={styles.timelineDaySection}>
              <span className={styles.timelineDayLabel}>
                <Clock size={13} />
                BUGÜN ({format(today, 'd MMMM EEEE', { locale: tr })})
              </span>

              <div className={styles.timelineItemList}>
                {todayEvents.length > 0 ? (
                  todayEvents.map(ev => (
                    <div 
                      key={ev.id} 
                      className={styles.timelineItem}
                      onClick={() => setSelectedEventModal(ev)}
                    >
                      <div className={styles.timelineDot} />
                      <span className={styles.timelineTime}>
                        {format(ev.start, 'HH:mm')}
                      </span>
                      <div className={styles.timelineEventDetails}>
                        <span className={styles.timelineEventTitle}>{ev.title}</span>
                        <span className={styles.timelineEventSub}>
                          {ev.type === 'HOMEWORK' ? 'Ödev Teslimi' : 'Ders / Görüşme'}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className={styles.emptyNotice} style={{ padding: '12px 0' }}>
                    Bugün için planlanmış etkinlik yok.
                  </div>
                )}
              </div>
            </div>

            {/* Yarın */}
            <div className={styles.timelineDaySection}>
              <span className={styles.timelineDayLabel}>
                <CalendarIcon size={13} />
                YARIN ({format(tomorrow, 'd MMMM EEEE', { locale: tr })})
              </span>

              <div className={styles.timelineItemList}>
                {tomorrowEvents.length > 0 ? (
                  tomorrowEvents.map(ev => (
                    <div 
                      key={ev.id} 
                      className={styles.timelineItem}
                      onClick={() => setSelectedEventModal(ev)}
                    >
                      <div className={styles.timelineDot} />
                      <span className={styles.timelineTime}>
                        {format(ev.start, 'HH:mm')}
                      </span>
                      <div className={styles.timelineEventDetails}>
                        <span className={styles.timelineEventTitle}>{ev.title}</span>
                        <span className={styles.timelineEventSub}>
                          {ev.type === 'HOMEWORK' ? 'Ödev Teslimi' : 'Ders / Görüşme'}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className={styles.emptyNotice} style={{ padding: '12px 0' }}>
                    Yarın için planlanmış etkinlik yok.
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      </div>

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

              // Çalışma süresi formatı
              const studyMins = student.thisWeekStudyMinutes || 0;
              const studyFormatted = studyMins > 0 
                ? `${Math.floor(studyMins / 60)}s ${studyMins % 60}dk`
                : '0 dk';

              // Net değişimi
              const lastNet = student.lastExamNet;
              const prevNet = student.prevExamNet;
              const netDiff = (lastNet != null && prevNet != null) 
                ? (lastNet - prevNet).toFixed(1) 
                : null;

              return (
                <div key={student.id} className={styles.radarCard}>
                  {/* Kart Üst Bilgisi */}
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

                  {/* 3'lü Performans Veri Şeridi */}
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

                  {/* Ödev İlerleme Çubuğu */}
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

                  {/* Aksiyon Butonları */}
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

      {/* ── ÖDEV ATAMA MODALI ─────────────────────────────────── */}
      <AssignHomeworkModal
        isOpen={isAssignModalOpen}
        onClose={() => setIsAssignModalOpen(false)}
        selectedStudent={selectedStudentForAssign}
      />

      {/* ── ETKİNLİK DETAY MODALI ─────────────────────────────── */}
      {selectedEventModal && (
        <Modal
          isOpen={!!selectedEventModal}
          onClose={() => setSelectedEventModal(null)}
          title="Etkinlik & Görev Detayı"
        >
          <div className={styles.eventModalBody}>
            <div className={styles.eventModalHeader}>
              <div className={styles.modalIconBox}>
                <FileText size={22} />
              </div>
              <div className={styles.modalEventDetails}>
                <h3 className={styles.modalEventTitle}>{selectedEventModal.title}</h3>
                <span className={styles.modalEventDate}>
                  Tarih: {format(new Date(selectedEventModal.start), 'd MMMM yyyy, HH:mm', { locale: tr })}
                </span>
              </div>
            </div>

            {selectedEventModal.studentName && (
              <div className={styles.modalMetaRow}>
                <span className={styles.metaKey}>İlgili Öğrenci:</span>
                <span className={styles.metaVal}>{selectedEventModal.studentName}</span>
              </div>
            )}

            {selectedEventModal.description && (
              <div className={styles.modalDescBox}>
                <span className={styles.metaKey}>Açıklama / Not:</span>
                <p className={styles.descText}>{selectedEventModal.description}</p>
              </div>
            )}

            <div className={styles.modalFooterActions}>
              {selectedEventModal.studentId && (
                <button
                  type="button"
                  className={styles.modalStudentBtn}
                  onClick={() => {
                    navigate(`/coach/students/${selectedEventModal.studentId}`);
                    setSelectedEventModal(null);
                  }}
                >
                  <ArrowUpRight size={16} />
                  <span>Öğrenci Sayfasına Git</span>
                </button>
              )}
              <button
                type="button"
                className={styles.modalCloseBtn}
                onClick={() => setSelectedEventModal(null)}
              >
                Kapat
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default CoachDashboard;
