import React from 'react';
import Card from '../../../../components/common/Card/Card';
import ParetoFocusBanner from './ParetoFocusBanner';
import { PriorityBadge, AssignedViaBadge, HomeworkStatusBadge } from '../../../../components/common/HomeworkStatusBadges';
import HomeworkAttachmentList from '../../../../components/common/HomeworkAttachmentList';
import { useUpdateStudentPermissions } from '../../coachApi';
import styles from '../CoachStudentDetail.module.css';

export default function HomeworkTab({ studentId, student, exams = [], studentHomeworks = [], onAssignFocusHomework }) {
  const updatePermsMutation = useUpdateStudentPermissions(studentId);
  const perms = student?.permissions || {
    canCompleteTopics: true,
    canCompleteHomework: true,
    canEditGoals: true,
    canAddExamResults: false,
    canManageResources: false,
    canSelfAssignWork: false,
  };

  const handleTogglePerm = (key) => {
    if (!student) return;
    updatePermsMutation.mutate({
      canCompleteTopics: Boolean(perms.canCompleteTopics),
      canEditGoals: Boolean(perms.canEditGoals),
      canCompleteHomework: key === 'canCompleteHomework' ? !perms.canCompleteHomework : Boolean(perms.canCompleteHomework),
      canAddExamResults: Boolean(perms.canAddExamResults),
      canManageResources: Boolean(perms.canManageResources),
      canSelfAssignWork: key === 'canSelfAssignWork' ? !perms.canSelfAssignWork : Boolean(perms.canSelfAssignWork),
    });
  };

  return (
    <Card title="Ödev Geçmişi" className={styles.notesCard}>
      {student && (
        <div
          style={{
            display: 'flex',
            gap: 16,
            flexWrap: 'wrap',
            padding: '10px 12px',
            marginBottom: 14,
            borderRadius: 8,
            background: 'var(--bg-app)',
            border: '1px solid var(--border-color)',
            alignItems: 'center',
          }}
        >
          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-primary)' }}>🛡️ Hızlı Yetki:</span>
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.82rem', cursor: 'pointer' }}>
            <input
              type="checkbox"
              data-testid="quick-perm-canCompleteHomework"
              checked={Boolean(perms.canCompleteHomework)}
              disabled={updatePermsMutation.isPending}
              onChange={() => handleTogglePerm('canCompleteHomework')}
            />
            <span>Öğrenci ödevleri doğrudan tamamlayabilsin (Kapalıysa Onaya Düşer)</span>
          </label>
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.82rem', cursor: 'pointer' }}>
            <input
              type="checkbox"
              data-testid="quick-perm-canSelfAssignWork"
              checked={Boolean(perms.canSelfAssignWork)}
              disabled={updatePermsMutation.isPending}
              onChange={() => handleTogglePerm('canSelfAssignWork')}
            />
            <span>Öğrenci kendine çalışma / ödev ekleyebilsin</span>
          </label>
        </div>
      )}

      <ParetoFocusBanner exams={exams} onAssignFocusHomework={onAssignFocusHomework} />

      {studentHomeworks && studentHomeworks.length > 0 ? (
        studentHomeworks.map((hw) => (
          <div
            key={hw.id}
            style={{
              padding: '10px 0',
              borderBottom: '1px solid var(--border-color)',
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 10,
                flexWrap: 'wrap',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <strong style={{ fontSize: '0.9rem' }}>{hw.snapshotTitle}</strong>
                {hw.courseName && <span style={{ fontSize: '0.8rem', color: 'var(--text-color-muted)' }}>({hw.courseName})</span>}
                {hw.subjectName && !hw.courseName && (
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-color-muted)' }}>({hw.subjectName})</span>
                )}
                <PriorityBadge priority={hw.priority} />
                <AssignedViaBadge assignedVia={hw.assignedVia} />
                {hw.createdByStudent && (
                  <span
                    style={{
                      fontSize: '0.7rem',
                      padding: '2px 7px',
                      borderRadius: 999,
                      background: 'rgba(59,130,246,0.12)',
                      color: '#2563eb',
                      fontWeight: 600,
                    }}
                  >
                    👤 Öğrenci Ekledi
                  </span>
                )}
                {hw.pendingApproval && (
                  <span
                    style={{
                      fontSize: '0.7rem',
                      padding: '2px 7px',
                      borderRadius: 999,
                      background: 'rgba(245,158,11,0.14)',
                      color: '#d97706',
                      fontWeight: 600,
                    }}
                  >
                    ⏳ Tamamlama Onayı Bekliyor
                  </span>
                )}
              </div>
              <div style={{ textAlign: 'right', display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-color-muted)' }}>
                  {hw.dueDate ? new Date(hw.dueDate).toLocaleDateString('tr-TR') : '-'}
                </div>
                <HomeworkStatusBadge status={hw.status} completionPercentage={hw.completionPercentage} />
              </div>
            </div>

            {hw.studentNote && (
              <div style={{ fontSize: '0.8rem', color: 'var(--text-color-main)', background: 'var(--bg-app)', padding: '6px 10px', borderRadius: 6, borderLeft: '3px solid var(--color-primary)' }}>
                <strong>Öğrenci Notu:</strong> {hw.studentNote}
              </div>
            )}

            {hw.feedback && (
              <div style={{ fontSize: '0.8rem', color: 'var(--text-color-main)', background: 'rgba(245, 158, 11, 0.08)', padding: '6px 10px', borderRadius: 6, borderLeft: '3px solid #f59e0b' }}>
                <strong>Öğretmen Değerlendirmesi:</strong> {hw.feedback}
              </div>
            )}

            {hw.attachments && hw.attachments.length > 0 && (
              <HomeworkAttachmentList attachments={hw.attachments} />
            )}
          </div>
        ))
      ) : (
        <p>Henüz ödev atanmamış.</p>
      )}
    </Card>
  );
}

