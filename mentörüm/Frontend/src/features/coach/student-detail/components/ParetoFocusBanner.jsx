import React from 'react';
import { AlertCircle, ArrowRight, Zap, Target } from 'lucide-react';
import Button from '../../../../components/common/Button/Button';

const ParetoFocusBanner = ({ exams = [], onAssignFocusHomework }) => {
  // En çok yanlış veya net kaybı yaşanan konuları/dersleri tespit et
  const lossMap = {};

  exams.forEach((exam) => {
    (exam.scores || []).forEach((score) => {
      const subject = score.subjectName || score.unitName || 'Genel';
      const wrong = score.wrong || 0;
      const blank = score.blank || 0;
      const lossPoints = (wrong * 1.25) + blank;
      if (lossPoints > 0) {
        lossMap[subject] = (lossMap[subject] || 0) + lossPoints;
      }
    });
  });

  const sortedLosses = Object.entries(lossMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2);

  if (sortedLosses.length === 0) return null;

  return (
    <div style={{
      padding: '14px 18px',
      borderRadius: '10px',
      background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.08) 0%, rgba(245, 158, 11, 0.08) 100%)',
      border: '1px solid rgba(239, 68, 68, 0.25)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      flexWrap: 'wrap',
      gap: '12px',
      marginBottom: '16px'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{
          width: '36px',
          height: '36px',
          borderRadius: '50%',
          backgroundColor: 'rgba(239, 68, 68, 0.15)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#dc2626'
        }}>
          <Zap size={20} />
        </div>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.875rem', fontWeight: 700, color: '#b91c1c' }}>
              Pareto 80/20 Net Odak Analizi
            </span>
            <span style={{ fontSize: '0.75rem', padding: '1px 6px', borderRadius: '4px', backgroundColor: '#fee2e2', color: '#991b1b', fontWeight: 600 }}>
              Kritik Net Kaybı
            </span>
          </div>
          <p style={{ margin: '2px 0 0', fontSize: '0.825rem', color: 'var(--text-color-main)' }}>
            Öğrencinin net kayıplarının %80'i şu alanlarda yoğunlaşıyor:{' '}
            <strong>{sortedLosses.map(([subj]) => subj).join(' ve ')}</strong>
          </p>
        </div>
      </div>

      {onAssignFocusHomework && (
        <Button
          variant="secondary"
          size="sm"
          onClick={() => onAssignFocusHomework(sortedLosses[0][0])}
          style={{ borderColor: '#f87171', color: '#b91c1c' }}
        >
          <Target size={14} style={{ marginRight: '6px' }} />
          Bu Alandan Ödev Ata
        </Button>
      )}
    </div>
  );
};

export default ParetoFocusBanner;

