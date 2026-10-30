import React, { useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Paperclip, X, FileText } from 'lucide-react';
import {
  useCourses, useCourseStudents, useCourseGroups, useCourseResources,
  useAddCourseStudent, useRemoveCourseStudent, useAddCourseGroup, useRemoveCourseGroup, useCreateResource,
  useUpdateCourse, useGroups, useTeachers,
} from '../coachSchoolApi';

import { useCreateUploadUrl, useConfirmUpload, useDownloadUrl } from '../../storage/storageApi';
import { compressImage } from '../../../utils/imageCompressor';
import Button from '../../../components/common/Button/Button';
import Input from '../../../components/common/Input/Input';
import Card from '../../../components/common/Card/Card';
import AddStudentsToCourseModal from './AddStudentsToCourseModal';
import styles from './CoachCourseDetailPage.module.css';

const PERMS = [
  ['teacherCanViewProfile', 'Profili Gör'],
  ['teacherCanViewContact', 'İletişimi Gör'],
  ['teacherCanViewHomework', 'Ödevi Gör'],
  ['teacherCanManageHomework', 'Ödev Yönet'],
  ['teacherCanProcessHomework', 'Ödevi İşle (Onay/Not)'],
  ['teacherCanViewExams', 'Sınavı Gör'],
  ['teacherCanManageExams', 'Sınav Yönet'],
  ['teacherCanViewNotes', 'Notu Gör'],
  ['teacherCanAddNotes', 'Not Ekle'],
  ['teacherCanViewSchedule', 'Programı Gör'],
  ['teacherCanManageSchedule', 'Program Yönet'],
];

const CoachCourseDetailPage = () => {
  const { programId, courseId } = useParams();
  const navigate = useNavigate();
  const [tab, setTab] = useState('students');
  const [isAddStudentModalOpen, setIsAddStudentModalOpen] = useState(false);

  const [groupId, setGroupId] = useState('');
  const [resTitle, setResTitle] = useState('');
  const [resType, setResType] = useState('BOOK');
  const [teacherId, setTeacherId] = useState('');

  const { data: courses } = useCourses(programId);
  const course = courses?.find((c) => c.id === courseId);

  const { data: students } = useCourseStudents(programId, courseId);
  const { data: groups } = useCourseGroups(programId, courseId);

  const { data: allGroups = [] } = useGroups(programId);
  const { data: allTeachers = [] } = useTeachers(programId);
  const { data: resources } = useCourseResources(programId, courseId);
  const addStudent = useAddCourseStudent();
  const removeStudent = useRemoveCourseStudent();
  const addGroup = useAddCourseGroup();
  const removeGroup = useRemoveCourseGroup();
  const createResource = useCreateResource();
  const updateCourse = useUpdateCourse();
  const createUpload = useCreateUploadUrl();
  const confirmUpload = useConfirmUpload();
  const download = useDownloadUrl();
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadingRes, setUploadingRes] = useState(false);
  const fileInputRef = useRef(null);
  const [permValues, setPermValues] = useState({});

  const handleAddResource = async () => {
    if (!resTitle.trim() && !selectedFile) return;
    setUploadingRes(true);
    let uploadId = null;
    try {
      if (selectedFile) {
        const isImg = selectedFile.type.startsWith('image/');
        const fileToUpload = isImg ? await compressImage(selectedFile) : selectedFile;
        const res = await createUpload.mutateAsync({
          fileName: fileToUpload.name,
          fileSizeInBytes: fileToUpload.size,
          contentType: fileToUpload.type,
          programId,
          courseId,
        });
        await axios.put(res.uploadUrl, fileToUpload, { headers: { 'Content-Type': fileToUpload.type } });
        await confirmUpload.mutateAsync(res.uploadId);
        uploadId = res.uploadId;
      }
      await createResource.mutateAsync({
        programId,
        courseId,
        data: {
          title: resTitle.trim() || selectedFile?.name || 'Kaynak Belgesi',
          type: resType || (selectedFile ? 'DOCUMENT' : 'BOOK'),
          uploadId: uploadId || undefined,
        },
      });
      setResTitle('');
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err) {
      alert('Kaynak eklenemedi: ' + (err?.message || 'Hata'));
    } finally {
      setUploadingRes(false);
    }
  };

  const openPermissions = () => {
    if (course) {
      const vals = {};
      PERMS.forEach(([key]) => { vals[key] = !!course[key]; });
      setPermValues(vals);
      setTeacherId(course.teacherId || '');
    }
    setTab('permissions');
  };

  const togglePerm = (key) => setPermValues((p) => ({ ...p, [key]: !p[key] }));

  const savePermissions = async () => {
    await updateCourse.mutateAsync({ programId, courseId, data: permValues });
  };

  return (
    <div className={styles.container}>
      <div style={{ fontSize: '0.8rem', color: 'var(--text-color-muted)', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
        <span style={{ cursor: 'pointer', color: 'var(--color-primary)', fontWeight: 600 }} onClick={() => navigate('/coach/students')}>
          Öğrenciler & Programlar
        </span>
        <span>/</span>
        <span style={{ cursor: 'pointer', color: 'var(--color-primary)', fontWeight: 600 }} onClick={() => navigate('/coach/students?tab=COURSES')}>
          Dersler & Branşlar
        </span>
        <span>/</span>
        <span>{course?.name || 'Ders Detayı'}</span>
      </div>
      <div className={styles.header}>
        <Button size="sm" variant="outline" onClick={() => navigate('/coach/students?tab=COURSES')}>← Derslere Dön</Button>
        <h1 className={styles.title}>{course?.name || 'Ders'}</h1>
      </div>

      <div className={styles.tabs}>
        {['students', 'groups', 'resources', 'permissions'].map((t) => (
          <button key={t} className={tab === t ? `${styles.tab} ${styles.tabActive}` : styles.tab} onClick={() => (t === 'permissions' ? openPermissions() : setTab(t))}>
            {{ students: 'Öğrenciler', groups: 'Gruplar', resources: 'Kaynaklar', permissions: 'İzinler' }[t]}
          </button>
        ))}
      </div>

      {tab === 'students' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ margin: 0, fontSize: '1rem', color: 'var(--text-primary)' }}>
              Kayıtlı Öğrenciler ({students?.length || 0})
            </h3>
            <Button size="sm" variant="primary" onClick={() => setIsAddStudentModalOpen(true)}>
              + Arama ile Çoklu Öğrenci Ekle
            </Button>
          </div>

          {students?.map((s) => (
            <Card key={s.id} className={styles.item} padding="md" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <strong>{s.fullName}</strong>
                {s.email && <span className={styles.meta} style={{ display: 'block' }}>{s.email}</span>}
              </div>
              <Button size="sm" variant="outline" onClick={() => removeStudent.mutateAsync({ programId, courseId, studentId: s.id })}>Çıkar</Button>
            </Card>
          ))}
          {students?.length === 0 && <p className={styles.empty}>Henüz derse öğrenci eklenmedi.</p>}
        </div>
      )}

      {tab === 'groups' && (
        <div>
          <Card className={styles.card} padding="md">
            <div className={styles.formRow}>
              <select value={groupId} onChange={(e) => setGroupId(e.target.value)} className={styles.select}>
                <option value="">Grup seç</option>
                {allGroups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
              <Button size="sm" onClick={() => addGroup.mutateAsync({ programId, courseId, groupId })}>Ekle</Button>
            </div>
          </Card>
          {groups?.map((g) => (
            <Card key={g.id} className={styles.item} padding="md">
              <strong>{g.name}</strong>
              <Button size="sm" variant="outline" onClick={() => removeGroup.mutateAsync({ programId, courseId, groupId: g.id })}>Çıkar</Button>
            </Card>
          ))}
        </div>
      )}

      {tab === 'resources' && (
        <div>
          <Card className={styles.card} padding="md">
            <div className={styles.formRow} style={{ alignItems: 'flex-end', flexWrap: 'wrap', gap: '8px' }}>
              <Input label="Kaynak Başlığı" value={resTitle} onChange={(e) => setResTitle(e.target.value)} placeholder="Örn: Kitap Bölümü / Ders Notu" />
              <Input label="Tür" value={resType} onChange={(e) => setResType(e.target.value)} placeholder="BOOK / PDF" />
              <input
                ref={fileInputRef}
                type="file"
                accept=".png,.jpg,.jpeg,.webp,.pdf,.docx"
                hidden
                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
              />
              <Button
                size="sm"
                variant="outline"
                type="button"
                onClick={() => fileInputRef.current?.click()}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', height: '38px' }}
              >
                <Paperclip size={14} />
                <span>{selectedFile ? 'Dosya Seçildi' : 'Dosya Ekle'}</span>
              </Button>
              <Button size="sm" disabled={uploadingRes} onClick={handleAddResource} style={{ height: '38px' }}>
                {uploadingRes ? 'Yükleniyor…' : 'Ekle'}
              </Button>
            </div>
            {selectedFile && (
              <div style={{ marginTop: '8px', display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(59, 130, 246, 0.1)', padding: '4px 8px', borderRadius: '6px', fontSize: '0.8rem' }}>
                <FileText size={14} style={{ color: 'var(--color-primary)' }} />
                <span>{selectedFile.name}</span>
                <button type="button" onClick={() => { setSelectedFile(null); if (fileInputRef.current) fileInputRef.current.value = ''; }} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex' }}>
                  <X size={14} />
                </button>
              </div>
            )}
          </Card>
          {resources?.map((r) => (
            <Card key={r.id} className={styles.item} padding="md" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <strong>{r.title}</strong>
                <span className={styles.meta} style={{ marginLeft: '8px' }}>{r.type}</span>
              </div>
              {r.uploadId && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={async () => {
                    try {
                      const res = await download.mutateAsync(r.uploadId);
                      window.open(res.url, '_blank', 'noopener');
                    } catch {
                      alert('Dosya açılamadı.');
                    }
                  }}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                >
                  <FileText size={14} />
                  <span>Dosyayı İndir / Aç ↗</span>
                </Button>
              )}
            </Card>
          ))}
          {resources?.length === 0 && <p className={styles.empty}>Henüz ders kaynağı eklenmemiş.</p>}
        </div>
      )}

      {tab === 'permissions' && course && (
        <div>
          <Card className={styles.card} padding="md">
            <div className={styles.formRow}>
              <select value={teacherId} onChange={(e) => setTeacherId(e.target.value)} className={styles.select}>
                <option value="">Öğretmen seç (boş = değiştirme)</option>
                {allTeachers.map((t) => <option key={t.id} value={t.id}>{t.fullName}</option>)}
              </select>
              <Button size="sm" onClick={() => updateCourse.mutateAsync({ programId, courseId, data: teacherId ? { teacherId } : {} })}>Öğretmeni Değiştir</Button>
            </div>
          </Card>
          <Card className={styles.card} padding="md">
          {PERMS.map(([key, label]) => (
            <div key={key} className={styles.permRow} onClick={() => togglePerm(key)} style={{ cursor: 'pointer' }}>
              <span>{label}</span>
              <span className={permValues[key] ? styles.on : styles.off}>{permValues[key] ? 'Açık' : 'Kapalı'}</span>
            </div>
          ))}
          <Button size="sm" onClick={savePermissions} isLoading={updateCourse.isPending}>İzinleri Kaydet</Button>
        </Card>
        </div>
      )}

      <AddStudentsToCourseModal
        isOpen={isAddStudentModalOpen}
        onClose={() => setIsAddStudentModalOpen(false)}
        existingStudents={students || []}
        onAddStudents={async (ids) => {
          for (const sId of ids) {
            await addStudent.mutateAsync({ programId, courseId, studentId: sId });
          }
        }}
        title={`${course?.name || 'Derse'} Öğrenci Ekle`}
      />
    </div>
  );
};

export default CoachCourseDetailPage;
