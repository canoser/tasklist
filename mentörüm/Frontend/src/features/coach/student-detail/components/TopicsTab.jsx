import React, { useState } from 'react';
import Card from '../../../../components/common/Card/Card';
import Button from '../../../../components/common/Button/Button';
import { CheckCircle2, Square } from 'lucide-react';
import styles from '../CoachStudentDetail.module.css';

export default function TopicsTab({ curriculum = [], onAssignTopicHomework }) {
  const [topicSubjectFilter, setTopicSubjectFilter] = useState('ALL');
  const [topicStatusFilter, setTopicStatusFilter] = useState('ALL');

  const filtered = (curriculum || []).filter((t) => {
    if (topicSubjectFilter !== 'ALL' && t.subjectName !== topicSubjectFilter) return false;
    if (topicStatusFilter === 'UNASSIGNED' && t.homeworkStatus !== 'UNASSIGNED') return false;
    if (topicStatusFilter === 'PENDING_OVERDUE' && t.homeworkStatus !== 'PENDING' && t.homeworkStatus !== 'OVERDUE') return false;
    if (topicStatusFilter === 'DONE' && t.homeworkStatus !== 'DONE') return false;
    return true;
  });

  const grouped = filtered.reduce((acc, t) => {
    const sName = t.subjectName || 'Diğer';
    const uName = t.unitName ? (t.unitNumber != null ? `${t.unitNumber}. ${t.unitName}` : t.unitName) : 'Genel Konular';
    if (!acc[sName]) acc[sName] = {};
    if (!acc[sName][uName]) acc[sName][uName] = [];
    acc[sName][uName].push(t);
    return acc;
  }, {});

  return (
    <Card title="Müfredat & Konu Takibi" className={styles.notesCard}>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16, alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-color-muted)' }}>Ders:</span>
          <select
            value={topicSubjectFilter}
            onChange={(e) => setTopicSubjectFilter(e.target.value)}
            style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
          >
            <option value="ALL">Tüm Dersler</option>
            {Array.from(new Set(curriculum?.map((c) => c.subjectName).filter(Boolean) || [])).map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-color-muted)' }}>Durum:</span>
          <select
            value={topicStatusFilter}
            onChange={(e) => setTopicStatusFilter(e.target.value)}
            style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
          >
            <option value="ALL">Tüm Durumlar</option>
            <option value="UNASSIGNED">Atanmamış / Eksikler</option>
            <option value="PENDING_OVERDUE">Bekleyen / Gecikmiş</option>
            <option value="DONE">Tamamlananlar</option>
          </select>
        </div>
      </div>

      {filtered.length === 0 ? (
        <p style={{ color: 'var(--text-color-muted)', fontSize: '0.9rem' }}>Filtrelere uygun konu bulunamadı.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {Object.entries(grouped).map(([subj, units]) => (
            <div key={subj} style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: 12, background: '#fafafa' }}>
              <h4 style={{ margin: '0 0 10px', color: 'var(--color-primary)', fontSize: '1rem', borderBottom: '1px solid #e2e8f0', paddingBottom: 6 }}>
                {subj}
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {Object.entries(units).map(([unit, topics]) => (
                  <div key={unit} style={{ background: '#ffffff', borderRadius: 6, padding: '8px 10px', border: '1px solid #f1f5f9' }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-color-muted)', marginBottom: 6 }}>{unit}</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {topics.map((t) => {
                        const statusColors = {
                          DONE: { bg: '#dcfce7', text: '#15803d', label: 'Tamamlandı' },
                          PENDING: { bg: '#e0f2fe', text: '#0369a1', label: 'Bekliyor' },
                          OVERDUE: { bg: '#fee2e2', text: '#b91c1c', label: 'Gecikmiş' },
                          UNASSIGNED: { bg: '#f1f5f9', text: '#64748b', label: 'Atanmadı' },
                        };
                        const badge = statusColors[t.homeworkStatus] || statusColors.UNASSIGNED;

                        return (
                          <div
                            key={t.id}
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              padding: '6px 8px',
                              borderBottom: '1px solid #f8fafc',
                              flexWrap: 'wrap',
                              gap: 8,
                            }}
                          >
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, minWidth: '180px', flex: 1 }}>
                              {t.isCompleted ? <CheckCircle2 size={15} color="#16a34a" /> : <Square size={15} color="#94a3b8" />}
                              <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>{t.topicName}</span>
                            </span>

                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span
                                style={{
                                  fontSize: '0.72rem',
                                  fontWeight: 600,
                                  padding: '2px 8px',
                                  borderRadius: 12,
                                  background: badge.bg,
                                  color: badge.text,
                                }}
                              >
                                {badge.label}
                              </span>

                              {t.lastNet != null && (
                                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-primary)' }}>Son Net: {t.lastNet}</span>
                              )}
                              {t.avgSuccessRate != null && (
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-color-muted)' }}>Başarı: %{t.avgSuccessRate}</span>
                              )}

                              <Button
                                variant="ghost"
                                size="sm"
                                style={{ padding: '2px 8px', height: '26px', fontSize: '0.75rem' }}
                                onClick={() => onAssignTopicHomework(t)}
                              >
                                Ödev Ver
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

