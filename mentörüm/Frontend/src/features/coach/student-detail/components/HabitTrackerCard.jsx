import React, { useState } from 'react';
import Card from '../../../../components/common/Card/Card';
import Button from '../../../../components/common/Button/Button';
import { CheckCircle2, Circle, Plus, Trash2, Award } from 'lucide-react';
import { format, startOfWeek, addDays } from 'date-fns';
import { tr } from 'date-fns/locale';

const HabitTrackerCard = ({ habits = [], onSaveHabits, isCoach = true }) => {
  const [newHabitTitle, setNewHabitTitle] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  // Bu haftanın 7 gününü hesapla
  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }).map((_, i) => addDays(weekStart, i));

  const handleAddHabit = () => {
    if (!newHabitTitle.trim()) return;
    const newHabit = {
      id: `h_${Date.now()}`,
      title: newHabitTitle.trim(),
      completedDates: [],
      createdAt: new Date().toISOString()
    };
    const updated = [...habits, newHabit];
    onSaveHabits(updated);
    setNewHabitTitle('');
    setIsAdding(false);
  };

  const handleToggleDay = (habitId, dateStr) => {
    const updated = habits.map((h) => {
      if (h.id !== habitId) return h;
      const completedDates = h.completedDates || [];
      const hasDate = completedDates.includes(dateStr);
      return {
        ...h,
        completedDates: hasDate 
          ? completedDates.filter(d => d !== dateStr)
          : [...completedDates, dateStr]
      };
    });
    onSaveHabits(updated);
  };

  const handleDeleteHabit = (habitId) => {
    const updated = habits.filter(h => h.id !== habitId);
    onSaveHabits(updated);
  };

  return (
    <Card
      title={
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Award size={18} style={{ color: '#10b981' }} />
            <span>Alışkanlık Takip Çizelgesi</span>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setIsAdding(!isAdding)}>
            <Plus size={14} style={{ marginRight: '4px' }} />
            Alışkanlık Ekle
          </Button>
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {isAdding && (
          <div style={{ display: 'flex', gap: '8px', padding: '10px', backgroundColor: 'var(--bg-color-main)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
            <input
              type="text"
              placeholder="Örn: Günde 40 Paragraf Sorusu, 30 dk Kitap..."
              value={newHabitTitle}
              onChange={(e) => setNewHabitTitle(e.target.value)}
              style={{ flex: 1, padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--border-color)', fontSize: '0.85rem' }}
              onKeyDown={(e) => e.key === 'Enter' && handleAddHabit()}
            />
            <Button variant="primary" size="sm" onClick={handleAddHabit}>Ekle</Button>
            <Button variant="ghost" size="sm" onClick={() => setIsAdding(false)}>Vazgeç</Button>
          </div>
        )}

        {/* Gün Başlıkları */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '360px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                <th style={{ textAlign: 'left', padding: '8px', fontSize: '0.8rem', color: 'var(--text-color-muted)' }}>Alışkanlık</th>
                {weekDays.map((d) => {
                  const isToday = format(d, 'yyyy-MM-dd') === format(now, 'yyyy-MM-dd');
                  return (
                    <th key={d.toISOString()} style={{ textAlign: 'center', padding: '6px 4px', fontSize: '0.75rem', color: isToday ? 'var(--color-primary)' : 'var(--text-color-muted)', fontWeight: isToday ? 700 : 500 }}>
                      <div>{format(d, 'EEE', { locale: tr })}</div>
                      <div>{format(d, 'd')}</div>
                    </th>
                  );
                })}
                {isCoach && <th style={{ width: '36px' }}></th>}
              </tr>
            </thead>
            <tbody>
              {habits.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', padding: '24px 8px', color: 'var(--text-color-muted)', fontSize: '0.85rem' }}>
                    Henüz takip edilen alışkanlık bulunmuyor. 'Alışkanlık Ekle' ile başlayabilirsiniz.
                  </td>
                </tr>
              ) : (
                habits.map((habit) => (
                  <tr key={habit.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '10px 8px', fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-color-main)' }}>
                      {habit.title}
                    </td>
                    {weekDays.map((d) => {
                      const dateStr = format(d, 'yyyy-MM-dd');
                      const isCompleted = (habit.completedDates || []).includes(dateStr);
                      return (
                        <td key={dateStr} style={{ textAlign: 'center', padding: '6px 4px' }}>
                          <button
                            type="button"
                            onClick={() => handleToggleDay(habit.id, dateStr)}
                            style={{
                              background: 'none',
                              border: 'none',
                              cursor: 'pointer',
                              padding: 0,
                              color: isCompleted ? '#10b981' : 'var(--border-color)',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                          >
                            {isCompleted ? <CheckCircle2 size={18} /> : <Circle size={18} />}
                          </button>
                        </td>
                      );
                    })}
                    {isCoach && (
                      <td style={{ textAlign: 'center', padding: '6px' }}>
                        <button
                          type="button"
                          onClick={() => handleDeleteHabit(habit.id)}
                          style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px' }}
                          title="Sil"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </Card>
  );
};

export default HabitTrackerCard;

