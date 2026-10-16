import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  useStudents, 
  useCalendarEvents, 
  useReportsOverview, 
  useCompleteHomework 
} from '../coachApi';
import Calendar from '../../../components/common/Calendar/Calendar';
import AssignHomeworkModal from '../homework/AssignHomeworkModal';
import Modal from '../../../components/common/Modal/Modal';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { 
  Users, 
  ClipboardList, 
  CheckCircle2, 
  AlertTriangle, 
  Search, 
  Plus, 
  PlusCircle, 
  Calendar as CalendarIcon, 
  ArrowUpRight, 
  Check, 
  BookOpen, 
  Sparkles, 
  X, 
  AlertCircle,
  FileText
} from 'lucide-react';
import styles from './CoachDashboard.module.css';

const CoachDashboard = () => {
  const navigate = useNavigate();

  // Takvim aralığı durumu
  const [dateRange, setDateRange] = useState({
    start: startOfMonth(new Date()),
    end: endOfMonth(new Date())
  });

  // Filtreler & Modallar
  const [activeKpiFilter, setActiveKpiFilter] = useState('ALL'); // 'ALL' | 'OVERDUE' | 'TODAY' | 'THIS_WEEK'
  const [studentSearch, setStudentSearch] = useState('');
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedStudentForAssign, setSelectedStudentForAssign] = useState(null);
  const [selectedEventModal, setSelectedEventModal] = useState(null);

  // Veri Çekme
  const { data: students = [], isLoading: isStudentsLoading } = useStudents();
  const { data: report } = useReportsOverview();
  const completeHomeworkMutation = useCompleteHomework();

  const { data: events = [] } = useCalendarEvents(
    format(dateRange.start, 'yyyy-MM-dd'),
    format(dateRange.end, 'yyyy-MM-dd')
  );

  const handleRangeChange = (range) => {
    if (Array.isArray(range)) {
      if (range.length > 0) {
        setDateRange({ start: range[0], end: range[range.length - 1] });
      }
    } else if (range?.start && range?.end) {
      setDateRange({ start: range.start, end: range.end });
    }
  };

  const formattedEvents = useMemo(() => {
    return events.map((ev) => ({
      ...ev,
      start: new Date(ev.start || ev.date),
      end: new Date(ev.end || ev.date),
      title: ev.studentName ? `${ev.title} — ${ev.studentName}` : ev.title
    }));
  }, [events]);

  const todayStr = format(new Date(), 'yyyy-MM-dd');

  // Bugünün Ödevleri
  const todaysHomeworks = useMemo(() => {
    return formattedEvents.filter(
      (ev) => ev.type === 'HOMEWORK' && format(ev.start, 'yyyy-MM-dd') === todayStr
    );
  }, [formattedEvents, todayStr]);

  // Filtrelenmiş Öğrenci Listesi
  const filteredStudents = useMemo(() => {
    if (!studentSearch.trim()) return students;
    const q = studentSearch.toLowerCase();
    return students.filter(
      (s) =>
        s.fullName?.toLowerCase().includes(q) ||
        (s.grade != null && `${s.grade}`.includes(q)) ||
        s.track?.toLowerCase().includes(q)
    );
  }, [students, studentSearch]);

  // Filtrelenmiş Ajanda Görevleri
  const displayedTasks = useMemo(() => {
    if (activeKpiFilter === 'OVERDUE') {
      return formattedEvents.filter((ev) => ev.type === 'HOMEWORK' && ev.isOverdue);
    }
    if (activeKpiFilter === 'TODAY') {
      return todaysHomeworks;
    }
    if (activeKpiFilter === 'THIS_WEEK') {
      return formattedEvents.filter((ev) => ev.type === 'HOMEWORK');
    }
    // Varsayılan: Bugünün ödevleri, yoksa yaklaşan ödevler
    return todaysHomeworks.length > 0 ? todaysHomeworks : formattedEvents.filter(ev => ev.type === 'HOMEWORK').slice(0, 5);
  }, [activeKpiFilter, formattedEvents, todaysHomeworks]);

  // KPI Kartları Verisi
  const totalStudentsCount = report?.totalStudents ?? students.length;
  const assignedThisWeekCount = report?.assignedThisWeek ?? 0;
  const completedTodayCount = report?.completedToday ?? 0;
  const totalOverdueCount = report?.totalOverdue ?? 0;

  const weeklyCompletionRate = assignedThisWeekCount > 0 
    ? Math.min(100, Math.round(((completedTodayCount * 2) / assignedThisWeekCount) * 100))
    : 0;

  const handleKpiClick = (filterKey) => {
    setActiveKpiFilter((prev) => (prev === filterKey ? 'ALL' : filterKey));
  };

  const handleOpenAssign = (student = null) => {
    setSelectedStudentForAssign(student);
    setIsAssignModalOpen(true);
  };

  const handleCompleteTask = (ev, e) => {
    e.stopPropagation();
    if (!ev.id) return;
    completeHomeworkMutation.mutate({ assignmentId: ev.id });
  };

  return (
    <div className={styles.dashboardContainer}>
      {/* ── ÜST ÖZET (KPI) KARTLARI (4 SÜTUN) ───────────────── */}
      <section className={styles.kpiGrid}>
        {/* 1. Toplam Öğrenci */}
        <div 
          className={`${styles.kpiCard} ${activeKpiFilter === 'ALL' ? styles.kpiActive : ''}`}
          onClick={() => handleKpiClick('ALL')}
          title="Tümünü göster"
        >
          <div className={styles.kpiHeader}>
            <span className={styles.kpiLabel}>TOPLAM ÖĞRENCİ</span>
            <div className={`${styles.kpiIconWrap} ${styles.iconIndigo}`}>
              <Users size={20} strokeWidth={1.75} />
            </div>
          </div>
          <div className={styles.kpiValue}>{totalStudentsCount}</div>
          <div className={styles.kpiSubtext}>
            <span className={styles.subtextDot} />
            Aktif koçluk yapılan
          </div>
        </div>

        {/* 2. Bu Hafta Verilen */}
        <div 
          className={`${styles.kpiCard} ${activeKpiFilter === 'THIS_WEEK' ? styles.kpiActive : ''}`}
          onClick={() => handleKpiClick('THIS_WEEK')}
          title="Haftalık verilen ödevleri filtrele"
        >
          <div className={styles.kpiHeader}>
            <span className={styles.kpiLabel}>BU HAFTA VERİLEN</span>
            <div className={`${styles.kpiIconWrap} ${styles.iconSky}`}>
              <ClipboardList size={20} strokeWidth={1.75} />
            </div>
          </div>
          <div className={styles.kpiValue}>{assignedThisWeekCount}</div>
          <div className={styles.kpiProgressBox}>
            <div className={styles.miniProgressBar}>
              <div 
                className={styles.miniProgressFill} 
                style={{ width: `${weeklyCompletionRate}%` }} 
              />
            </div>
            <span className={styles.progressPercentText}>%{weeklyCompletionRate} tamamlandı</span>
          </div>
        </div>

        {/* 3. Bugün Biten */}
        <div 
          className={`${styles.kpiCard} ${activeKpiFilter === 'TODAY' ? styles.kpiActive : ''}`}
          onClick={() => handleKpiClick('TODAY')}
          title="Bugünün teslimlerini filtrele"
        >
          <div className={styles.kpiHeader}>
            <span className={styles.kpiLabel}>BUGÜN BİTEN</span>
            <div className={`${styles.kpiIconWrap} ${styles.iconEmerald}`}>
              <CheckCircle2 size={20} strokeWidth={1.75} />
            </div>
          </div>
          <div className={styles.kpiValue}>{completedTodayCount}</div>
          <div className={styles.kpiSubtext}>
            Bugün teslim bekleyen: <strong className={styles.highlightText}>{todaysHomeworks.length}</strong>
          </div>
        </div>

        {/* 4. Gecikmiş */}
        <div 
          className={`
            ${styles.kpiCard} 
            ${totalOverdueCount > 0 ? styles.kpiAlertBorder : ''} 
            ${activeKpiFilter === 'OVERDUE' ? styles.kpiActive : ''}
          `}
          onClick={() => handleKpiClick('OVERDUE')}
          title="Gecikmiş ödevleri filtrele"
        >
          <div className={styles.kpiHeader}>
            <span className={styles.kpiLabel}>GECİKMİŞ</span>
            <div className={`${styles.kpiIconWrap} ${styles.iconRose}`}>
              <AlertTriangle size={20} strokeWidth={1.75} />
            </div>
          </div>
          <div className={`${styles.kpiValue} ${totalOverdueCount > 0 ? styles.valAlert : ''}`}>
            {totalOverdueCount}
          </div>
          <div className={styles.kpiSubtext}>
            {totalOverdueCount > 0 ? (
              <span className={styles.dangerNotice}>⚠️ Acil takip bekliyor</span>
            ) : (
              'Gecikmiş ödev yok'
            )}
          </div>
        </div>
      </section>

      {/* ── 12 SÜTUNLU ASİMETRİK BENTO GRID ─────────────────── */}
      <div className={styles.bentoGrid}>
        {/* SOL KOLON (5 Sütun): Öğrencilerim & Hızlı Durum Paneli */}
        <section className={styles.leftColumn}>
          <div className={styles.panelCard}>
            <div className={styles.panelHeader}>
              <div className={styles.titleGroup}>
                <h2 className={styles.panelTitle}>Öğrencilerim</h2>
                <span className={styles.countPill}>{students.length}</span>
              </div>
              <button 
                type="button" 
                className={styles.addStudentBtn} 
                onClick={() => navigate('/coach/students')}
                title="Yeni Öğrenci Ekle"
              >
                <Plus size={15} strokeWidth={2.5} />
                <span>Yeni Öğrenci</span>
              </button>
            </div>

            {/* Arama Inputu */}
            <div className={styles.studentSearchBox}>
              <Search size={15} strokeWidth={1.75} className={styles.searchIcon} />
              <input
                type="text"
                placeholder="Öğrenci veya sınıf ara..."
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
                className={styles.studentSearchInput}
              />
              {studentSearch && (
                <button 
                  className={styles.clearSearchBtn} 
                  onClick={() => setStudentSearch('')}
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Öğrenci Kartları Listesi */}
            <div className={styles.studentList}>
              {isStudentsLoading ? (
                <div className={styles.emptyNotice}>Öğrenciler yükleniyor...</div>
              ) : filteredStudents.length > 0 ? (
                filteredStudents.map((student) => {
                  const initial = student.fullName?.charAt(0)?.toUpperCase() || 'Ö';
                  const hasGrade = student.grade != null;
                  const completedHw = student.completedHomeworkCount || 0;
                  const totalHw = completedHw + (student.pendingHomeworkCount || 0);
                  const studentProgress = totalHw > 0 ? Math.round((completedHw / totalHw) * 100) : 0;

                  return (
                    <div key={student.id} className={styles.studentCard}>
                      <div className={styles.studentTopRow}>
                        <div className={styles.studentAvatar}>{initial}</div>
                        <div className={styles.studentMainInfo}>
                          <span 
                            className={styles.studentName}
                            onClick={() => navigate(`/coach/students/${student.id}`)}
                            title={student.fullName}
                          >
                            {student.fullName}
                          </span>
                          
                          {/* Sınıf / Alan Rozeti */}
                          <div className={styles.badgeRow}>
                            {hasGrade ? (
                              <span className={styles.gradeBadge}>
                                {student.grade}. Sınıf {student.track ? `• ${student.track}` : ''}
                              </span>
                            ) : (
                              <span 
                                className={styles.noGradeBadge}
                                onClick={() => navigate(`/coach/students/${student.id}`)}
                                title="Sınıf bilgisi eklemek için tıklayın"
                              >
                                <AlertCircle size={11} strokeWidth={2} />
                                Sınıf Belirtilmemiş
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Hızlı Aksiyon Butonları */}
                        <div className={styles.studentActions}>
                          <button
                            type="button"
                            className={styles.actionBtn}
                            onClick={() => handleOpenAssign(student)}
                            title="Ödev Ver"
                            aria-label="Ödev Ver"
                          >
                            <PlusCircle size={16} strokeWidth={1.75} />
                          </button>
                          <button
                            type="button"
                            className={styles.actionBtn}
                            onClick={() => navigate(`/coach/students/${student.id}`)}
                            title="Takvimini Gör"
                            aria-label="Takvim"
                          >
                            <CalendarIcon size={16} strokeWidth={1.75} />
                          </button>
                          <button
                            type="button"
                            className={styles.actionBtn}
                            onClick={() => navigate(`/coach/students/${student.id}`)}
                            title="Öğrenci Detayı"
                            aria-label="Detay"
                          >
                            <ArrowUpRight size={16} strokeWidth={1.75} />
                          </button>
                        </div>
                      </div>

                      {/* İnce Tamamlama Progress Barı */}
                      <div className={styles.studentProgressRow}>
                        <div className={styles.studentProgressBar}>
                          <div 
                            className={styles.studentProgressFill} 
                            style={{ width: `${studentProgress}%` }}
                          />
                        </div>
                        <span className={styles.progressLabelText}>
                          %{studentProgress} Tamamlandı
                        </span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className={styles.emptyNotice}>
                  {studentSearch ? 'Aramanıza uygun öğrenci bulunamadı.' : 'Henüz öğrenciniz bulunmuyor.'}
                </div>
              )}
            </div>
          </div>

          {/* Boşluk Yönetimi: Son Aktiviteler / Sistem Durumu Kartı */}
          <div className={styles.secondaryCard}>
            <div className={styles.secondaryHeader}>
              <div className={styles.secondaryTitleWrap}>
                <Sparkles size={16} className={styles.sparkleIcon} />
                <span className={styles.secondaryTitle}>Koçluk Durumu & Hızlı Takip</span>
              </div>
            </div>
            <div className={styles.summaryStatsRow}>
              <div className={styles.summaryStatItem}>
                <span className={styles.summaryNum}>{students.length}</span>
                <span className={styles.summaryLabel}>Aktif Öğrenci</span>
              </div>
              <div className={styles.summaryDivider} />
              <div className={styles.summaryStatItem}>
                <span className={styles.summaryNum}>{todaysHomeworks.length}</span>
                <span className={styles.summaryLabel}>Bugün Teslim</span>
              </div>
              <div className={styles.summaryDivider} />
              <div className={styles.summaryStatItem}>
                <span className={styles.summaryNum}>{totalOverdueCount}</span>
                <span className={styles.summaryLabel}>Geciken</span>
              </div>
            </div>
          </div>
        </section>

        {/* SAĞ KOLON (7 Sütun): Birleşik Ajanda & Modern Takvim */}
        <section className={styles.rightColumn}>
          {/* Üst Kısım: Öncelikli Görev / Ödev Şeridi */}
          <div className={styles.panelCard}>
            <div className={styles.panelHeader}>
              <div className={styles.titleGroup}>
                <h2 className={styles.panelTitle}>Bugünün Öncelikli Görevleri</h2>
                <span className={styles.countPill}>{displayedTasks.length}</span>
              </div>
              {activeKpiFilter !== 'ALL' && (
                <button 
                  className={styles.clearFilterBadge} 
                  onClick={() => setActiveKpiFilter('ALL')}
                >
                  <span>Filtre: {activeKpiFilter}</span>
                  <X size={12} />
                </button>
              )}
            </div>

            {/* Görev Satırları (Task Rows) */}
            <div className={styles.taskList}>
              {displayedTasks.length > 0 ? (
                displayedTasks.map((ev) => {
                  const isDone = ev.status === 'COMPLETED';
                  const isOverdue = ev.isOverdue || (ev.type === 'HOMEWORK' && !isDone && new Date(ev.start) < new Date(todayStr));

                  return (
                    <div 
                      key={ev.id} 
                      className={styles.taskRow}
                      onClick={() => setSelectedEventModal(ev)}
                    >
                      <div className={styles.taskLeft}>
                        <div className={styles.taskIconCircle}>
                          <BookOpen size={16} strokeWidth={1.75} />
                        </div>
                        <div className={styles.taskInfo}>
                          <span className={styles.taskTitle}>{ev.title}</span>
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
                        </div>
                      </div>

                      <div className={styles.taskRight}>
                        {/* Durum Rozeti */}
                        <span 
                          className={`
                            ${styles.statusBadge}
                            ${isDone ? styles.statusDone : isOverdue ? styles.statusOverdue : styles.statusPending}
                          `}
                        >
                          {isDone ? 'Teslim Edildi' : isOverdue ? 'Gecikti' : 'Bekliyor'}
                        </span>

                        {/* Satır İçi Aksiyon Butonları */}
                        <div className={styles.taskActionBtns}>
                          {!isDone && (
                            <button
                              type="button"
                              className={styles.inlineCheckBtn}
                              onClick={(e) => handleCompleteTask(ev, e)}
                              title="Ödevi Onayla"
                              aria-label="Onayla"
                            >
                              <Check size={14} strokeWidth={2.5} />
                            </button>
                          )}
                          <button
                            type="button"
                            className={styles.inlineDetailBtn}
                            onClick={() => setSelectedEventModal(ev)}
                            title="Detay Görüntüle"
                            aria-label="Detay"
                          >
                            <ArrowUpRight size={14} strokeWidth={2} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className={styles.emptyNotice}>
                  Bugün için teslim edilecek öncelikli görev bulunmuyor. 🎉
                </div>
              )}
            </div>
          </div>

          {/* Alt Kısım: Modernize Edilmiş Takvim */}
          <div className={styles.calendarWrapCard}>
            <div className={styles.calendarHeader}>
              <h3 className={styles.calendarTitle}>Akademik Takvim & Planlama</h3>
            </div>
            <Calendar
              events={formattedEvents}
              defaultView="month"
              onRangeChange={handleRangeChange}
              onSelectEvent={(ev) => setSelectedEventModal(ev)}
              style={{ height: 430 }}
            />
          </div>
        </section>
      </div>

      {/* ── ÖDEV ATAMA MODALI (Ortada Beliren) ───────────────── */}
      <AssignHomeworkModal
        isOpen={isAssignModalOpen}
        onClose={() => setIsAssignModalOpen(false)}
        selectedStudent={selectedStudentForAssign}
      />

      {/* ── ETKİNLİK DETAY MODALI (Ortada Beliren) ───────────── */}
      {selectedEventModal && (
        <Modal
          isOpen={!!selectedEventModal}
          onClose={() => setSelectedEventModal(null)}
          title="Etkinlik & Görev Detayı"
        >
          <div className={styles.eventModalBody}>
            <div className={styles.eventModalHeader}>
              <div className={styles.modalIconBox}>
                <FileText size={22} className={styles.modalEventIcon} />
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
