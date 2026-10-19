import React from 'react';
import { Clock } from 'lucide-react';
import { useStudentHomework, useCompleteHomework, useRequestExtension } from '../studentApi';
import Card from '../../../components/common/Card/Card';
import Button from '../../../components/common/Button/Button';
import { formatDate } from '../../../utils/dateUtils';
import styles from './StudentHomework.module.css';

const HomeworkCard = ({ hw, onComplete, onRequestExtension }) => {
  const [percentage, setPercentage] = React.useState(hw.completionPercentage || 0);
  const [note, setNote] = React.useState(hw.studentNote || '');
  const [showExtension, setShowExtension] = React.useState(false);
  const [reason, setReason] = React.useState('');

  return (
    <Card interactive className={styles.homeworkCard}>
      <div className={styles.cardHeader}>
        <div>
          {(hw.subjectName || hw.topicName) && (
            <span className={styles.subjectBadge}>
              {hw.subjectName}{hw.topicName ? ` · ${hw.topicName}` : ''}
            </span>
          )}
          <h3 className={styles.hwTitle}>{hw.snapshotTitle}</h3>
        </div>
        <span className={`${styles.statusBadge} ${hw.status === 'OVERDUE' ? styles.overdue : ''}`}>
          {hw.status === 'OVERDUE' ? 'Gecikmiş' : 'Bekliyor'}
        </span>
      </div>
      
      <p className={styles.hwDesc}>{hw.snapshotDesc}</p>
      
      <div className={styles.progressSection}>
        <div className={styles.progressHeader}>
          <span>İlerleme Durumun</span>
          <span>%{percentage}</span>
        </div>
        <input 
          type="range" 
          min="0" max="100" step="10"
          value={percentage} 
          onChange={(e) => setPercentage(Number(e.target.value))}
          className={styles.rangeInput}
        />
      </div>

      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={2}
        placeholder="Zorlandığın noktalar / koçuna not (opsiyonel)"
        style={{ width: '100%', marginTop: '8px', padding: '8px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-app)', color: 'var(--text-primary)', resize: 'vertical' }}
      />

      <div className={styles.cardFooter}>
        <div className={styles.dueDate}>
          Son Teslim: {formatDate(hw.dueDate, 'dd MMM yyyy, HH:mm')}
        </div>
        <Button 
          size="sm" 
          onClick={() => onComplete({ homeworkId: hw.id, percentage, note })}
        >
          {percentage === 100 ? 'Tamamla' : 'İlerlemeyi Kaydet'}
        </Button>
      </div>

      {showExtension ? (
        <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={2}
            placeholder="Ek süre mazeretin..."
            style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-app)', color: 'var(--text-primary)', resize: 'vertical' }}
          />
          <div style={{ display: 'flex', gap: '8px' }}>
            <Button size="sm" variant="ghost" onClick={() => setShowExtension(false)}>Vazgeç</Button>
            <Button size="sm" onClick={() => { onRequestExtension({ homeworkId: hw.id, reason }); setShowExtension(false); setReason(''); }}>Talebi Gönder</Button>
          </div>
        </div>
      ) : (
        <button type="button" onClick={() => setShowExtension(true)} style={{ marginTop: '10px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-primary)', fontSize: '0.8rem', fontWeight: 600, padding: 0, display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
          <Clock size={14} /> Ek Süre İste
        </button>
      )}
    </Card>
  );
};

const StudentHomework = () => {
  const { data: homeworks, isLoading, error } = useStudentHomework();
  const { mutate: completeHomework } = useCompleteHomework();
  const requestExtension = useRequestExtension();

  if (isLoading) {
    return <div className={styles.loading}>Ödevleriniz yükleniyor...</div>;
  }

  if (error) {
    return <div className={styles.error}>Ödevler yüklenirken hata oluştu.</div>;
  }

  const pendingHomeworks = homeworks?.filter(hw => hw.status === 'PENDING' || hw.status === 'OVERDUE') || [];
  const completedHomeworks = homeworks?.filter(hw => hw.status === 'DONE' || hw.status === 'LATE_DONE') || [];

  return (
    <div className={styles.pageContainer}>
      <header className={styles.header}>
        <h1 className={styles.title}>Ödevlerim</h1>
        <p className={styles.subtitle}>Sana verilen görevleri buradan takip edebilirsin.</p>
      </header>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>
          Bekleyen Görevler <span className={styles.badge}>{pendingHomeworks.length}</span>
        </h2>
        
        {pendingHomeworks.length === 0 ? (
          <div className={styles.emptyState}>Harika! Bekleyen ödevin yok.</div>
        ) : (
          <div className={styles.list}>
            {pendingHomeworks.map(hw => (
              <HomeworkCard key={hw.id} hw={hw} onComplete={completeHomework} onRequestExtension={(payload) => requestExtension.mutate({ homeworkId: payload.homeworkId, data: { reason: payload.reason } })} />
            ))}
          </div>
        )}
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Tamamlananlar</h2>
        
        {completedHomeworks.length === 0 ? (
          <div className={styles.emptyState}>Henüz tamamlanmış ödevin yok.</div>
        ) : (
          <div className={styles.list}>
            {completedHomeworks.map(hw => (
              <Card key={hw.id} className={styles.homeworkCardCompleted}>
                <div className={styles.cardHeader}>
                  <div>
                    {(hw.subjectName || hw.topicName) && (
                      <span className={styles.subjectBadge}>
                        {hw.subjectName}{hw.topicName ? ` · ${hw.topicName}` : ''}
                      </span>
                    )}
                    <h3 className={styles.hwTitleCompleted}>{hw.snapshotTitle}</h3>
                  </div>
                  <span className={styles.statusBadgeDone}>
                    ✓ Tamamlandı
                  </span>
                </div>
                <div className={styles.dueDate}>
                  Teslim Edildi: {formatDate(hw.completedAt, 'dd MMM yyyy')}
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default StudentHomework;
