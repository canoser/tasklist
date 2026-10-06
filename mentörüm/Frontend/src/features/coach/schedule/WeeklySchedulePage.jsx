import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { DndContext, PointerSensor, TouchSensor, KeyboardSensor, useSensor, useSensors, useDraggable, useDroppable } from '@dnd-kit/core';
import { useSchedule, useCourses, useGroups, useCreateScheduleSlot, useDeleteScheduleSlot } from '../coachSchoolApi';
import Card from '../../../components/common/Card/Card';
import styles from './WeeklySchedulePage.module.css';

const DAYS = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'];
const HOURS = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];

const DraggableCard = ({ id, label }) => {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id });
  return (
    <div ref={setNodeRef} {...listeners} {...attributes} className={styles.dragCard} style={{ opacity: isDragging ? 0.5 : 1 }}>
      {label}
    </div>
  );
};

const DroppableCell = ({ id, children }) => {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div ref={setNodeRef} className={isOver ? `${styles.cell} ${styles.cellOver}` : styles.cell}>
      {children}
    </div>
  );
};


const WeeklySchedulePage = () => {
  const { programId } = useParams();
  const { data: slots } = useSchedule(programId);
  const { data: courses } = useCourses(programId);
  const { data: groups } = useGroups(programId);
  const createSlot = useCreateScheduleSlot();
  const deleteSlot = useDeleteScheduleSlot();

  const [formDay, setFormDay] = useState(null);
  const [formHour, setFormHour] = useState(null);
  const [title, setTitle] = useState('');
  const [conflict, setConflict] = useState('');

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
    useSensor(KeyboardSensor)
  );

  const slotAt = (day, hour) => (slots || []).filter((s) => s.dayOfWeek === day && parseInt(s.startTime?.slice(0, 2), 10) === hour);

  const handleCreate = (day, hour, targetType, targetId, slotTitle) => {
    const startTime = `${String(hour).padStart(2, '0')}:00:00`;
    const endTime = `${String(hour + 1).padStart(2, '0')}:00:00`;
    const existing = (slots || []).some((s) => s.dayOfWeek === day && parseInt(s.startTime?.slice(0, 2), 10) === hour);
    if (existing) { setConflict('Bu saatte zaten bir slot var (çakışma).'); return; }
    const data = { dayOfWeek: day, startTime, endTime, title: slotTitle || title || 'Yeni Slot' };
    if (targetType === 'course') data.courseId = targetId;
    else if (targetType === 'group') data.groupId = targetId;
    createSlot.mutateAsync({ programId, data });
    setFormDay(null); setFormHour(null); setTitle(''); setConflict('');
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (!over) return;
    const day = Number(over.id.split('-')[1]);
    const hour = Number(over.id.split('-')[2]);
    const type = active.id.split('-')[0];
    const id = active.id.split('-').slice(1).join('-');
    let name = 'Yeni Slot';
    if (type === 'course') name = courses?.find((c) => c.id === id)?.name || name;
    if (type === 'group') name = groups?.find((g) => g.id === id)?.name || name;
    handleCreate(day, hour, type, id, name);
  };

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Haftalık Program</h1>

      <div className={styles.layout}>
        <div className={styles.sidePanel}>
          <h3>Dersler</h3>
          {courses?.map((c) => <DraggableCard key={`course-${c.id}`} id={`course-${c.id}`} label={c.name} />)}
          <h3>Gruplar</h3>
          {groups?.map((g) => <DraggableCard key={`group-${g.id}`} id={`group-${g.id}`} label={g.name} />)}
        </div>

        <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
          <div className={styles.grid}>
            <div className={styles.gridRow}>
              <div className={styles.hourLabel}></div>
              {DAYS.map((d) => <div key={d} className={styles.dayHeader}>{d}</div>)}
            </div>
            {HOURS.map((hour) => (
              <div key={hour} className={styles.gridRow}>
                <div className={styles.hourLabel}>{String(hour).padStart(2, '0')}:00</div>
                {DAYS.map((_, i) => {
                  const day = i + 1;
                  const cellSlots = slotAt(day, hour);
                  return (
                    <DroppableCell key={day} id={`cell-${day}-${hour}`}>
                      {cellSlots.map((s) => (
                        <div key={s.id} className={styles.slot}>
                          <span className={styles.slotTitle}>{s.title}</span>
                          <button className={styles.del} onClick={() => deleteSlot.mutateAsync({ programId, slotId: s.id })}>✕</button>
                        </div>
                      ))}
                      <button className={styles.addBtn} onClick={() => { setFormDay(day); setFormHour(hour); setConflict(''); }}>+</button>
                    </DroppableCell>
                  );
                })}
              </div>
            ))}
          </div>
        </DndContext>
      </div>

      {formDay !== null && (
        <Card className={styles.formCard} padding="md">
          <div className={styles.formTitle}>Yeni Slot — {DAYS[formDay - 1]} {String(formHour).padStart(2, '0')}:00</div>
          <input className={styles.input} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Başlık" />
          <div className={styles.formActions}>
            <button className={styles.btn} onClick={() => handleCreate(formDay, formHour, null, null)}>Ekle</button>
            <button className={styles.btnOutline} onClick={() => setFormDay(null)}>İptal</button>
          </div>
          {conflict && <p className={styles.conflict}>{conflict}</p>}
        </Card>
      )}
    </div>
  );
};

export default WeeklySchedulePage;
