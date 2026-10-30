import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { DndContext, PointerSensor, TouchSensor, KeyboardSensor, useSensor, useSensors, useDraggable, useDroppable } from '@dnd-kit/core';
import { GripVertical } from 'lucide-react';
import { useSchedule, useCourses, useGroups, useCreateScheduleSlot, useDeleteScheduleSlot } from '../coachSchoolApi';
import { WEEKDAYS_ZERO_INDEXED } from '../../../constants/domainConstants';
import Modal from '../../../components/common/Modal/Modal';
import Button from '../../../components/common/Button/Button';
import SegmentedTabs from '../../../components/common/SegmentedTabs/SegmentedTabs';
import styles from './WeeklySchedulePage.module.css';

const DAYS = WEEKDAYS_ZERO_INDEXED;
const HOURS = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];

const DraggableCard = ({ id, label, color }) => {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id });
  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={styles.dragCard}
      style={{
        opacity: isDragging ? 0.5 : 1,
        borderLeftColor: color || 'var(--color-primary)'
      }}
    >
      <GripVertical size={14} className={styles.gripIcon} />
      <span className={styles.dragLabel}>{label}</span>
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

const WeeklySchedulePage = ({ programId: propProgramId, embedded = false }) => {
  const { programId: routeProgramId } = useParams();
  const programId = propProgramId || routeProgramId;
  const { data: slots } = useSchedule(programId);
  const { data: courses } = useCourses(programId);
  const { data: groups } = useGroups(programId);
  const createSlot = useCreateScheduleSlot();
  const deleteSlot = useDeleteScheduleSlot();

  const [formDay, setFormDay] = useState(null);
  const [formHour, setFormHour] = useState(null);
  const [slotTargetType, setSlotTargetType] = useState('course'); // 'course' | 'group' | 'custom'
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [title, setTitle] = useState('');
  const [conflict, setConflict] = useState('');
  const [dragConflict, setDragConflict] = useState('');

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
    useSensor(KeyboardSensor)
  );

  const slotAt = (day, hour) => (slots || []).filter((s) => s.dayOfWeek === day && parseInt(s.startTime?.slice(0, 2), 10) === hour);

  const handleOpenAddModal = (day, hour) => {
    setFormDay(day);
    setFormHour(hour);
    setSlotTargetType(courses?.length > 0 ? 'course' : (groups?.length > 0 ? 'group' : 'custom'));
    setSelectedCourseId(courses?.[0]?.id || '');
    setSelectedGroupId(groups?.[0]?.id || '');
    setTitle('');
    setConflict('');
    setDragConflict('');
  };

  const handleCreate = async (day, hour, targetType, targetId, slotTitle) => {
    const startTime = `${String(hour).padStart(2, '0')}:00:00`;
    const endTime = `${String(hour + 1).padStart(2, '0')}:00:00`;

    let resolvedTitle = slotTitle || title.trim();
    if (!resolvedTitle) {
      if (targetType === 'course') {
        resolvedTitle = courses?.find((c) => c.id === targetId)?.name || 'Ders';
      } else if (targetType === 'group') {
        resolvedTitle = groups?.find((g) => g.id === targetId)?.name || 'Grup Dersi';
      } else {
        resolvedTitle = 'Yeni Etüt / Ders';
      }
    }

    const data = { dayOfWeek: day, startTime, endTime, title: resolvedTitle };
    if (targetType === 'course' && targetId) data.courseId = targetId;
    else if (targetType === 'group' && targetId) data.groupId = targetId;

    try {
      await createSlot.mutateAsync({ programId, data });
      setFormDay(null);
      setFormHour(null);
      setTitle('');
      setConflict('');
      setDragConflict('');
    } catch (err) {
      let msg = 'Slot oluşturulamadı.';
      if (err?.response?.status === 409 || err?.response?.data?.code === 'SCHEDULE_CONFLICT') {
        const details = err.response?.data?.conflictDetails;
        if (details && Array.isArray(details) && details.length > 0) {
          const detailMsg = details.map((c) => `${c.reason || 'Çakışma'}${c.existingSlotTitle ? ` (${c.existingSlotTitle})` : ''}`).join('; ');
          msg = `Bu saatte çakışma var: ${detailMsg}`;
        } else {
          msg = err.response?.data?.error || 'Bu saatte öğretmen veya öğrenci için program çakışması var.';
        }
      } else if (err.response?.data?.error) {
        msg = err.response.data.error;
      }

      if (formDay !== null) {
        setConflict(msg);
      } else {
        setDragConflict(msg);
      }
    }
  };

  const handleModalSubmit = (e) => {
    e.preventDefault();
    if (formDay === null || formHour === null) return;
    if (slotTargetType === 'course') {
      handleCreate(formDay, formHour, 'course', selectedCourseId, title.trim());
    } else if (slotTargetType === 'group') {
      handleCreate(formDay, formHour, 'group', selectedGroupId, title.trim());
    } else {
      handleCreate(formDay, formHour, null, null, title.trim());
    }
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
    <div className={embedded ? styles.containerEmbedded : styles.container}>
      {!embedded && <h1 className={styles.title}>Haftalık Program</h1>}

      <div className={styles.helperBanner}>
        <span>💡 Soldaki <strong>Dersler</strong> veya <strong>Gruplar</strong> kutularını sürükleyip saat dilimine bırakabilir ya da tablodaki <strong>(+)</strong> butonuna tıklayarak ders/grup seçebilirsiniz.</span>
      </div>

      {dragConflict && (
        <div className={styles.conflictAlert}>
          <span>{dragConflict}</span>
          <Button
            type="button"
            variant="ghost"
            size="xs"
            iconOnly
            onClick={() => setDragConflict('')}
          >
            ✕
          </Button>
        </div>
      )}

      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        <div className={styles.layout}>
          <div className={styles.sidePanel}>
            <h3>📚 Dersler</h3>
            {courses?.map((c) => (
              <DraggableCard key={`course-${c.id}`} id={`course-${c.id}`} label={c.name} color={c.color} />
            ))}
            <h3>🗂️ Gruplar</h3>
            {groups?.map((g) => (
              <DraggableCard key={`group-${g.id}`} id={`group-${g.id}`} label={g.name} color="#10b981" />
            ))}
          </div>

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
                          <button type="button" className={styles.del} onClick={() => deleteSlot.mutateAsync({ programId, slotId: s.id })}>✕</button>
                        </div>
                      ))}
                      <button
                        type="button"
                        className={styles.addBtn}
                        title="Bu saate ders/etüt ekle"
                        onClick={() => handleOpenAddModal(day, hour)}
                      >
                        +
                      </button>
                    </DroppableCell>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </DndContext>

      <Modal
        isOpen={formDay !== null}
        onClose={() => { setFormDay(null); setConflict(''); }}
        title={formDay !== null ? `Program Slotu Ekle — ${DAYS[formDay - 1]} ${String(formHour).padStart(2, '0')}:00` : 'Program Slotu Ekle'}
        maxWidth="460px"
      >
        <form onSubmit={handleModalSubmit} className={styles.modalForm}>
          <SegmentedTabs
            fullWidth
            activeTab={slotTargetType}
            onChange={setSlotTargetType}
            tabs={[
              { id: 'course', label: '📚 Ders Seç' },
              { id: 'group', label: '🗂️ Grup Seç' },
              { id: 'custom', label: '📌 Özel Başlık' },
            ]}
          />

          {slotTargetType === 'course' && (
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>Ders / Branş</label>
              <select
                className={styles.select}
                value={selectedCourseId}
                onChange={(e) => setSelectedCourseId(e.target.value)}
              >
                {courses?.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          )}

          {slotTargetType === 'group' && (
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>Sınıf / Grup</label>
              <select
                className={styles.select}
                value={selectedGroupId}
                onChange={(e) => setSelectedGroupId(e.target.value)}
              >
                {groups?.map((g) => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </select>
            </div>
          )}

          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>
              {slotTargetType === 'custom' ? 'Etkinlik / Etüt Başlığı *' : 'Özel Başlık (Boş bırakılırsa ders/grup adı kullanılır)'}
            </label>
            <input
              className={styles.input}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={slotTargetType === 'custom' ? 'Örn: Bireysel Soru Çözüm Etüdü' : 'Opsiyonel özel başlık...'}
              required={slotTargetType === 'custom'}
            />
          </div>

          {conflict && <p className={styles.conflict}>{conflict}</p>}

          <div className={styles.formActions}>
            <Button type="button" variant="ghost" onClick={() => { setFormDay(null); setConflict(''); }}>
              İptal
            </Button>
            <Button type="submit" variant="primary" isLoading={createSlot.isPending}>
              Programa Ekle
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default WeeklySchedulePage;
