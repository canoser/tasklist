import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  usePrograms,
  useTeacherDetail,
  useTeacherStudents,
  useTeacherHomeworkStats,
  useTeacherExamStats,
} from '../coachSchoolApi';
import Button from '../../../components/common/Button/Button';
import Card from '../../../components/common/Card/Card';
import SegmentedTabs from '../../../components/common/SegmentedTabs/SegmentedTabs';
import StatusBadge from '../../../components/common/StatusBadge/StatusBadge';
import EditTeacherModal from './EditTeacherModal';
import {
  ArrowLeft,
  Mail,
  Phone,
  BookOpen,
  Users,
  CheckCircle,
  Clock,

  Award,

  FileText,
  UserCheck,
  UserX,
  Edit3,
  Percent,
} from 'lucide-react';
import styles from './CoachTeacherDetailPage.module.css';

const CoachTeacherDetailPage = () => {
  const { programId: routeProgramId, teacherId } = useParams();
  const navigate = useNavigate();

  const { data: programs = [] } = usePrograms();
  const programId = routeProgramId || programs[0]?.id;

  const [activeTab, setActiveTab] = useState('students'); // 'students' | 'homework' | 'exams' | 'courses'
  const [studentSubTab, setStudentSubTab] = useState('active'); // 'active' | 'past'
  const [isEditOpen, setIsEditOpen] = useState(false);

  const { data: teacher, isLoading: isTeacherLoading } = useTeacherDetail(programId, teacherId);
  const { data: studentsData, isLoading: isStudentsLoading } = useTeacherStudents(programId, teacherId);
  const { data: homeworkStats, isLoading: isHomeworkLoading } = useTeacherHomeworkStats(programId, teacherId);
  const { data: examStats, isLoading: isExamsLoading } = useTeacherExamStats(programId, teacherId);

  if (isTeacherLoading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner} />
        <p>Öğretmen profili yükleniyor...</p>
      </div>
    );
  }

  if (!teacher) {
    return (
      <div className={styles.container}>
        <Button size="sm" variant="outline" onClick={() => navigate('/coach/teachers')}>
          <ArrowLeft size={16} />
          <span>Öğretmenler Listesine Dön</span>
        </Button>
        <Card className={styles.emptyCard} padding="lg">
          <p>Öğretmen bulunamadı veya bu programa erişiminiz yok.</p>
        </Card>
      </div>
    );
  }

  const activeStudents = studentsData?.activeStudents || [];
  const pastStudents = studentsData?.pastStudents || [];
  const displayedStudents = studentSubTab === 'active' ? activeStudents : pastStudents;

  return (
    <div className={styles.container}>
      {/* Üst Geri Çubuğu */}
      <div className={styles.topBar}>
        <Button
          size="sm"
          variant="outline"
          onClick={() => navigate('/coach/teachers')}
          className={styles.backBtn}
        >
          <ArrowLeft size={16} />
          <span>Öğretmenler Listesine Dön</span>
        </Button>
      </div>

      {/* Profil Kartı */}
      <Card className={styles.profileCard} padding="lg">
        <div className={styles.profileHeader}>
          <div className={styles.avatarLarge}>
            {teacher.fullName?.charAt(0)?.toUpperCase() || 'Ö'}
          </div>

          <div className={styles.profileDetails}>
            <div className={styles.nameRow}>
              <h1 className={styles.teacherName}>{teacher.fullName}</h1>
              {teacher.branch && <span className={styles.branchBadge}>{teacher.branch}</span>}
              <StatusBadge
                status={teacher.isActive ? 'ACTIVE' : 'INACTIVE'}
                label={teacher.isActive ? 'Aktif Öğretmen' : 'Pasif'}
              />
            </div>

            <div className={styles.contactRow}>
              <div className={styles.contactItem}>
                <Mail size={15} />
                <span>{teacher.email || 'E-posta belirtilmemiş'}</span>
              </div>
              <div className={styles.contactItem}>
                <Phone size={15} />
                <span>{teacher.phone || 'Telefon belirtilmemiş'}</span>
              </div>
              <div className={styles.contactItem}>
                <Users size={15} />
                <span>{teacher.studentCount ?? activeStudents.length} Aktif Öğrenci</span>
              </div>
            </div>
          </div>

          <div className={styles.editAction}>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsEditOpen(true)}
              className={styles.editBtn}
            >
              <Edit3 size={15} />
              <span>Bilgileri Düzenle</span>
            </Button>
          </div>
        </div>
      </Card>

      {/* Ana Sekmeler */}
      <SegmentedTabs
        tabs={[
          {
            id: 'students',
            label: `Öğrenciler (${activeStudents.length + pastStudents.length})`,
            icon: <Users size={16} />,
          },
          {
            id: 'homework',
            label: 'Ödevler & Dönüş Oranları',
            icon: <CheckCircle size={16} />,
            badge: homeworkStats && homeworkStats.totalHomeworks > 0 ? `%${homeworkStats.returnRate}` : null,
          },
          {
            id: 'exams',
            label: `Sınavlar & Netler (${examStats?.totalExams || 0})`,
            icon: <Award size={16} />,
          },
          {
            id: 'courses',
            label: `Verdiği Dersler (${teacher.courses?.length || 0})`,
            icon: <BookOpen size={16} />,
          },
        ]}
        activeTab={activeTab}
        onChange={setActiveTab}
      />

      {/* SEKME 1: ÖĞRENCİLER */}
      {activeTab === 'students' && (
        <div className={styles.tabContent}>
          {/* Alt Sekmeler: Aktif vs Geçmiş */}
          <div style={{ marginBottom: 14 }}>
            <SegmentedTabs
              tabs={[
                {
                  id: 'active',
                  label: `Aktif Öğrenciler (${activeStudents.length})`,
                  icon: <UserCheck size={15} />,
                },
                {
                  id: 'past',
                  label: `Geçmiş Öğrenciler (${pastStudents.length})`,
                  icon: <UserX size={15} />,
                },
              ]}
              activeTab={studentSubTab}
              onChange={setStudentSubTab}
              variant="pills"
              size="sm"
            />
          </div>

          {isStudentsLoading ? (
            <p className={styles.loadingText}>Öğrenci listesi yükleniyor...</p>
          ) : displayedStudents.length === 0 ? (
            <Card className={styles.emptyCard} padding="lg">
              <p>
                {studentSubTab === 'active'
                  ? 'Öğretmene atanmış aktif öğrenci bulunmuyor.'
                  : 'Öğretmenin geçmişte sorumlu olduğu öğrenci kaydı bulunmuyor.'}
              </p>
            </Card>
          ) : (
            <div className={styles.tableWrapper}>
              <table className={styles.dataTable}>
                <thead>
                  <tr>
                    <th>Öğrenci Adı</th>
                    <th>Sınıf / Hedef</th>
                    <th>İletişim</th>
                    <th>Aldığı Dersler</th>
                    <th>Durum</th>
                    <th>İşlem</th>
                  </tr>
                </thead>
                <tbody>
                  {displayedStudents.map((s) => (
                    <tr key={s.studentId}>
                      <td className={styles.studentNameCell}>
                        <div className={styles.studentAvatarMini}>
                          {s.studentName?.charAt(0)?.toUpperCase() || 'Ö'}
                        </div>
                        <span className={styles.boldText}>{s.studentName}</span>
                      </td>
                      <td>
                        <span className={styles.mutedText}>
                          {s.classLevel ? `${s.classLevel}. Sınıf` : ''}
                          {s.classLevel && s.targetExam ? ' · ' : ''}
                          {s.targetExam || (!s.classLevel ? 'Belirtilmemiş' : '')}
                        </span>
                      </td>
                      <td>
                        <div className={styles.contactMini}>
                          {s.phone && (
                            <span title={s.phone} className={styles.contactItemMini}>
                              <Phone size={12} /> {s.phone}
                            </span>
                          )}
                          {s.email && (
                            <span title={s.email} className={styles.contactItemMini}>
                              <Mail size={12} /> {s.email}
                            </span>
                          )}
                          {!s.phone && !s.email && <span className={styles.mutedText}>—</span>}
                        </div>
                      </td>
                      <td>
                        <div className={styles.badgeList}>
                          {s.courses?.map((cName, idx) => (
                            <span key={idx} className={styles.courseBadgeMini}>
                              {cName}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td>
                        <StatusBadge
                          status={s.isActive ? 'ACTIVE' : 'INACTIVE'}
                          label={s.isActive ? 'Aktif' : 'Ayrıldı'}
                        />
                      </td>
                      <td>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => navigate(`/coach/students/${s.studentId}`)}
                          className={styles.actionBtnMini}
                        >
                          Detay →
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* SEKME 2: ÖDEVLER & DÖNÜŞ ORANLARI */}
      {activeTab === 'homework' && (
        <div className={styles.tabContent}>
          {isHomeworkLoading ? (
            <p className={styles.loadingText}>Ödev istatistikleri yükleniyor...</p>
          ) : !homeworkStats || homeworkStats.totalHomeworks === 0 ? (
            <Card className={styles.emptyCard} padding="lg">
              <p>Öğretmenin derslerine ait henüz verilmiş bir ödev bulunmamaktadır.</p>
            </Card>
          ) : (
            <>
              {/* Özet Metrik Kartları */}
              <div className={styles.metricGrid}>
                <Card className={styles.metricCard} padding="md">
                  <div className={styles.metricIconWrap} style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6' }}>
                    <FileText size={20} />
                  </div>
                  <div>
                    <span className={styles.metricValue}>{homeworkStats.totalHomeworks}</span>
                    <span className={styles.metricLabel}>Toplam Verilen Ödev</span>
                  </div>
                </Card>

                <Card className={styles.metricCard} padding="md">
                  <div className={styles.metricIconWrap} style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }}>
                    <CheckCircle size={20} />
                  </div>
                  <div>
                    <span className={styles.metricValue}>{homeworkStats.completedHomeworks}</span>
                    <span className={styles.metricLabel}>Tamamlanan Ödev</span>
                  </div>
                </Card>

                <Card className={styles.metricCard} padding="md">
                  <div className={styles.metricIconWrap} style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b' }}>
                    <Clock size={20} />
                  </div>
                  <div>
                    <span className={styles.metricValue}>{homeworkStats.pendingHomeworks}</span>
                    <span className={styles.metricLabel}>Bekleyen Ödev</span>
                  </div>
                </Card>

                <Card className={styles.metricCard} padding="md">
                  <div className={styles.metricIconWrap} style={{ background: 'rgba(139, 92, 246, 0.15)', color: '#8b5cf6' }}>
                    <Percent size={20} />
                  </div>
                  <div>
                    <div className={styles.rateRow}>
                      <span className={styles.metricValue}>%{homeworkStats.returnRate}</span>
                    </div>
                    <span className={styles.metricLabel}>Genel Dönüş Oranı</span>
                  </div>
                </Card>
              </div>

              {/* Öğrenci Bazında Dağılım Tablosu */}
              <h3 className={styles.sectionHeading}>Öğrenci Bazında Ödev Dönüş Oranları</h3>
              <div className={styles.tableWrapper}>
                <table className={styles.dataTable}>
                  <thead>
                    <tr>
                      <th>Öğrenci</th>
                      <th>Ders</th>
                      <th>Atanan Ödev</th>
                      <th>Tamamlanan</th>
                      <th>Dönüş Oranı</th>
                      <th>Son Durum</th>
                      <th>Son Teslim Tarihi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {homeworkStats.studentSummaries?.map((item) => (
                      <tr key={`${item.studentId}-${item.courseTitle}`}>
                        <td className={styles.boldText}>{item.studentName}</td>
                        <td>
                          <span className={styles.courseBadgeMini}>{item.courseTitle}</span>
                        </td>
                        <td>{item.totalAssigned} ödev</td>
                        <td>
                          <span className={styles.completedBadge}>{item.completed}</span>
                        </td>
                        <td>
                          <div className={styles.progressBarWrap}>
                            <div
                              className={styles.progressBarFill}
                              style={{
                                width: `${Math.min(100, Math.max(0, item.returnRate))}%`,
                                background:
                                  item.returnRate >= 70
                                    ? '#10b981'
                                    : item.returnRate >= 40
                                    ? '#f59e0b'
                                    : '#ef4444',
                              }}
                            />
                            <span className={styles.progressPercent}>%{item.returnRate}</span>
                          </div>
                        </td>
                        <td>
                          <StatusBadge
                            status={item.lastStatus || 'PENDING'}
                            label={
                              item.lastStatus === 'DONE'
                                ? 'Tamamlandı'
                                : item.lastStatus === 'OVERDUE'
                                ? 'Gecikmiş'
                                : 'Bekliyor'
                            }
                          />
                        </td>
                        <td>
                          <span className={styles.mutedText}>
                            {item.lastDueDate
                              ? new Date(item.lastDueDate).toLocaleDateString('tr-TR')
                              : '—'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {/* SEKME 3: SINAVLAR & NETLER */}
      {activeTab === 'exams' && (
        <div className={styles.tabContent}>
          {isExamsLoading ? (
            <p className={styles.loadingText}>Sınav sonuçları yükleniyor...</p>
          ) : !examStats || examStats.totalExams === 0 ? (
            <Card className={styles.emptyCard} padding="lg">
              <p>Öğretmenin derslerine ait henüz bir sınav sonucu kaydedilmemiştir.</p>
            </Card>
          ) : (
            <>
              <div className={styles.tableWrapper}>
                <table className={styles.dataTable}>
                  <thead>
                    <tr>
                      <th>Sınav Adı</th>
                      <th>Tür</th>
                      <th>Tarih</th>
                      <th>Öğrenci Adı</th>
                      <th>İlgili Ders</th>
                      <th>Toplam Net</th>
                    </tr>
                  </thead>
                  <tbody>
                    {examStats.examResults?.map((ex) => (
                      <tr key={ex.examId}>
                        <td className={styles.boldText}>{ex.examTitle}</td>
                        <td>
                          <span className={styles.examTypeBadge}>{ex.examType}</span>
                        </td>
                        <td>
                          <span className={styles.mutedText}>
                            {ex.examDate
                              ? new Date(ex.examDate).toLocaleDateString('tr-TR')
                              : '—'}
                          </span>
                        </td>
                        <td>{ex.studentName}</td>
                        <td>
                          <span className={styles.courseBadgeMini}>{ex.courseTitle}</span>
                        </td>
                        <td>
                          <span className={styles.netScoreBadge}>
                            {ex.totalNet ? Number(ex.totalNet).toFixed(1) : '0.0'} Net
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {/* SEKME 4: DERSLER */}
      {activeTab === 'courses' && (
        <div className={styles.tabContent}>
          {teacher.courses && teacher.courses.length > 0 ? (
            <div className={styles.coursesGrid}>
              {teacher.courses.map((c) => (
                <Card key={c.id} className={styles.courseCard} padding="md">
                  <div className={styles.courseCardHeader}>
                    <BookOpen size={18} className={styles.courseIcon} />
                    <h3 className={styles.courseName}>{c.name}</h3>
                  </div>
                  {c.type && <span className={styles.courseType}>{c.type}</span>}
                </Card>
              ))}
            </div>
          ) : (
            <Card className={styles.emptyCard} padding="lg">
              <p>Öğretmene henüz atanmış bir ders bulunmuyor.</p>
            </Card>
          )}
        </div>
      )}

      {/* Düzenleme Modalı */}
      <EditTeacherModal
        open={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        programId={programId}
        teacher={teacher}
      />
    </div>
  );
};

export default CoachTeacherDetailPage;
