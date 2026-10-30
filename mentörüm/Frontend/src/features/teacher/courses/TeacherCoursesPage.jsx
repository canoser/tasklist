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
  useCreateTeacherNote,
} from '../teacherApi';
import Card from '../../../components/common/Card/Card';
import Button from '../../../components/common/Button/Button';
import Input, { Select, Textarea } from '../../../components/common/Input/Input';
import Modal from '../../../components/common/Modal/Modal';
import SegmentedTabs from '../../../components/common/SegmentedTabs/SegmentedTabs';
import StatusBadge from '../../../components/common/StatusBadge/StatusBadge';
import CurriculumTopicFields from '../../../components/common/CurriculumTopicFields/CurriculumTopicFields';
import { useOpenUpload } from '../../storage/storageApi';
import TeacherStudentNotesModal from './TeacherStudentNotesModal';
import styles from './TeacherCoursesPage.module.css';

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

  const [reviewTarget, setReviewTarget] = useState(null);
  const [reviewFeedback, setReviewFeedback] = useState('');
  const [activeNotesStudent, setActiveNotesStudent] = useState(null);

  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [completeSummary, setCompleteSummary] = useState('');
  const [completeCoachNote, setCompleteCoachNote] = useState('');
  const [completeSuccessMsg, setCompleteSuccessMsg] = useState('');

  const [showHomeworkForm, setShowHomeworkForm] = useState(false);
  const [showExamForm, setShowExamForm] = useState(false);
  const [exStudentId, setExStudentId] = useState('');
  const [exName, setExName] = useState('');
  const [exDate, setExDate] = useState('');
  const [exNet, setExNet] = useState('');

  const submitReview = async (h) => {
    try {
      await reviewHomework.mutateAsync({
        courseId: selected,
        assignmentId: h.id,
        data: {
          status: 'DONE',
          feedback: reviewFeedback.trim(),
          expectedVersion: h.version ?? 1,
        },
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

  const resetHomework = () => {
    setHwStudentId('');
    setHwAllStudents(false);
    setHwTitle('');
    setHwDesc('');
    setHwDue('');
    setHwLevel('');
    setHwSubject('');
    setHwUnit('');
    setHwTopic('');
    setHwFreeTopic('');
    setShowHomeworkForm(false);
  };

  const resetExam = () => {
    setExStudentId('');
    setExName('');
    setExDate('');
    setExNet('');
    setShowExamForm(false);
  };

  const submitHomework = async (e) => {
    e.preventDefault();
    if ((!hwAllStudents && !hwStudentId) || !hwTitle || !hwDue) return;
    if (hwTopic === '__other__' && !hwFreeTopic.trim()) {
      alert('Lütfen serbest konu başlığı giriniz.');
      return;
    }
    await createHomework.mutateAsync({
      courseId: selected,
      data: {
        ...(hwAllStudents ? {} : { studentId: hwStudentId }),
        subjectId: hwSubject || null,
        curriculumTopicId: hwTopic && hwTopic !== '__other__' ? hwTopic : null,
        freeTopic: hwTopic === '__other__' ? hwFreeTopic.trim() : null,
        title: hwTitle,
        description: hwDesc || null,
        dueDate: hwDue,
      },
    });
    resetHomework();
  };

  const submitExam = async (e) => {
    e.preventDefault();
    if (!exStudentId || !exDate) return;
    await createExam.mutateAsync({
      courseId: selected,
      data: {
        studentId: exStudentId,
        examDate: exDate,
        examName: exName || null,
        totalNet: exNet ? parseFloat(exNet) : 0,
      },
    });
    resetExam();
  };

  const handleCompleteCourse = async (e) => {
    e.preventDefault();
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
            visibility: completeCoachNote.trim() ? 'COACH_ONLY' : 'STUDENT_VISIBLE',
          },
        });
      }
    }
    setCompleteSuccessMsg('Ders tamamlandı ve değerlendirme notları kaydedildi.');
    setTimeout(() => {
      setShowCompleteModal(false);
      setCompleteSummary('');
      setCompleteCoachNote('');
      setCompleteSuccessMsg('');
    }, 1200);
  };

  if (isLoading) {
    return (
      <div className={styles.container}>
        <p>Yükleniyor...</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Derslerim</h1>

      {!selected ? (
        <div className={styles.list}>
          {courses?.map((c) => (
            <Card
              key={c.courseId}
              className={styles.card}
              padding="md"
              onClick={() => {
                setSelected(c.courseId);
                setTab('students');
              }}
            >
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
            <Button size="sm" variant="outline" onClick={() => setSelected(null)}>
              ← Geri
            </Button>
            <Button
              size="sm"
              variant="primary"
              onClick={() => {
                setShowCompleteModal(true);
                setCompleteSuccessMsg('');
              }}
            >
              ✓ Dersi Tamamla
            </Button>
          </div>

          <h2 className={styles.subtitle}>{course?.name}</h2>

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
                <Card
                  key={s.id}
                  className={styles.card}
                  padding="md"
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                >
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
                  <Button size="sm" onClick={() => setShowHomeworkForm(true)}>
                    + Ödev Ata
                  </Button>
                </div>
              )}

              {homework?.map((h) => (
                <Card key={h.id} className={styles.card} padding="md">
                  <strong>{h.title}</strong>
                  <span className={styles.meta}>
                    {h.studentName} · {fmt(h.dueDate)} · {h.status}
                  </span>
                  {h.feedback && <span className={styles.meta}>Geri Bildirim: {h.feedback}</span>}
                  {course?.canProcessHomework &&
                    h.status !== 'DONE' &&
                    (reviewTarget === h.id ? (
                      <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <Input
                          label="Geri Bildirim"
                          value={reviewFeedback}
                          onChange={(e) => setReviewFeedback(e.target.value)}
                          placeholder="Onay notu (opsiyonel)"
                        />
                        <div style={{ display: 'flex', gap: 8 }}>
                          <Button size="sm" onClick={() => submitReview(h)} isLoading={reviewHomework.isPending}>
                            Onayla (Tamamlandı)
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setReviewTarget(null);
                              setReviewFeedback('');
                            }}
                          >
                            Vazgeç
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setReviewTarget(h.id);
                          setReviewFeedback('');
                        }}
                      >
                        Onayla / Geri Bildir
                      </Button>
                    ))}
                </Card>
              ))}
              {homework?.length === 0 && <p className={styles.empty}>Ödev yok.</p>}
            </div>
          )}

          {tab === 'exams' && (
            <div>
              {course?.canManageExams && (
                <div className={styles.actionsBar}>
                  <Button size="sm" onClick={() => setShowExamForm(true)}>
                    + Sınav/Not Ekle
                  </Button>
                </div>
              )}

              {exams?.map((e) => (
                <Card key={e.id} className={styles.card} padding="md">
                  <strong>{e.name}</strong>
                  <span className={styles.meta}>
                    {e.studentName} · {fmt(e.examDate)} · Net: {e.totalNet ?? '-'}
                  </span>
                </Card>
              ))}
              {exams?.length === 0 && <p className={styles.empty}>Sınav yok.</p>}
            </div>
          )}

          {tab === 'resources' && (
            <div>
              {resources?.map((r) => (
                <Card
                  key={r.id}
                  className={styles.card}
                  padding="md"
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                >
                  <div>
                    <strong>{r.title}</strong>
                    <span className={styles.meta} style={{ display: 'block' }}>
                      {r.resourceType || r.type || 'Ders Materyali'} {r.description ? `· ${r.description}` : ''}
                    </span>
                    {(r.url || r.resourceRef) && (
                      <a
                        href={r.url || r.resourceRef}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ fontSize: '0.8rem', color: 'var(--color-primary)' }}
                      >
                        Bağlantıyı Aç ↗
                      </a>
                    )}
                    {r.uploadId && (
                      <div style={{ marginTop: '4px' }}>
                        <Button variant="outline" size="xs" onClick={() => openUpload(r.uploadId)}>
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

      {/* Ders Tamamlama Modalı */}
      <Modal
        isOpen={showCompleteModal}
        onClose={() => setShowCompleteModal(false)}
        title="Dersi Tamamla ve Değerlendirme Notu Ekle"
        maxWidth="480px"
      >
        <form onSubmit={handleCompleteCourse} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <Input
            label="Kısa Özet (Öğrenci & Veli Görür)"
            value={completeSummary}
            onChange={(e) => setCompleteSummary(e.target.value)}
            placeholder="Örn: Konu anlatımı ve soru çözümü tamamlandı."
          />

          <Textarea
            label="Koça Özel Not (Detaylı Pedagojik Değerlendirme)"
            rows={3}
            value={completeCoachNote}
            onChange={(e) => setCompleteCoachNote(e.target.value)}
            placeholder="Koçun bilmesi gereken pedagojik detaylar, dikkat dağılması, tavsiyeler..."
          />

          {completeSuccessMsg && (
            <div style={{ color: 'var(--color-success, #10b981)', fontSize: '0.85rem', fontWeight: 600 }}>
              {completeSuccessMsg}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', paddingTop: '8px', borderTop: '1px solid var(--border-color)' }}>
            <Button type="button" variant="ghost" onClick={() => setShowCompleteModal(false)}>
              İptal
            </Button>
            <Button type="submit" variant="primary" isLoading={createNoteMutation.isPending}>
              Tamamla ve Notları Kaydet
            </Button>
          </div>
        </form>
      </Modal>

      {/* Öğretmen Ödev Atama Modalı */}
      <Modal isOpen={showHomeworkForm} onClose={resetHomework} title={`Ödev Ata — ${course?.name || ''}`} maxWidth="500px">
        <form onSubmit={submitHomework} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <label className={styles.checkboxLabel}>
            <input
              type="checkbox"
              checked={hwAllStudents}
              onChange={(e) => setHwAllStudents(e.target.checked)}
            />
            <span>Tüm sınıfa ata</span>
          </label>

          {!hwAllStudents && (
            <Select
              label="Öğrenci *"
              value={hwStudentId}
              onChange={(e) => setHwStudentId(e.target.value)}
              required
            >
              <option value="">Öğrenci seç</option>
              {students?.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.fullName}
                </option>
              ))}
            </Select>
          )}

          <CurriculumTopicFields
            level={hwLevel}
            setLevel={setHwLevel}
            subject={hwSubject}
            setSubject={setHwSubject}
            unit={hwUnit}
            setUnit={setHwUnit}
            topic={hwTopic}
            setTopic={setHwTopic}
            freeTopic={hwFreeTopic}
            setFreeTopic={setHwFreeTopic}
            onTopicAutoTitle={(auto) => {
              if (!hwTitle || !hwTitle.trim()) setHwTitle(auto);
            }}
            disabled={createHomework.isPending}
          />

          <Input
            label="Ödev Başlığı *"
            value={hwTitle}
            onChange={(e) => setHwTitle(e.target.value)}
            placeholder="Örn: Limit Karma Test-1"
            required
          />

          <Textarea
            label="Açıklama"
            rows={3}
            value={hwDesc}
            onChange={(e) => setHwDesc(e.target.value)}
            placeholder="Açıklama (opsiyonel)"
          />

          <Input
            label="Son Teslim Tarihi *"
            type="date"
            value={hwDue}
            onChange={(e) => setHwDue(e.target.value)}
            required
          />

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', paddingTop: '8px', borderTop: '1px solid var(--border-color)' }}>
            <Button type="button" variant="ghost" onClick={resetHomework}>
              İptal
            </Button>
            <Button type="submit" variant="primary" isLoading={createHomework.isPending}>
              Ödevi Ata
            </Button>
          </div>
        </form>
      </Modal>

      {/* Öğretmen Sınav Ekleme Modalı */}
      <Modal isOpen={showExamForm} onClose={resetExam} title={`Sınav / Not Ekle — ${course?.name || ''}`} maxWidth="460px">
        <form onSubmit={submitExam} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <Select
            label="Öğrenci *"
            value={exStudentId}
            onChange={(e) => setExStudentId(e.target.value)}
            required
          >
            <option value="">Öğrenci seç</option>
            {students?.map((s) => (
              <option key={s.id} value={s.id}>
                {s.fullName}
              </option>
            ))}
          </Select>

          <Input
            label="Sınav Adı"
            value={exName}
            onChange={(e) => setExName(e.target.value)}
            placeholder="örn. 1. Deneme"
          />

          <Input
            label="Tarih *"
            type="date"
            value={exDate}
            onChange={(e) => setExDate(e.target.value)}
            required
          />

          <Input
            label="Net"
            type="number"
            step="0.01"
            value={exNet}
            onChange={(e) => setExNet(e.target.value)}
            placeholder="örn. 85.5"
          />

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', paddingTop: '8px', borderTop: '1px solid var(--border-color)' }}>
            <Button type="button" variant="ghost" onClick={resetExam}>
              İptal
            </Button>
            <Button type="submit" variant="primary" isLoading={createExam.isPending}>
              Kaydet
            </Button>
          </div>
        </form>
      </Modal>

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
