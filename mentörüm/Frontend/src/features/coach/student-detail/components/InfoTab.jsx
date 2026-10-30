import React, { useState } from 'react';
import Card from '../../../../components/common/Card/Card';
import Button from '../../../../components/common/Button/Button';
import { useGroups } from '../../coachSchoolApi';
import { useMoveToGroup, useMoveToIndividual } from '../../coachApi';
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
}) {
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const { data: groups = [] } = useGroups(student?.programId);
  const moveToGroup = useMoveToGroup(student?.programId);
  const moveToIndividual = useMoveToIndividual(student?.programId);

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
            <span className={styles.infoValue}>{student.grade ? `${student.grade}. Sınıf` : '-'}</span>
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
          {student.targetMajor && (
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>Hedef Bölüm:</span>
              <span className={styles.infoValue}>{student.targetMajor}</span>
            </div>
          )}
        </Card>

        <Card title="Grup ve Koçluk Yönetimi" className={styles.infoCard}>
          <div className={styles.infoRow}>
            <span className={styles.infoLabel}>Mevcut Durum:</span>
            <span className={styles.infoValue}>
              {student.groupName || student.groupId ? (
                <span style={{ color: 'var(--color-primary)', fontWeight: 600 }}>Grup Öğrencisi ({student.groupName || 'Grup'})</span>
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
                <div style={{ display: 'flex', gap: 8 }}>
                  <select
                    value={selectedGroupId}
                    onChange={(e) => setSelectedGroupId(e.target.value)}
                    style={{
                      padding: '6px 10px',
                      borderRadius: 6,
                      border: '1px solid var(--border-color)',
                      flex: 1,
                      backgroundColor: 'var(--bg-color-main)',
                      color: 'var(--text-color-main)',
                    }}
                  >
                    <option value="">Grup Seçin...</option>
                    {groups.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name}
                      </option>
                    ))}
                  </select>
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
        </Card>
      </div>

      <OkrGoalTreeCard student={student} onUpdateGoal={onUpdateGoal} />
      <HabitTrackerCard habits={parsedHabits} onSaveHabits={onSaveHabits} isCoach={true} />
      <EisenhowerMatrixCard homework={studentHomeworks || []} questions={questions || []} />
    </div>
  );
}

