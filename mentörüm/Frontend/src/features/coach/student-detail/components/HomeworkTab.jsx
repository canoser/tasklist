import React from 'react';
import Card from '../../../../components/common/Card/Card';
import ParetoFocusBanner from './ParetoFocusBanner';
import { PriorityBadge, AssignedViaBadge, HomeworkStatusBadge } from '../../../../components/common/HomeworkStatusBadges';
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
        ))
      ) : (
        <p>Henüz ödev atanmamış.</p>
      )}
    </Card>
  );
}

