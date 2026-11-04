import React, { useState } from 'react';
import Card from '../../../../components/common/Card/Card';
import Button from '../../../../components/common/Button/Button';
import Input, { Select } from '../../../../components/common/Input/Input';
import Modal from '../../../../components/common/Modal/Modal';
import StatusBadge from '../../../../components/common/StatusBadge/StatusBadge';
import {
  useGroups,
  useCourses,
  useTeachers,
  useCreateCourse,
  useAddCourseStudent,
  useRemoveCourseStudent,
} from '../../coachSchoolApi';
import {
  useMoveToGroup,
  useMoveToIndividual,
  useCoachStudentCourses,
  useUpdateStudentPermissions,
  useUnlinkStudent,
} from '../../coachApi';
import { useAuthStore } from '../../../auth/authStore';
import OkrGoalTreeCard from './OkrGoalTreeCard';
import HabitTrackerCard from './HabitTrackerCard';
import EisenhowerMatrixCard from './EisenhowerMatrixCard';
import styles from '../CoachStudentDetail.module.css';

export default function InfoTab({
  studentId,
  student,
  parsedHabits,
  studentHomeworks,
  questions,
  onUpdateGoal,
  onSaveHabits,
  onOpenCourseNote,
}) {
  const { user } = useAuthStore();
  const programId = student?.programId;

  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [isNewCourseModalOpen, setIsNewCourseModalOpen] = useState(false);
  const [newCourseName, setNewCourseName] = useState('');
  const [newCourseType, setNewCourseType] = useState('OZEL_DERS');
  const [newCourseTeacherId, setNewCourseTeacherId] = useState(user?.id || '');

  const { data: groups = [] } = useGroups(programId);
  const { data: allCourses = [] } = useCourses(programId);
  const { data: teachers = [] } = useTeachers(programId);
  const { data: studentCourses = [] } = useCoachStudentCourses(studentId);

  const moveToGroup = useMoveToGroup(programId);
  const moveToIndividual = useMoveToIndividual(programId);
  const createCourse = useCreateCourse();
  const addCourseStudent = useAddCourseStudent();
  const removeCourseStudent = useRemoveCourseStudent();
  const updatePerms = useUpdateStudentPermissions(studentId);
  const unlinkStudent = useUnlinkStudent();

  const perms = student?.permissions || {
    canCompleteTopics: true,
    canCompleteHomework: true,
    canEditGoals: true,
    canAddExamResults: false,
    canManageResources: false,
    canSelfAssignWork: false,
  };

  const handleTogglePerm = (key) => {
    const next = {
      canCompleteTopics: Boolean(perms.canCompleteTopics),
      canCompleteHomework: Boolean(perms.canCompleteHomework),
      canEditGoals: Boolean(perms.canEditGoals),
      canAddExamResults: Boolean(perms.canAddExamResults),
      canManageResources: Boolean(perms.canManageResources),
      canSelfAssignWork: Boolean(perms.canSelfAssignWork),
      [key]: !perms[key],
    };
    updatePerms.mutate(next);
  };

  const enrolledCourseIds = new Set(studentCourses.map((c) => c.id));
  const isOtherStudentAutoCourse = (c) =>
    c.type === 'OZEL_DERS' &&
    !c.teacherId &&
    (c.name === 'Bireysel Koçluk' || c.name?.endsWith('— Bireysel Koçluk'));
  const availableCourses = allCourses.filter(
    (c) => !enrolledCourseIds.has(c.id) && !isOtherStudentAutoCourse(c)
  );

  const createAndEnrollCourse = async ({ name, type, teacherId }) => {
    const created = await createCourse.mutateAsync({
      programId,
      data: {
        name,
        type,
        ...(teacherId ? { teacherId } : {}),
        teacherCanViewProfile: true,
        teacherCanViewHomework: true,
        teacherCanManageHomework: true,
        teacherCanProcessHomework: true,
        teacherCanViewExams: true,
        teacherCanManageExams: true,
        teacherCanAddNotes: true,
        teacherCanViewSchedule: true,
      },
    });

    if (created?.id) {
      await addCourseStudent.mutateAsync({
        programId,
        courseId: created.id,
        studentId,
      });
    }
  };

  const handleEnrollExistingCourse = async () => {
    if (!selectedCourseId || !programId) return;

    if (selectedCourseId.startsWith('teacher:')) {
      const teacherId = selectedCourseId.slice('teacher:'.length);
      const teacher = teachers.find((t) => String(t.id) === teacherId);
      const courseName = teacher?.branch
        ? `${teacher.branch} Özel Ders (${student.fullName})`
        : `${teacher?.fullName || 'Öğretmen'} — Özel Ders (${student.fullName})`;

      await createAndEnrollCourse({
        name: courseName,
        type: 'OZEL_DERS',
        teacherId,
      });
    } else {
      const courseId = selectedCourseId.startsWith('course:')
        ? selectedCourseId.slice('course:'.length)
        : selectedCourseId;
      await addCourseStudent.mutateAsync({
        programId,
        courseId,
        studentId,
      });
    }

    setSelectedCourseId('');
  };

  const handleCreateAndEnrollCourse = async (e) => {
    e.preventDefault();
    if (!newCourseName.trim() || !programId) return;

    await createAndEnrollCourse({
      name: newCourseName.trim(),
      type: newCourseType,
      teacherId: newCourseTeacherId,
    });

    setNewCourseName('');
    setNewCourseType('OZEL_DERS');
    setNewCourseTeacherId(user?.id || '');
    setIsNewCourseModalOpen(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div className={styles.grid}>
        <Card title="Temel Bilgiler" className={styles.infoCard}>
          <div className={styles.infoRow}>
            <span className={styles.infoLabel}>Ad Soyad:</span>
            <span className={styles.infoValue}>{student.fullName}</span>
          </div>
          <div className={styles.infoRow}>
            <span className={styles.infoLabel}>Sınıf / Seviye:</span>
            <span className={styles.infoValue}>{student.grade === 13 ? 'Mezun' : student.grade ? `${student.grade}. Sınıf` : '-'}</span>
          </div>
          <div className={styles.infoRow}>
            <span className={styles.infoLabel}>Hedef / Alan:</span>
            <span className={styles.infoValue}>{student.track || student.area || '-'}</span>
          </div>
          <div className={styles.infoRow}>
            <span className={styles.infoLabel}>Telefon:</span>
            <span className={styles.infoValue}>{student.phone || '-'}</span>
          </div>
          {student.targetUniversity && (
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>Hedef Üniversite:</span>
              <span className={styles.infoValue}>{student.targetUniversity}</span>
            </div>
          )}
          {(student.targetDepartment || student.targetMajor) && (
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>Hedef Bölüm:</span>
              <span className={styles.infoValue}>{student.targetDepartment || student.targetMajor}</span>
            </div>
          )}
          {student.targetScore != null && (
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>Hedef Net:</span>
              <span className={styles.infoValue}>{student.targetScore}</span>
            </div>
          )}
        </Card>

        <Card title="Grup ve Koçluk Yönetimi" className={styles.infoCard}>
          <div className={styles.infoRow}>
            <span className={styles.infoLabel}>Mevcut Durum:</span>
            <span className={styles.infoValue}>
              {student.groupName || student.groupId ? (
                <span style={{ color: 'var(--color-primary)', fontWeight: 600 }}>
                  Grup Öğrencisi ({student.groupName || 'Grup'})
                </span>
              ) : (
                <span style={{ color: '#16a34a', fontWeight: 600 }}>Bireysel Öğrenci</span>
              )}
            </span>
          </div>

          <div style={{ marginTop: 16, borderTop: '1px solid var(--border-color)', paddingTop: 16 }}>
            <h4 style={{ margin: '0 0 10px', fontSize: '0.9rem' }}>Öğrenci Tipi / Grup Değiştir</h4>
            {student.groupName || student.groupId ? (
              <div>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-color-muted)', marginBottom: 12 }}>
                  Bu öğrenciyi bireysel koçluk modeline taşımak istiyor musunuz?
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  isLoading={moveToIndividual.isPending}
                  onClick={() => moveToIndividual.mutate(studentId)}
                >
                  Bireysele Çek
                </Button>
              </div>
            ) : (
              <div>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-color-muted)', marginBottom: 8 }}>
                  Bir gruba dahil etmek için grup seçin:
                </p>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <Select
                    value={selectedGroupId}
                    onChange={(e) => setSelectedGroupId(e.target.value)}
                  >
                    <option value="">Grup Seçin...</option>
                    {groups.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name}
                      </option>
                    ))}
                  </Select>
                  <Button
                    variant="primary"
                    size="sm"
                    disabled={!selectedGroupId || moveToGroup.isPending}
                    isLoading={moveToGroup.isPending}
                    onClick={() => {
                      moveToGroup.mutate(
                        { studentId, groupId: selectedGroupId },
                        {
                          onSuccess: () => setSelectedGroupId(''),
                        }
                      );
                    }}
                  >
                    Gruba Ekle
                  </Button>
                </div>
              </div>
            )}
          </div>

          <div className={styles.groupStatsNote} style={{ marginTop: 14 }}>
            Güncel Bireysel Ödevler: {student.individualHomeworkCount ?? 0} • Geçmiş Grup Ödevleri: {student.groupHomeworkCount ?? 0}
          </div>

          <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border-color)' }}>
            <Button
              variant="outline"
              size="xs"
              data-testid="unlink-student-btn"
              isLoading={unlinkStudent.isPending}
              onClick={async () => {
                if (!window.confirm(`${student.fullName} adlı öğrenciyi koçluk programınızdan ayırıp bağımsız öğrenci moduna geçirmek istediğinize emin misiniz? Öğrencinin hesabı ve geçmiş verileri silinmez.`)) return;
                await unlinkStudent.mutateAsync({ studentId });
                window.location.href = '/coach/students';
              }}
            >
              🌱 Koçluktan Ayır (Bağımsız Moda Geçir)
            </Button>
          </div>
        </Card>
      </div>

      {/* V20: 6'lı Öğrenci Yetkileri (Özerklik Ayarları) Kartı */}
      <Card title="🛡️ Öğrenci Yetkileri (Özerklik Ayarları)">
        <p style={{ margin: '0 0 12px', fontSize: '0.84rem', color: 'var(--text-color-secondary)' }}>
          Öğrencinin kendi hesabından hangi işlemleri doğrudan yapabileceğini buradan yönetebilirsiniz. Öğrenci hangi girişi yaparsa yapsın tüm kayıtları siz görebilir ve değiştirebilirsiniz.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 10 }}>
          {[
            { key: 'canCompleteTopics', label: 'Konu Tamamlama İşaretleme', desc: 'Müfredat konularını bitti olarak işaretleyebilir' },
            { key: 'canCompleteHomework', label: 'Ödev Tamamlama (Doğrudan)', desc: 'Kapalıysa tamamlama bildirimi onayınıza düşer' },
            { key: 'canEditGoals', label: 'Hedef Belirleme & Güncelleme', desc: 'Üniversite, bölüm ve net hedefini güncelleyebilir' },
            { key: 'canAddExamResults', label: 'Kendi Netlerini / Denemelerini Girme', desc: 'Deneme ve sınav sonuçlarını kendisi ekleyebilir' },
            { key: 'canManageResources', label: 'Kaynak & Video Ders Ekleme', desc: 'Kendi soru bankası ve video derslerini ekleyebilir' },
            { key: 'canSelfAssignWork', label: 'Kendine Çalışma / Ödev Ekleme', desc: 'Kendi çalışma planına bireysel görev ekleyebilir' },
          ].map((item) => (
            <label
              key={item.key}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 10,
                padding: '10px 12px',
                borderRadius: 10,
                border: '1px solid var(--border-color)',
                background: perms[item.key] ? 'var(--color-primary-light)' : 'var(--bg-color-surface)',
                cursor: 'pointer',
              }}
            >
              <input
                type="checkbox"
                data-testid={`perm-toggle-${item.key}`}
                checked={Boolean(perms[item.key])}
                disabled={updatePerms.isPending}
                onChange={() => handleTogglePerm(item.key)}
                style={{ marginTop: 3 }}
              />
              <div>
                <div style={{ fontSize: '0.86rem', fontWeight: 700, color: 'var(--text-color-primary)' }}>
                  {item.label}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-color-secondary)', marginTop: 2 }}>
                  {item.desc}
                </div>
              </div>
            </label>
          ))}
        </div>
      </Card>

      {/* U18: Öğrencinin Aldığı Dersler & Öğretmenler Kartı */}
      <Card
        title="Aldığı Dersler & Öğretmenler"
        action={
          <Button
            size="sm"
            variant="primary"
            onClick={() => {
              setNewCourseTeacherId(user?.id || '');
              setIsNewCourseModalOpen(true);
            }}
          >
            + Yeni Ders / Özel Ders Aç
          </Button>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {studentCourses.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {studentCourses.map((c) => (
                <div
                  key={c.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '10px',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color)',
                    backgroundColor: 'var(--bg-color-surface)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                    <strong style={{ fontSize: '0.92rem', color: 'var(--text-color-main)' }}>{c.name}</strong>
                    <StatusBadge
                      status={c.type === 'OZEL_DERS' ? 'APPROVED' : 'PENDING'}
                      label={c.type === 'OZEL_DERS' ? 'Özel Ders / Koçluk' : 'Akademik Ders'}
                    />
                    <span style={{ fontSize: '0.84rem', color: 'var(--text-color-muted)' }}>
                      👨‍🏫 Eğitmen: <strong style={{ color: 'var(--text-color-main)' }}>{c.teacherName || user?.fullName || 'Koç'}</strong>
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {onOpenCourseNote && (
                      <Button size="xs" variant="outline" onClick={() => onOpenCourseNote(c.id)}>
                        ✓ Ders Notu / Özeti Yaz
                      </Button>
                    )}
                    {programId && (
                      <Button
                        size="xs"
                        variant="ghost"
                        onClick={() => removeCourseStudent.mutate({ programId, courseId: c.id, studentId })}
                        isLoading={removeCourseStudent.isPending}
                      >
                        Çıkar
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-color-muted)' }}>
              Öğrenciye henüz bir ders veya branş öğretmeni atanmamış. Aşağıdan mevcut bir derse ekleyebilir veya yeni ders açabilirsiniz.
            </p>
          )}

          {(availableCourses.length > 0 || teachers.length > 0) && (
            <div
              style={{
                display: 'flex',
                gap: '8px',
                alignItems: 'flex-end',
                paddingTop: '10px',
                borderTop: '1px solid var(--border-color)',
              }}
            >
              <Select
                label="Mevcut Bir Derse / Öğretmene Bağla"
                value={selectedCourseId}
                onChange={(e) => setSelectedCourseId(e.target.value)}
              >
                <option value="">Ders veya Öğretmen Seçin...</option>
                {availableCourses.length > 0 && (
                  <optgroup label="Mevcut Dersler">
                    {availableCourses.map((c) => (
                      <option key={c.id} value={`course:${c.id}`}>
                        {c.name} ({c.teacherName ? `Eğitmen: ${c.teacherName}` : 'Koç Dersi'})
                      </option>
                    ))}
                  </optgroup>
                )}
                {teachers.length > 0 && (
                  <optgroup label="Öğretmenler (Özel Ders Bağla)">
                    {teachers.map((t) => (
                      <option key={t.id} value={`teacher:${t.id}`}>
                        {t.fullName}
                        {t.branch ? ` (${t.branch})` : ''} — Özel Ders Bağla
                      </option>
                    ))}
                  </optgroup>
                )}
              </Select>
              <Button
                variant="secondary"
                size="md"
                disabled={!selectedCourseId || addCourseStudent.isPending || createCourse.isPending}
                isLoading={addCourseStudent.isPending || createCourse.isPending}
                onClick={handleEnrollExistingCourse}
              >
                Derse Ekle
              </Button>
            </div>
          )}
        </div>
      </Card>

      <OkrGoalTreeCard student={student} onUpdateGoal={onUpdateGoal} />
      <HabitTrackerCard habits={parsedHabits} onSaveHabits={onSaveHabits} isCoach={true} />
      <EisenhowerMatrixCard homework={studentHomeworks || []} questions={questions || []} />

      {/* Hızlı Yeni Ders / Özel Ders Açma Modalı */}
      <Modal
        isOpen={isNewCourseModalOpen}
        onClose={() => setIsNewCourseModalOpen(false)}
        title={`${student.fullName} İçin Ders / Özel Ders Aç`}
        maxWidth="460px"
      >
        <form onSubmit={handleCreateAndEnrollCourse} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <Input
            label="Ders / Branş Adı *"
            placeholder="Örn: AYT Matematik Özel Ders"
            value={newCourseName}
            onChange={(e) => setNewCourseName(e.target.value)}
            required
          />

          <Select
            label="Ders Türü"
            value={newCourseType}
            onChange={(e) => setNewCourseType(e.target.value)}
          >
            <option value="OZEL_DERS">Bireysel Özel Ders / Koçluk</option>
            <option value="DERS">Akademik Ders (Grup / Sınıf)</option>
          </Select>

          <Select
            label="Sorumlu Öğretmen / Eğitmen"
            value={newCourseTeacherId}
            onChange={(e) => setNewCourseTeacherId(e.target.value)}
          >
            {user?.id && (
              <option value={user.id}>📌 Kendim ({user.fullName || 'Koç'} — Dersi Ben Veriyorum)</option>
            )}
            {teachers.map((t) => (
              <option key={t.id} value={t.id}>
                {t.fullName} {t.branch ? `(${t.branch})` : ''}
              </option>
            ))}
          </Select>

          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '8px',
              paddingTop: '10px',
              borderTop: '1px solid var(--border-color)',
            }}
          >
            <Button type="button" variant="ghost" onClick={() => setIsNewCourseModalOpen(false)}>
              İptal
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={createCourse.isPending || addCourseStudent.isPending}
              disabled={!newCourseName.trim()}
            >
              Oluştur ve Öğrenciye Bağla
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
