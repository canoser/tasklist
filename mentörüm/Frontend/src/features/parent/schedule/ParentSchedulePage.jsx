import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../../api/apiClient';
import { useParentChildren } from '../parentApi';
import ChildSelector from '../../../components/common/ChildSelector/ChildSelector';
import Card from '../../../components/common/Card/Card';
import { WEEKDAYS_ONE_INDEXED } from '../../../constants/domainConstants';
import styles from './ParentSchedulePage.module.css';

const fmt = (t) => (t ? t.slice(0, 5) : '');

const ParentSchedulePage = ({ studentId: propStudentId, embedded = false }) => {
  const { data: children = [] } = useParentChildren();
  const [selectedChildId, setSelectedChildId] = useState(null);
  const student = children.find((c) => c.studentId === (propStudentId || selectedChildId)) || children[0];

  const { data: slots, isLoading } = useQuery({
    queryKey: ['parent', 'schedule', student?.studentId],
    queryFn: async () => (await apiClient.get(`/parent/children/${student.studentId}/schedule`)) || [],
    enabled: !!student?.studentId,
  });

  const grouped = {};
  slots?.forEach((s) => {
    if (!grouped[s.dayOfWeek]) grouped[s.dayOfWeek] = [];
    grouped[s.dayOfWeek].push(s);
  });

  const hasAnySlots = slots && slots.length > 0;

  return (
    <div className={styles.container} style={embedded ? { padding: 0, maxWidth: '100%' } : undefined}>
      {!embedded && (
        <>
          <h1 className={styles.title}>Çocuğumun Programı</h1>
          <ChildSelector children={children} selectedId={student?.studentId} onSelect={setSelectedChildId} />
        </>
      )}
      {isLoading && <p>Yükleniyor...</p>}
      {!isLoading && !hasAnySlots ? (
        <Card className={styles.card} padding="lg" style={{ textAlign: 'center', color: 'var(--text-color-muted)' }}>
          <div style={{ fontSize: '2rem', marginBottom: 8 }}>📅</div>
          <strong style={{ display: 'block', color: 'var(--text-color-main)', marginBottom: 4 }}>
            Henüz Haftalık Ders Programı Tanımlanmamış
          </strong>
          <p style={{ margin: 0, fontSize: '0.85rem' }}>
            Koç tarafından çocuğunuzun sınıfı veya dersleri için haftalık program eklendiğinde burada gün gün listelenecektir.
          </p>
        </Card>
      ) : (
        <div className={styles.list}>
          {WEEKDAYS_ONE_INDEXED.map((d, i) => {
            if (i === 0) return null;
            const daySlots = (grouped[i] || []).sort((a, b) => a.startTime.localeCompare(b.startTime));
            if (daySlots.length === 0) return null;
            return (
              <Card key={i} className={styles.card} padding="md">
                <div className={styles.dayHeader}>{d}</div>
                {daySlots.map((s) => (
                  <div key={s.id} className={styles.slot}>
                    <span className={styles.time}>{fmt(s.startTime)}-{fmt(s.endTime)}</span>
                    <span className={styles.slotTitle}>{s.title}</span>
                  </div>
                ))}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ParentSchedulePage;
