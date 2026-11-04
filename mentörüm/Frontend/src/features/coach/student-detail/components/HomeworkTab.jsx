import React from 'react';
import Card from '../../../../components/common/Card/Card';
import ParetoFocusBanner from './ParetoFocusBanner';
import { PriorityBadge, AssignedViaBadge, HomeworkStatusBadge } from '../../../../components/common/HomeworkStatusBadges';
import HomeworkAttachmentList from '../../../../components/common/HomeworkAttachmentList';
import styles from '../CoachStudentDetail.module.css';

export default function HomeworkTab({ exams = [], studentHomeworks = [], onAssignFocusHomework }) {
  return (
    <Card title="Ödev Geçmişi" className={styles.notesCard}>
      <ParetoFocusBanner exams={exams} onAssignFocusHomework={onAssignFocusHomework} />

      {studentHomeworks && studentHomeworks.length > 0 ? (
        studentHomeworks.map((hw) => (
          <div
            key={hw.id}
            style={{
              padding: '10px 0',
              borderBottom: '1px solid #f1f5f9',
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

