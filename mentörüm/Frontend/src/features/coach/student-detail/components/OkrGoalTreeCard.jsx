import React, { useState } from 'react';
import Card from '../../../../components/common/Card/Card';
import Button from '../../../../components/common/Button/Button';
import { Target, Flag, Clock, HelpCircle, Edit2, Check, X } from 'lucide-react';

const OkrGoalTreeCard = ({ student, onUpdateGoal }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [milestone, setMilestone] = useState(student?.monthlyMilestone || '');
  const [targetMinutes, setTargetMinutes] = useState(student?.weeklyTargetMinutes || 0);
  const [targetQuestions, setTargetQuestions] = useState(student?.weeklyTargetQuestions || 0);

  const studyMinutes = student?.thisWeekStudyMinutes || 0;
  const questionCount = student?.thisWeekQuestionCount || 0;

  const minutesPercent = targetMinutes > 0 ? Math.min(100, Math.round((studyMinutes / targetMinutes) * 100)) : 0;
  const questionsPercent = targetQuestions > 0 ? Math.min(100, Math.round((questionCount / targetQuestions) * 100)) : 0;

  const handleSave = () => {
    if (onUpdateGoal) {
      onUpdateGoal({
        monthlyMilestone: milestone,
        weeklyTargetMinutes: parseInt(targetMinutes, 10) || 0,
        weeklyTargetQuestions: parseInt(targetQuestions, 10) || 0
      });
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setMilestone(student?.monthlyMilestone || '');
    setTargetMinutes(student?.weeklyTargetMinutes || 0);
    setTargetQuestions(student?.weeklyTargetQuestions || 0);
    setIsEditing(false);
  };

  return (
    <Card 
      title={
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Target size={18} style={{ color: 'var(--color-primary)' }} />
            <span>OKR & Hedef Ağacı</span>
          </div>
          {!isEditing ? (
            <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)}>
              <Edit2 size={14} style={{ marginRight: '4px' }} />
              Hedefleri Düzenle
            </Button>
          ) : (
            <div style={{ display: 'flex', gap: '6px' }}>
              <Button variant="ghost" size="sm" onClick={handleCancel}>
                <X size={14} />
              </Button>
              <Button variant="primary" size="sm" onClick={handleSave}>
                <Check size={14} style={{ marginRight: '4px' }} />
                Kaydet
              </Button>
            </div>
          )}
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Aylık Dönüm Noktası */}
        <div style={{ padding: '12px', borderRadius: '8px', backgroundColor: 'var(--bg-color-main)', border: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <Flag size={16} style={{ color: '#f59e0b' }} />
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-color-main)' }}>Bu Ayın Dönüm Noktası (Milestone)</span>
          </div>
          {isEditing ? (
            <input
              type="text"
              value={milestone}
              onChange={(e) => setMilestone(e.target.value)}
              placeholder="Örn: Limit-Türev bitirilecek, TYT neti 85 üzerine çıkarılacak"
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '6px',
                border: '1px solid var(--border-color)',
                backgroundColor: 'var(--bg-color-surface)',
                color: 'var(--text-color-main)',
                fontSize: '0.875rem'
              }}
            />
          ) : (
            <p style={{ margin: 0, fontSize: '0.9rem', color: milestone ? 'var(--text-color-main)' : 'var(--text-color-muted)', fontStyle: milestone ? 'normal' : 'italic' }}>
              {milestone || 'Henüz aylık dönüm noktası belirlenmemiş.'}
            </p>
          )}
        </div>

        {/* Haftalık Hedefler & İlerleme */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
          {/* Çalışma Süresi Hedefi */}
          <div style={{ padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-color-surface)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Clock size={16} style={{ color: 'var(--color-primary)' }} />
                <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Haftalık Çalışma</span>
              </div>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-color-muted)' }}>
                {Math.round(studyMinutes / 60)}s / {isEditing ? targetMinutes : Math.round(targetMinutes / 60)}s
              </span>
            </div>
            {isEditing ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <input
                  type="number"
                  value={targetMinutes}
                  onChange={(e) => setTargetMinutes(e.target.value)}
                  placeholder="Dakika cinsinden"
                  style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--border-color)', fontSize: '0.85rem' }}
                />
                <span style={{ fontSize: '0.75rem', color: 'var(--text-color-muted)' }}>dk</span>
              </div>
            ) : (
              <div>
                <div style={{ height: '8px', borderRadius: '4px', backgroundColor: 'var(--border-color)', overflow: 'hidden', marginBottom: '4px' }}>
                  <div style={{ width: `${minutesPercent}%`, height: '100%', backgroundColor: minutesPercent >= 100 ? '#10b981' : 'var(--color-primary)', transition: 'width 0.3s ease' }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-color-muted)' }}>
                  <span>{studyMinutes} dk çalışıldı</span>
                  <span>%{minutesPercent}</span>
                </div>
              </div>
            )}
          </div>

          {/* Soru Sayısı Hedefi */}
          <div style={{ padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-color-surface)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <HelpCircle size={16} style={{ color: '#10b981' }} />
                <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Haftalık Soru</span>
              </div>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-color-muted)' }}>
                {questionCount} / {targetQuestions}
              </span>
            </div>
            {isEditing ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <input
                  type="number"
                  value={targetQuestions}
                  onChange={(e) => setTargetQuestions(e.target.value)}
                  placeholder="Hedef soru adedi"
                  style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--border-color)', fontSize: '0.85rem' }}
                />
                <span style={{ fontSize: '0.75rem', color: 'var(--text-color-muted)' }}>adet</span>
              </div>
            ) : (
              <div>
                <div style={{ height: '8px', borderRadius: '4px', backgroundColor: 'var(--border-color)', overflow: 'hidden', marginBottom: '4px' }}>
                  <div style={{ width: `${questionsPercent}%`, height: '100%', backgroundColor: questionsPercent >= 100 ? '#10b981' : '#3b82f6', transition: 'width 0.3s ease' }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-color-muted)' }}>
                  <span>{questionCount} soru çözüldü</span>
                  <span>%{questionsPercent}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
};

export default OkrGoalTreeCard;

