import React from 'react';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import Modal from '../../../components/common/Modal/Modal';
import {
  CheckCircle2,
  AlertTriangle,
  Plus,
  Calendar as CalendarIcon,
  ArrowUpRight,
  Check,
  X,
  FileText,
  Clock,
  GraduationCap,
  ShieldCheck,
} from 'lucide-react';
import styles from './CoachDashboard.module.css';

const getTimelineTimeLabel = (ev) => {
  const timeStr = format(ev.start, 'HH:mm');
  if (ev.isAllDay || ev.type === 'HOMEWORK' || ev.type === 'HOMEWORK_DUE' || timeStr === '03:00' || timeStr === '00:00') {
    return 'Gün Boyu / Son Teslim';
  }
  return timeStr;
};

const DashboardRightColumn = ({
  activeTab,
  setActiveTab,
  overdueTasks,
  coachApprovals,
  recentTeacherNotes,
  today,
  tomorrow,
  todayEvents,
  tomorrowEvents,
  selectedEventModal,
  setSelectedEventModal,
  onCompleteTask,
  onApprove,
  onReject,
  onOpenAssign,
  navigate,
}) => {
  return (
    <>
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
                <span>Acil & Gecikenler ({overdueTasks.length})</span>
              </button>

              <button
                type="button"
                className={`${styles.tabBtn} ${activeTab === 'APPROVALS' ? styles.tabBtnActive : ''}`}
                onClick={() => setActiveTab('APPROVALS')}
              >
                <span>Onay Bekleyenler ({coachApprovals.length})</span>
              </button>

              <button
                type="button"
                className={`${styles.tabBtn} ${activeTab === 'TEACHER_NOTES' ? styles.tabBtnActive : ''}`}
                onClick={() => setActiveTab('TEACHER_NOTES')}
              >
                <span>Öğretmen Notları ({recentTeacherNotes.length})</span>
              </button>
            </div>
          </div>

          <div className={styles.tabContentList}>
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
                        onClick={(e) => onCompleteTask(ev, e)}
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
                  <CheckCircle2 size={16} style={{ verticalAlign: 'middle', marginRight: 6, color: '#16a34a' }} />
                  Gecikmiş veya acil müdahale gerektiren ödev bulunmuyor.
                </div>
              )
            )}

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
                            {item.entityType === 'HOMEWORK_EXTENSION' && 'Ödev Ek Süre Talebi'}
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
                          onClick={(e) => onApprove(item.id, e)}
                        >
                          <Check size={13} strokeWidth={2.5} />
                          <span>Onayla</span>
                        </button>
                        <button
                          type="button"
                          className={styles.btnActionReject}
                          onClick={(e) => onReject(item.id, e)}
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

        {/* SAĞ BLOK (5 Kolon): Bugün & Yarın Zaman Çizelgesi */}
        <section className={styles.timelineCard}>
          <div className={styles.timelineHeader}>
            <h3 className={styles.timelineTitle}>Bugün & Yarın Zaman Çizelgesi</h3>
            <div className={styles.timelineActions}>
              <button
                type="button"
                className={styles.timelineAddBtn}
                onClick={() => onOpenAssign()}
                title="Yeni Ödev veya Görev Ata"
              >
                <Plus size={13} strokeWidth={2.5} />
                <span>Görev</span>
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
            <div className={styles.timelineDaySection}>
              <span className={styles.timelineDayLabel}>
                <Clock size={13} />
                BUGÜN ({format(today, 'd MMMM EEEE', { locale: tr })})
              </span>

              <div className={styles.timelineItemList}>
                {todayEvents.length > 0 ? (
                  todayEvents.map((ev) => (
                    <div
                      key={ev.id}
                      className={styles.timelineItem}
                      onClick={() => setSelectedEventModal(ev)}
                    >
                      <div className={styles.timelineDot} />
                      <span className={styles.timelineTime}>
                        {getTimelineTimeLabel(ev)}
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

            <div className={styles.timelineDaySection}>
              <span className={styles.timelineDayLabel}>
                <CalendarIcon size={13} />
                YARIN ({format(tomorrow, 'd MMMM EEEE', { locale: tr })})
              </span>

              <div className={styles.timelineItemList}>
                {tomorrowEvents.length > 0 ? (
                  tomorrowEvents.map((ev) => (
                    <div
                      key={ev.id}
                      className={styles.timelineItem}
                      onClick={() => setSelectedEventModal(ev)}
                    >
                      <div className={styles.timelineDot} />
                      <span className={styles.timelineTime}>
                        {getTimelineTimeLabel(ev)}
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
    </>
  );
};

export default DashboardRightColumn;

