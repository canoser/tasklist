import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useCourses, useCreateCourse, useTeachers } from '../coachSchoolApi';
import Button from '../../../components/common/Button/Button';
import Input from '../../../components/common/Input/Input';
import Card from '../../../components/common/Card/Card';
import styles from './CoachCoursesPage.module.css';

const COLOR_PALETTE = [
  '#3b82f6', // Mavi
  '#10b981', // Yeşil
  '#8b5cf6', // Mor
  '#f59e0b', // Amber
  '#ec4899', // Pembe
  '#ef4444', // Kırmızı
  '#14b8a6', // Teal
  '#6366f1', // Çivit
];

const DEFAULT_PERMISSIONS = {
  teacherCanViewProfile: true,
  teacherCanViewContact: false,
  teacherCanViewHomework: true,
  teacherCanManageHomework: true,
  teacherCanViewExams: true,
  teacherCanManageExams: false,
  teacherCanViewNotes: false,
  teacherCanAddNotes: true,
  teacherCanViewSchedule: true,
  teacherCanManageSchedule: false,
};

const PERMISSION_DEFINITIONS = [
  { key: 'teacherCanViewProfile', label: 'Öğrenci Profilini Görsün' },
  { key: 'teacherCanViewContact', label: 'İletişim Bilgilerini Görsün (Tel/E-posta)' },
  { key: 'teacherCanViewHomework', label: 'Ödevleri Görsün' },
  { key: 'teacherCanManageHomework', label: 'Ödev Atasın ve Yönetsin' },
  { key: 'teacherCanViewExams', label: 'Sınav Sonuçlarını Görsün' },
  { key: 'teacherCanManageExams', label: 'Sınav Oluştursun ve Yönetsin' },
  { key: 'teacherCanViewNotes', label: 'Diğer Ders Notlarını Görsün' },
  { key: 'teacherCanAddNotes', label: 'Ders Notu Ekleyebilsin' },
  { key: 'teacherCanViewSchedule', label: 'Haftalık Programı Görsün' },
  { key: 'teacherCanManageSchedule', label: 'Programı Değiştirebilsin' },
];

const CoachCoursesPage = () => {
  const { programId } = useParams();
  const navigate = useNavigate();
  const { data: courses, isLoading } = useCourses(programId);
  const createCourse = useCreateCourse();
  const { data: teachers = [] } = useTeachers(programId);

  const [name, setName] = useState('');
  const [type, setType] = useState('DERS');
  const [teacherId, setTeacherId] = useState('');
  const [selectedColor, setSelectedColor] = useState(COLOR_PALETTE[0]);
  const [showPermissions, setShowPermissions] = useState(false);
  const [permissions, setPermissions] = useState(DEFAULT_PERMISSIONS);

  const handleTogglePermission = (key) => {
    setPermissions(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    await createCourse.mutateAsync({
      programId,
      data: {
        name: name.trim(),
        type,
        color: selectedColor,
        ...(teacherId ? { teacherId } : {}),
        ...permissions
      }
    });

    setName('');
    setTeacherId('');
    setSelectedColor(COLOR_PALETTE[0]);
    setPermissions(DEFAULT_PERMISSIONS);
    setShowPermissions(false);
  };

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Dersler</h1>

      <Card className={styles.card} padding="md">
        <form onSubmit={handleCreate} className={styles.form}>
          <Input label="Ders Adı" value={name} onChange={(e) => setName(e.target.value)} placeholder="Örn: Matematik" />
          <Input label="Tür" value={type} onChange={(e) => setType(e.target.value)} placeholder="DERS" />
          
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>Ders Rengi</label>
            <div className={styles.colorPicker}>
              {COLOR_PALETTE.map((c) => (
                <button
                  key={c}
                  type="button"
                  aria-label={`Renk seç: ${c}`}
                  className={`${styles.colorSwatch} ${selectedColor === c ? styles.colorSwatchSelected : ''}`}
                  style={{ backgroundColor: c }}
                  onClick={() => setSelectedColor(c)}
                />
              ))}
            </div>
          </div>

          <select value={teacherId} onChange={(e) => setTeacherId(e.target.value)} className={styles.select}>
            <option value="">Öğretmen (opsiyonel)</option>
            {teachers.map((t) => <option key={t.id} value={t.id}>{t.fullName}</option>)}
          </select>

          {/* Gelişmiş İzinler Akordeonu */}
          <div>
            <button
              type="button"
              className={styles.accordionButton}
              onClick={() => setShowPermissions(prev => !prev)}
            >
              <span>⚙️ Gelişmiş Öğretmen İzinleri</span>
              <span>{showPermissions ? '▲ Kapat' : '▼ Yapılandır'}</span>
            </button>

            {showPermissions && (
              <div className={styles.permissionsPanel}>
                {PERMISSION_DEFINITIONS.map(p => (
                  <div key={p.key} className={styles.permissionRow}>
                    <span className={styles.permissionTitle}>{p.label}</span>
                    <label className={styles.switch}>
                      <input
                        type="checkbox"
                        checked={permissions[p.key]}
                        onChange={() => handleTogglePermission(p.key)}
                      />
                      <span className={styles.slider} />
                    </label>
                  </div>
                ))}
              </div>
            )}
          </div>

          <Button type="submit" isLoading={createCourse.isPending}>Ders Oluştur</Button>
        </form>
        <p className={styles.note}>Ders oluşturulduktan sonra da ders detayındaki "İzinler" sekmesinden yetkileri güncelleyebilirsiniz.</p>
      </Card>

      <div className={styles.list}>
        {isLoading && <p>Yükleniyor...</p>}
        {courses?.map((c) => (
          <Card key={c.id} className={styles.item} padding="md" style={{ borderLeft: `5px solid ${c.color || 'var(--color-primary)'}` }}>
            <div className={styles.itemHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: c.color || 'var(--color-primary)', display: 'inline-block' }} />
                <strong>{c.name}</strong>
              </div>
              <span className={styles.type}>{c.type}</span>
            </div>
            <div className={styles.meta}>Öğrenci: {c.studentCount}</div>
            <Button size="sm" variant="outline" onClick={() => navigate(`/coach/programs/${programId}/courses/${c.id}`)}>Detay</Button>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default CoachCoursesPage;

