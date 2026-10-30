import React, { useState } from 'react';
import { 
  useTeacherCourses, 
  useTeacherCourseStudents, 
  useTeacherCourseHomework, 
  useTeacherCourseExams, 
  useCreateTeacherHomework, 
  useCreateTeacherExam, 
  useReviewTeacherHomework,
  useTeacherCourseResources,
  useCreateTeacherNote
} from '../teacherApi';
import Card from '../../../components/common/Card/Card';
import Button from '../../../components/common/Button/Button';
import Input from '../../../components/common/Input/Input';
import SegmentedTabs from '../../../components/common/SegmentedTabs/SegmentedTabs';
import StatusBadge from '../../../components/common/StatusBadge/StatusBadge';
import { useOpenUpload } from '../../storage/storageApi';
import TeacherStudentNotesModal from './TeacherStudentNotesModal';
import styles from './TeacherCoursesPage.module.css';
import { useLevels, useSubjects, useUnits, useTopics } from '../../coach/coachApi';

const fmt = (d) => (d ? String(d).slice(0, 10) : '');

const TeacherCoursesPage = () => {
  const { data: courses, isLoading } = useTeacherCourses();
  const [selected, setSelected] = useState(null);
  const [tab, setTab] = useState('students');
  const { openUpload } = useOpenUpload();

  const [hwAllStudents, setHwAllStudents] = useState(false);
  const [hwStudentId, setHwStudentId] = useState('');
  const [hwTitle, setHwTitle] = useState('');
  const [hwDesc, setHwDesc] = useState('');
  const [hwDue, setHwDue] = useState('');
  const [hwLevel, setHwLevel] = useState('');
  const [hwSubject, setHwSubject] = useState('');
  const [hwUnit, setHwUnit] = useState('');
  const [hwTopic, setHwTopic] = useState('');
  const [hwFreeTopic, setHwFreeTopic] = useState('');

  const course = courses?.find((c) => c.courseId === selected);
  const { data: students } = useTeacherCourseStudents(selected);
  const { data: homework } = useTeacherCourseHomework(selected);
  const { data: exams } = useTeacherCourseExams(selected);
  const { data: resources = [] } = useTeacherCourseResources(selected);
  
  const createHomework = useCreateTeacherHomework();
  const createExam = useCreateTeacherExam();
  const reviewHomework = useReviewTeacherHomework();
  const createNoteMutation = useCreateTeacherNote();

  const { data: hwLevels = [] } = useLevels();
  const { data: hwSubjects = [] } = useSubjects(hwLevel || undefined);
  const { data: hwUnits = [] } = useUnits(hwSubject || undefined, hwLevel || undefined);
  const { data: hwTopics = [] } = useTopics(hwSubject || undefined, hwLevel || undefined, hwUnit || undefined);

  const [reviewTarget, setReviewTarget] = useState(null);
  const [reviewFeedback, setReviewFeedback] = useState('');

  // T37: Öğrenci not modalı state
  const [activeNotesStudent, setActiveNotesStudent] = useState(null);

  // Ders tamamlama modalı state'leri
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [completeSummary, setCompleteSummary] = useState('');
  const [completeCoachNote, setCompleteCoachNote] = useState('');
  const [completeSuccessMsg, setCompleteSuccessMsg] = useState('');

  const submitReview = async (h) => {
    try {
      await reviewHomework.mutateAsync({
        courseId: selected,
        assignmentId: h.id,
        data: {
          status: 'DONE',
          feedback: reviewFeedback.trim(),
          expectedVersion: h.version ?? 1 // F2: Eşzamanlılık kontrolü
        }
      });
      setReviewTarget(null);
      setReviewFeedback('');
    } catch (err) {
      if (err?.response?.status === 409 || err?.response?.data?.code === 'CONCURRENCY_CONFLICT') {
        alert('Bu ödev başka bir sekmede veya öğrenci tarafından güncellendi. Sayfa yenileniyor...');
      } else {
        alert('Ödev değerlendirilemedi: ' + (err?.response?.data?.error || err.message));
      }
    }
  };

  const [showHomeworkForm, setShowHomeworkForm] = useState(false);
  const [showExamForm, setShowExamForm] = useState(false);
  const [exStudentId, setExStudentId] = useState('');
  const [exName, setExName] = useState('');
  const [exDate, setExDate] = useState('');
  const [exNet, setExNet] = useState('');

  const resetHomework = () => { setHwStudentId(''); setHwAllStudents(false); setHwTitle(''); setHwDesc(''); setHwDue(''); setHwLevel(''); setHwSubject(''); setHwUnit(''); setHwTopic(''); setHwFreeTopic(''); setShowHomeworkForm(false); };
  const resetExam = () => { setExStudentId(''); setExName(''); setExDate(''); setExNet(''); setShowExamForm(false); };

  const submitHomework = async (e) => {
    e.preventDefault();
    if ((!hwAllStudents && !hwStudentId) || !hwTitle || !hwDue) return;
    if (hwTopic === '__other__' && !hwFreeTopic.trim()) { alert("Lütfen serbest konu başlığı giriniz."); return; }
    await createHomework.mutateAsync({
      courseId: selected,
      data: {
        ...(hwAllStudents ? {} : { studentId: hwStudentId }),
        subjectId: hwSubject || null,
        curriculumTopicId: hwTopic && hwTopic !== '__other__' ? hwTopic : null,
        freeTopic: hwTopic === '__other__' ? hwFreeTopic.trim() : null,
        title: hwTitle,
        description: hwDesc || null,
        dueDate: hwDue
      }
    });
    resetHomework();
  };

  const submitExam = async (e) => {
    e.preventDefault();
    if (!exStudentId || !exDate) return;
    await createExam.mutateAsync({ courseId: selected, data: { studentId: exStudentId, examDate: exDate, examName: exName || null, totalNet: exNet ? parseFloat(exNet) : 0 } });
    resetExam();
  };

  if (isLoading) return <div className={styles.container}><p>Yükleniyor...</p></div>;

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Derslerim</h1>

      {!selected ? (
        <div className={styles.list}>
          {courses?.map((c) => (
            <Card key={c.courseId} className={styles.card} padding="md" onClick={() => { setSelected(c.courseId); setTab('students'); }}>
              <strong>{c.name}</strong>
              <span className={styles.type}>{c.type}</span>
              {c.programName && <span className={styles.programBadge}>{c.programName}</span>}
            </Card>
          ))}
          {courses?.length === 0 && <p className={styles.empty}>Henüz ders atanmadı.</p>}
        </div>
      ) : (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <Button size="sm" variant="outline" onClick={() => setSelected(null)}>← Geri</Button>
            <Button 
              size="sm" 
              variant="primary" 
              onClick={() => { setShowCompleteModal(true); setCompleteSuccessMsg(''); }}
            >
              ✓ Dersi Tamamla
            </Button>
          </div>

          <h2 className={styles.subtitle}>{course?.name}</h2>

          {showCompleteModal && (
            <div style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              borderRadius: '8px',
              padding: '1rem',
              marginBottom: '1rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem'
            }}>
              <h4 style={{ margin: 0, color: 'var(--text-primary)' }}>Dersi Tamamla ve Değerlendirme Notu Ekle</h4>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                  Kısa Özet (Öğrenci & Veli Görür)
                </label>
                <input
                  type="text"
                  value={completeSummary}
                  onChange={(e) => setCompleteSummary(e.target.value)}
                  placeholder="Örn: Konu anlatımı ve soru çözümü tamamlandı."
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    borderRadius: '6px',
                    border: '1px solid var(--border-color)',
                    background: 'var(--bg-app)',
                    color: 'var(--text-primary)',
                    fontSize: '0.85rem'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                  Koça Özel Not (Detaylı Pedagojik Değerlendirme)
                </label>
                <textarea
                  rows={3}
                  value={completeCoachNote}
                  onChange={(e) => setCompleteCoachNote(e.target.value)}
                  placeholder="Koçun bilmesi gereken pedagojik detaylar, dikkat dağılması, tavsiyeler..."
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    borderRadius: '6px',
                    border: '1px solid var(--border-color)',
                    background: 'var(--bg-app)',
                    color: 'var(--text-primary)',
                    fontSize: '0.85rem'
                  }}
                />
              </div>

              {completeSuccessMsg && (
                <div style={{ color: 'var(--color-success, #10b981)', fontSize: '0.85rem' }}>
                  {completeSuccessMsg}
                </div>
              )}

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <Button
                  size="sm"
                  isLoading={createNoteMutation.isPending}
                  onClick={async () => {
                    if (!completeCoachNote.trim() && !completeSummary.trim()) {
                      alert('Lütfen en az bir değerlendirme notu girin.');
                      return;
                    }
                    if (students && students.length > 0) {
                      for (const st of students) {
                        await createNoteMutation.mutateAsync({
                          courseId: selected,
                          studentId: st.id,
                          data: {
                            note: completeCoachNote.trim() || completeSummary.trim(),
                            summary: completeSummary.trim() || null,
                            visibility: completeCoachNote.trim() ? 'COACH_ONLY' : 'STUDENT_VISIBLE'
                          }
                        });
                      }
                    }
                    setCompleteSuccessMsg('Ders tamamlandı ve değerlendirme notları kaydedildi.');
                    setTimeout(() => {
                      setShowCompleteModal(false);
                      setCompleteSummary('');
                      setCompleteCoachNote('');
                      setCompleteSuccessMsg('');
                    }, 1500);
                  }}
                >
                  Tamamla ve Notları Kaydet
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setShowCompleteModal(false)}>
                  Vazgeç
                </Button>
              </div>
            </div>
          )}

          <div style={{ marginBottom: '1rem' }}>
            <SegmentedTabs
              tabs={[
                { id: 'students', label: 'Öğrencilerim' },
                ...(course?.canViewHomework ? [{ id: 'homework', label: 'Ödevler' }] : []),
                ...(course?.canViewExams ? [{ id: 'exams', label: 'Sınavlar' }] : []),
                { id: 'resources', label: `Kaynaklar (${resources.length})` },
              ]}
              activeTab={tab}
              onChange={setTab}
            />
          </div>

          {tab === 'students' && (
            <div>
              {students?.map((s) => (
                <Card key={s.id} className={styles.card} padding="md" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <strong>{s.fullName}</strong>
                    {s.email && <span className={styles.meta} style={{ display: 'block' }}>{s.email}</span>}
                    {s.grade != null && <span className={styles.meta}>Sınıf: {s.grade}</span>}
                  </div>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveNotesStudent(s);
                    }}
                  >
                    Ders Notları
                  </Button>
                </Card>
              ))}
              {students?.length === 0 && <p className={styles.empty}>Öğrenci yok.</p>}
            </div>
          )}

          {tab === 'homework' && (
            <div>
              {course?.canManageHomework && (
                <div className={styles.actionsBar}>
                  {!showHomeworkForm && <Button size="sm" onClick={() => setShowHomeworkForm(true)}>+ Ödev Ata</Button>}
                  {showHomeworkForm && (
                    <form onSubmit={submitHomework} className={styles.form}>
                      <label className={styles.checkboxLabel}>
                        <input type="checkbox" checked={hwAllStudents} onChange={(e) => setHwAllStudents(e.target.checked)} />
                        Tüm sınıfa ata
                      </label>
                      {!hwAllStudents && (
                        <select className={styles.select} value={hwStudentId} onChange={(e) => setHwStudentId(e.target.value)} required>
                          <option value="">Öğrenci seç</option>
                          {students?.map((s) => <option key={s.id} value={s.id}>{s.fullName}</option>)}
                        </select>
                      )}
                      <select className={styles.select} value={hwLevel} onChange={(e) => { setHwLevel(e.target.value); setHwSubject(''); setHwUnit(''); setHwTopic(''); setHwFreeTopic(''); }}>
                        <option value="">Seviye seç</option>
                        {hwLevels.map((l) => <option key={l} value={l}>{l}</option>)}
                      </select>
                      <select className={styles.select} value={hwSubject} onChange={(e) => { setHwSubject(e.target.value); setHwUnit(''); setHwTopic(''); setHwFreeTopic(''); }} disabled={!hwLevel}>
                        <option value="">Ders seç</option>
                        {hwSubjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                      </select>
                      <select className={styles.select} value={hwUnit} onChange={(e) => { setHwUnit(e.target.value); setHwTopic(''); setHwFreeTopic(''); }} disabled={!hwSubject}>
                        <option value="">Tema (opsiyonel)</option>
                        {hwUnits.map((u) => <option key={u.unitNumber} value={u.unitNumber}>{u.unitNumber}{u.unitName ? `. ${u.unitName}` : ''}</option>)}
                      </select>
                      <select className={styles.select} value={hwTopic} onChange={(e) => { setHwTopic(e.target.value); setHwFreeTopic(''); }} disabled={!hwSubject}>
                        <option value="">Konu (opsiyonel)</option>
                        {hwTopics.map((t) => <option key={t.id} value={t.id}>{t.unitName ? `${t.unitName} → ` : ''}{t.topicName}</option>)}
                        <option value="__other__">➕ Bunun dışında (serbest konu)</option>
                      </select>
                      {hwTopic === '__other__' && (
                        <Input label="Serbest Konu Başlığı" value={hwFreeTopic} onChange={(e) => setHwFreeTopic(e.target.value)} placeholder="Örn: Karmaşık Sayılar" />
                      )}
                      <Input label="Başlık" value={hwTitle} onChange={(e) => setHwTitle(e.target.value)} placeholder="Ödev başlığı" />
                      <Input label="Açıklama" value={hwDesc} onChange={(e) => setHwDesc(e.target.value)} placeholder="Açıklama (opsiyonel)" />
                      <Input label="Son Tarih" type="date" value={hwDue} onChange={(e) => setHwDue(e.target.value)} />
                      <div className={styles.formActions}>
                        <Button type="submit" isLoading={createHomework.isPending}>Kaydet</Button>
                        <Button type="button" variant="ghost" onClick={resetHomework}>Vazgeç</Button>
                      </div>
                    </form>
                  )}
                </div>
              )}

              {homework?.map((h) => (
                <Card key={h.id} className={styles.card} padding="md">
                  <strong>{h.title}</strong>
                  <span className={styles.meta}>{h.studentName} · {fmt(h.dueDate)} · {h.status}</span>
                  {h.feedback && <span className={styles.meta}>Geri Bildirim: {h.feedback}</span>}
                  {course?.canProcessHomework && h.status !== 'DONE' && (
                    reviewTarget === h.id ? (
                      <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <Input label="Geri Bildirim" value={reviewFeedback} onChange={(e) => setReviewFeedback(e.target.value)} placeholder="Onay notu (opsiyonel)" />
                        <div style={{ display: 'flex', gap: 8 }}>
                          <Button size="sm" onClick={() => submitReview(h)} isLoading={reviewHomework.isPending}>Onayla (Tamamlandı)</Button>
                          <Button size="sm" variant="ghost" onClick={() => { setReviewTarget(null); setReviewFeedback(''); }}>Vazgeç</Button>
                        </div>
                      </div>
                    ) : (
                      <Button size="sm" variant="outline" onClick={() => { setReviewTarget(h.id); setReviewFeedback(''); }}>Onayla / Geri Bildir</Button>
                    )
                  )}
                </Card>
              ))}
              {homework?.length === 0 && <p className={styles.empty}>Ödev yok.</p>}
            </div>
          )}

          {tab === 'exams' && (
            <div>
              {course?.canManageExams && (
                <div className={styles.actionsBar}>
                  {!showExamForm && <Button size="sm" onClick={() => setShowExamForm(true)}>+ Sınav/Not Ekle</Button>}
                  {showExamForm && (
                    <form onSubmit={submitExam} className={styles.form}>
                      <select className={styles.select} value={exStudentId} onChange={(e) => setExStudentId(e.target.value)} required>
                        <option value="">Öğrenci seç</option>
                        {students?.map((s) => <option key={s.id} value={s.id}>{s.fullName}</option>)}
                      </select>
                      <Input label="Sınav Adı" value={exName} onChange={(e) => setExName(e.target.value)} placeholder="örn. 1. Deneme" />
                      <Input label="Tarih" type="date" value={exDate} onChange={(e) => setExDate(e.target.value)} />
                      <Input label="Net" type="number" step="0.01" value={exNet} onChange={(e) => setExNet(e.target.value)} placeholder="örn. 85.5" />
                      <div className={styles.formActions}>
                        <Button type="submit" isLoading={createExam.isPending}>Kaydet</Button>
                        <Button type="button" variant="ghost" onClick={resetExam}>Vazgeç</Button>
                      </div>
                    </form>
                  )}
                </div>
              )}

              {exams?.map((e) => (
                <Card key={e.id} className={styles.card} padding="md">
                  <strong>{e.name}</strong>
                  <span className={styles.meta}>{e.studentName} · {fmt(e.examDate)} · Net: {e.totalNet ?? '-'}</span>
                </Card>
              ))}
              {exams?.length === 0 && <p className={styles.empty}>Sınav yok.</p>}
            </div>
          )}

          {tab === 'resources' && (
            <div>
              {resources?.map((r) => (
                <Card key={r.id} className={styles.card} padding="md" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <strong>{r.title}</strong>
                    <span className={styles.meta} style={{ display: 'block' }}>
                      {r.resourceType || r.type || 'Ders Materyali'} {r.description ? `· ${r.description}` : ''}
                    </span>
                    {(r.url || r.resourceRef) && (
                      <a href={r.url || r.resourceRef} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.8rem', color: 'var(--color-primary)' }}>
                        Bağlantıyı Aç ↗
                      </a>
                    )}
                    {r.uploadId && (
                      <div style={{ marginTop: '4px' }}>
                        <Button
                          variant="outline"
                          size="xs"
                          onClick={() => openUpload(r.uploadId)}
                        >
                          📄 Yüklenen Belgeyi Aç ↗
                        </Button>
                      </div>
                    )}
                  </div>
                  <StatusBadge
                    status={r.isCompleted ? 'DONE' : 'PENDING'}
                    label={r.isCompleted ? 'Tamamlandı' : 'Devam Ediyor'}
                  />
                </Card>
              ))}
              {resources?.length === 0 && <p className={styles.empty}>Henüz ders kaynağı eklenmemiş.</p>}
            </div>
          )}
        </div>
      )}

      <TeacherStudentNotesModal 
        isOpen={!!activeNotesStudent} 
        onClose={() => setActiveNotesStudent(null)} 
        courseId={selected} 
        student={activeNotesStudent} 
      />
    </div>
  );
};

export default TeacherCoursesPage;
