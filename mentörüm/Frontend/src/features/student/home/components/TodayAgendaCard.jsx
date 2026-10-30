import React, { useState } from 'react';
import Card from '../../../../components/common/Card/Card';
import Button from '../../../../components/common/Button/Button';
import { Calendar, Clock, CheckCircle2, Circle, MessageSquare, ChevronRight, BookOpen, Flame } from 'lucide-react';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import { useStudentCoachingTools, useToggleStudentHabit, useUpdateSessionPrep, useStudentSchedule } from '../../studentApi';

const PRIORITY_ORDER = { HIGH: 1, NORMAL: 2, LOW: 3 };

const TodayAgendaCard = ({ upcomingSession, homeworks = [], onNavigateToHomework }) => {
  const navigate = useNavigate();
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const todayDayOfWeek = (new Date().getDay() + 6) % 7 + 1; // 1: Pazartesi ... 7: Pazar

  const { data: scheduleSlots = [] } = useStudentSchedule();
  const { data: coachingTools } = useStudentCoachingTools();
  const toggleHabit = useToggleStudentHabit();
  const updatePrep = useUpdateSessionPrep();

  const [prepNote, setPrepNote] = useState(upcomingSession?.prepNotes || '');

  // Bugünün ders / program slotları
  const todaySlots = scheduleSlots.filter(s => s.dayOfWeek === todayDayOfWeek);

  // Alışkanlıklar
  const habits = React.useMemo(() => {
    try {
      if (!coachingTools?.habitsData) return [];
      return typeof coachingTools.habitsData === 'string'
        ? JSON.parse(coachingTools.habitsData || '[]')
        : coachingTools.habitsData;
    } catch {
      return [];
    }
  }, [coachingTools?.habitsData]);

  // Önceliklendirilmiş ödevler (Bekleyen & Gecikmiş)
  const prioritizedHomework = React.useMemo(() => {
    return [...homeworks]
      .filter(h => h.status === 'PENDING' || h.status === 'OVERDUE')
      .sort((a, b) => {
        if (a.status === 'OVERDUE' && b.status !== 'OVERDUE') return -1;
        if (b.status === 'OVERDUE' && a.status !== 'OVERDUE') return 1;
        const pA = PRIORITY_ORDER[a.priority] || 2;
        const pB = PRIORITY_ORDER[b.priority] || 2;
        if (pA !== pB) return pA - pB;
        return new Date(a.dueDate || 0) - new Date(b.dueDate || 0);
      })
      .slice(0, 3);
  }, [homeworks]);

  const handleToggleHabit = (habitId, isDone) => {
    toggleHabit.mutate({
      habitId,
      date: todayStr,
      completed: !isDone
    });
  };

  return (
    <Card 
      title={
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Calendar size={18} style={{ color: 'var(--color-primary)' }} />
            <span>Bugünkü Programım & Yapılacaklar</span>
          </div>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-color-muted)' }}>
            {format(new Date(), 'd MMMM EEEE', { locale: tr })}
          </span>
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {/* 1. Günlük Rutin / Mikro Alışkanlıklar */}
        {habits.length > 0 && (
          <div style={{ padding: '10px 12px', background: 'var(--bg-app, #f8fafc)', borderRadius: '8px', border: '1px solid var(--border-color, #e2e8f0)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-primary)', marginBottom: '8px' }}>
              <Flame size={14} style={{ color: '#f59e0b' }} />
              <span>Günün Alışkanlıkları & Mikro Rutinler</span>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {habits.map((habit) => {
                const isDone = (habit.completedDates || []).includes(todayStr);
                return (
                  <button
                    key={habit.id}
                    type="button"
                    onClick={() => handleToggleHabit(habit.id, isDone)}
                    disabled={toggleHabit.isPending}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '5px 10px',
                      borderRadius: '16px',
                      border: isDone ? '1px solid #10b981' : '1px solid var(--border-color, #cbd5e1)',
                      backgroundColor: isDone ? 'rgba(16, 185, 129, 0.12)' : 'var(--bg-card, #ffffff)',
                      color: isDone ? '#065f46' : 'var(--text-color-main)',
                      fontSize: '0.8rem',
                      fontWeight: isDone ? 600 : 400,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    {isDone ? <CheckCircle2 size={14} color="#10b981" /> : <Circle size={14} color="#94a3b8" />}
                    <span>{habit.title}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* 2. Bugünün Ders / Etüt Programı */}
        {todaySlots.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-color-muted)' }}>
              Bugünkü Ders & Etütler
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {todaySlots.map((slot) => (
                <div 
                  key={slot.id} 
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    background: 'var(--bg-app, #f8fafc)',
                    border: '1px solid var(--border-color, #e2e8f0)',
                    fontSize: '0.825rem'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Clock size={14} style={{ color: 'var(--color-primary)' }} />
                    <span style={{ fontWeight: 600 }}>{slot.courseName || slot.title || 'Ders / Etüt'}</span>
                  </div>
                  <span style={{ color: 'var(--text-color-muted)', fontSize: '0.78rem' }}>
                    {slot.startTime?.substring(0, 5)} - {slot.endTime?.substring(0, 5)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 3. Öncelikli Bekleyen Ödevler */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-color-muted)' }}>
              Öncelikli Ödevlerim
            </span>
            <Button variant="ghost" size="sm" onClick={() => (onNavigateToHomework ? onNavigateToHomework() : navigate('/student/homework'))} style={{ fontSize: '0.75rem', padding: '2px 6px' }}>
              Tümü ({homeworks.filter(h => h.status === 'PENDING' || h.status === 'OVERDUE').length}) <ChevronRight size={12} />
            </Button>
          </div>
          {prioritizedHomework.length === 0 ? (
            <div style={{ padding: '10px 12px', background: 'var(--bg-card)', borderRadius: '8px', border: '1px solid var(--border-color)', color: 'var(--text-color-muted)', fontSize: '0.8rem' }}>
              🎉 Harika! Bekleyen veya acil bir ödevin yok.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {prioritizedHomework.map((hw) => {
                const isOverdue = hw.status === 'OVERDUE';
                const isHigh = hw.priority === 'HIGH';
                return (
                  <div
                    key={hw.id}
                    onClick={() => (onNavigateToHomework ? onNavigateToHomework() : navigate('/student/homework'))}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: isOverdue ? '1px solid rgba(239, 68, 68, 0.4)' : isHigh ? '1px solid rgba(245, 158, 11, 0.4)' : '1px solid var(--border-color)',
                      backgroundColor: isOverdue ? 'rgba(239, 68, 68, 0.05)' : isHigh ? 'rgba(245, 158, 11, 0.05)' : 'var(--bg-app)',
                      cursor: 'pointer'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <BookOpen size={14} style={{ color: isOverdue ? '#ef4444' : isHigh ? '#f59e0b' : 'var(--color-primary)' }} />
                      <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>{hw.snapshotTitle}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {isOverdue && (
                        <span style={{ fontSize: '0.7rem', padding: '1px 6px', borderRadius: '4px', backgroundColor: '#fee2e2', color: '#b91c1c', fontWeight: 600 }}>
                          Gecikmiş
                        </span>
                      )}
                      {isHigh && !isOverdue && (
                        <span style={{ fontSize: '0.7rem', padding: '1px 6px', borderRadius: '4px', backgroundColor: '#fef3c7', color: '#92400e', fontWeight: 600 }}>
                          Acil
                        </span>
                      )}
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-color-muted)' }}>
                        {hw.dueDate ? format(new Date(hw.dueDate), 'd MMM', { locale: tr }) : '-'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 4. Yaklaşan Koç Görüşmesi & Hazırlık Notu */}
        {upcomingSession && (
          <div style={{ padding: '12px', borderRadius: '8px', background: 'rgba(99, 102, 241, 0.06)', border: '1px solid rgba(99, 102, 241, 0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.825rem', fontWeight: 600, color: 'var(--color-primary)' }}>
                <MessageSquare size={14} />
                <span>Koç Görüşmesi: {upcomingSession.title}</span>
              </div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-color-muted)' }}>
                {upcomingSession.sessionDate ? format(new Date(upcomingSession.sessionDate), 'd MMM HH:mm', { locale: tr }) : ''}
              </span>
            </div>
            {upcomingSession.actionItems && (
              <p style={{ margin: '0 0 6px', fontSize: '0.78rem', color: '#b45309' }}>
                Önceki Aksiyon: {upcomingSession.actionItems}
              </p>
            )}
            <textarea
              value={prepNote}
              onChange={(e) => setPrepNote(e.target.value)}
              rows={2}
              placeholder="Görüşme öncesi koçuna iletmek istediğin hazırlık notu..."
              style={{
                width: '100%',
                padding: '6px 8px',
                borderRadius: '6px',
                border: '1px solid var(--border-color)',
                backgroundColor: 'var(--bg-card, #ffffff)',
                color: 'var(--text-color-main)',
                fontSize: '0.8rem',
                marginBottom: '6px'
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '8px' }}>
              {updatePrep.isSuccess && <span style={{ color: '#16a34a', fontSize: '0.75rem' }}>✓ Kaydedildi</span>}
              <Button
                size="sm"
                variant="primary"
                disabled={updatePrep.isPending}
                onClick={() => updatePrep.mutate({ sessionId: upcomingSession.id, prepNotes: prepNote })}
              >
                {updatePrep.isPending ? 'Kaydediliyor...' : 'Notu Kaydet'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};

export default TodayAgendaCard;

