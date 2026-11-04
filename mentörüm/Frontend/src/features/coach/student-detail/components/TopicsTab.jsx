import React, { useState } from 'react';
import Card from '../../../../components/common/Card/Card';
import Button from '../../../../components/common/Button/Button';
import Input from '../../../../components/common/Input/Input';
import {
  useUpdateStudentPermissions,
  useCoachToggleTopicStatus,
  useCoachStudentResources,
  useCreateCoachStudentResource,
  useDeleteCoachStudentResource,
} from '../../coachApi';
import { CheckCircle2, Square, Trash2, ExternalLink } from 'lucide-react';
import styles from '../CoachStudentDetail.module.css';

export default function TopicsTab({
  studentId,
  student,
  curriculum = [],
  selectedGrade = null,
  onSelectGrade = null,
  onAssignTopicHomework,
}) {
  const [topicSubjectFilter, setTopicSubjectFilter] = useState('ALL');
  const [topicStatusFilter, setTopicStatusFilter] = useState('ALL');
  const [resTitle, setResTitle] = useState('');
  const [resType, setResType] = useState('BOOK');
  const [resUrl, setResUrl] = useState('');
  const [resTotalItems, setResTotalItems] = useState('');

  const updatePermsMutation = useUpdateStudentPermissions(studentId);
  const toggleTopicMutation = useCoachToggleTopicStatus(studentId);
  const { data: resources = [] } = useCoachStudentResources(studentId);
  const createResourceMutation = useCreateCoachStudentResource(studentId);
  const deleteResourceMutation = useDeleteCoachStudentResource(studentId);

  const perms = student?.permissions || {
    canCompleteTopics: true,
    canCompleteHomework: true,
    canEditGoals: true,
    canAddExamResults: false,
    canManageResources: false,
    canSelfAssignWork: false,
  };

  const handleTogglePerm = (key) => {
    if (!student) return;
    updatePermsMutation.mutate({
      canCompleteTopics: key === 'canCompleteTopics' ? !perms.canCompleteTopics : Boolean(perms.canCompleteTopics),
      canEditGoals: Boolean(perms.canEditGoals),
      canCompleteHomework: Boolean(perms.canCompleteHomework),
      canAddExamResults: Boolean(perms.canAddExamResults),
      canManageResources: key === 'canManageResources' ? !perms.canManageResources : Boolean(perms.canManageResources),
      canSelfAssignWork: Boolean(perms.canSelfAssignWork),
    });
  };

  const handleAddResource = (e) => {
    e.preventDefault();
    if (!resTitle.trim()) return;
    createResourceMutation.mutate(
      {
        subjectId: null,
        title: resTitle.trim(),
        resourceType: resType,
        urlOrAuthor: resUrl.trim() || null,
        totalUnits: resTotalItems ? parseInt(resTotalItems, 10) : 0,
        completedUnits: 0,
      },
      {
        onSuccess: () => {
          setResTitle('');
          setResUrl('');
          setResTotalItems('');
        },
      }
    );
  };

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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Card title="Müfredat & Konu Takibi" className={styles.notesCard}>
        {student && (
          <div
            style={{
              display: 'flex',
              gap: 16,
              flexWrap: 'wrap',
              padding: '10px 12px',
              marginBottom: 14,
              borderRadius: 8,
              background: 'var(--bg-app)',
              border: '1px solid var(--border-color)',
              alignItems: 'center',
            }}
          >
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-primary)' }}>🛡️ Hızlı Yetki:</span>
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.82rem', cursor: 'pointer' }}>
              <input
                type="checkbox"
                data-testid="quick-perm-canCompleteTopics"
                checked={Boolean(perms.canCompleteTopics)}
                disabled={updatePermsMutation.isPending}
                onChange={() => handleTogglePerm('canCompleteTopics')}
              />
              <span>Öğrenci konuları tamamlandı işaretleyebilsin</span>
            </label>
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.82rem', cursor: 'pointer' }}>
              <input
                type="checkbox"
                data-testid="quick-perm-canManageResources"
                checked={Boolean(perms.canManageResources)}
                disabled={updatePermsMutation.isPending}
                onChange={() => handleTogglePerm('canManageResources')}
              />
              <span>Öğrenci kaynak / video ders ekleyebilsin</span>
            </label>
          </div>
        )}

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16, alignItems: 'center' }}>
          {onSelectGrade && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-color-muted)' }}>Sınıf Müfredatı:</span>
              <select
                value={selectedGrade ?? ''}
                onChange={(e) => onSelectGrade(e.target.value ? Number(e.target.value) : null)}
                data-testid="topics-grade-filter"
                style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid var(--border-color)', fontSize: '0.85rem' }}
              >
                <option value="">
                  Aktif Sınıf ({student?.grade === 13 ? 'Mezun' : `${student?.grade || 12}. Sınıf`})
                </option>
                {[6, 7, 8, 9, 10, 11, 12, 13].map((g) => (
                  <option key={g} value={g}>
                    {g === 13 ? 'Mezun (YKS)' : `${g}. Sınıf Müfredatı`}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-color-muted)' }}>Ders:</span>
            <select
              value={topicSubjectFilter}
              onChange={(e) => setTopicSubjectFilter(e.target.value)}
              style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid var(--border-color)', fontSize: '0.85rem' }}
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
              style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid var(--border-color)', fontSize: '0.85rem' }}
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
              <div key={subj} style={{ border: '1px solid var(--border-color)', borderRadius: 8, padding: 12, background: 'var(--bg-app)' }}>
                <h4 style={{ margin: '0 0 10px', color: 'var(--color-primary)', fontSize: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: 6 }}>
                  {subj}
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {Object.entries(units).map(([unit, topics]) => (
                    <div key={unit} style={{ background: 'var(--bg-card)', borderRadius: 6, padding: '8px 10px', border: '1px solid var(--border-color)' }}>
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
                                borderBottom: '1px solid var(--border-color)',
                                flexWrap: 'wrap',
                                gap: 8,
                              }}
                            >
                              <span
                                onClick={() =>
                                  toggleTopicMutation.mutate({
                                    topicId: t.id,
                                    isCompleted: !t.isCompleted,
                                  })
                                }
                                title="Konu tamamlanma durumunu değiştir"
                                style={{ display: 'inline-flex', alignItems: 'center', gap: 8, minWidth: '180px', flex: 1, cursor: 'pointer' }}
                              >
                                {t.isCompleted ? <CheckCircle2 size={16} color="#16a34a" /> : <Square size={16} color="#94a3b8" />}
                                <span style={{ fontSize: '0.9rem', fontWeight: 500, textDecoration: t.isCompleted ? 'line-through' : 'none' }}>
                                  {t.topicName}
                                </span>
                                {t.completedByStudent && (
                                  <span
                                    style={{
                                      fontSize: '0.68rem',
                                      padding: '1px 6px',
                                      borderRadius: 999,
                                      background: 'rgba(59,130,246,0.12)',
                                      color: '#2563eb',
                                      fontWeight: 600,
                                    }}
                                  >
                                    👤 Öğrenci
                                  </span>
                                )}
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

      <Card title="📚 Öğrencinin Bireysel Kaynakları & Video Dersleri" className={styles.notesCard}>
        <form
          onSubmit={handleAddResource}
          style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: 14 }}
        >
          <div style={{ flex: 2, minWidth: 160 }}>
            <Input
              label="Kaynak / Video Başlığı"
              placeholder="Örn: 3D TYT Matematik Soru Bankası"
              value={resTitle}
              onChange={(e) => setResTitle(e.target.value)}
            />
          </div>
          <div style={{ minWidth: 130 }}>
            <select
              value={resType}
              onChange={(e) => setResType(e.target.value)}
              style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border-color)', fontSize: '0.85rem' }}
            >
              <option value="BOOK">📕 Soru Bankası / Kitap</option>
              <option value="VIDEO">🎬 Video Ders / Kamp</option>
              <option value="DOCUMENT">📄 Fasikül / Not</option>
              <option value="LINK">🔖 Diğer / Link</option>
            </select>
          </div>
          <div style={{ flex: 1, minWidth: 140 }}>
            <Input
              label="Video/Kaynak Linki (Opsiyonel)"
              placeholder="https://..."
              value={resUrl}
              onChange={(e) => setResUrl(e.target.value)}
            />
          </div>
          <div style={{ width: 110 }}>
            <Input
              label="Toplam Test/Video"
              type="number"
              placeholder="0"
              value={resTotalItems}
              onChange={(e) => setResTotalItems(e.target.value)}
            />
          </div>
          <Button type="submit" variant="primary" size="sm" data-testid="coach-add-resource-btn" disabled={createResourceMutation.isPending}>
            + Kaynak Ekle
          </Button>
        </form>

        {resources.length === 0 ? (
          <p style={{ color: 'var(--text-color-muted)', fontSize: '0.85rem' }}>
            Henüz kaynak veya video ders eklenmemiş.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {resources.map((r) => (
              <div
                key={r.id}
                data-testid={`coach-resource-row-${r.id}`}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '8px 10px',
                  borderRadius: 8,
                  border: '1px solid var(--border-color)',
                  background: 'var(--bg-app)',
                  gap: 10,
                  flexWrap: 'wrap',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <strong style={{ fontSize: '0.88rem' }}>{r.title}</strong>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-color-muted)' }}>({r.resourceType})</span>
                  {r.createdBy === 'Student' && (
                    <span
                      style={{
                        fontSize: '0.68rem',
                        padding: '1px 6px',
                        borderRadius: 999,
                        background: 'rgba(59,130,246,0.12)',
                        color: '#2563eb',
                        fontWeight: 600,
                      }}
                    >
                      👤 Öğrenci Ekledi
                    </span>
                  )}
                  {r.urlOrAuthor && (
                    <a
                      href={r.urlOrAuthor}
                      target="_blank"
                      rel="noreferrer"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: '0.78rem', color: 'var(--color-primary)' }}
                    >
                      <ExternalLink size={13} /> Aç
                    </a>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  {r.totalUnits > 0 && (
                    <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-color-muted)' }}>
                      İlerleme: {r.completedUnits}/{r.totalUnits}
                    </span>
                  )}
                  <Button
                    variant="ghost"
                    size="xs"
                    iconOnly
                    data-testid={`coach-delete-resource-btn-${r.id}`}
                    onClick={() => deleteResourceMutation.mutate({ resourceId: r.id })}
                    title="Kaynağı Sil"
                    style={{ color: '#ef4444' }}
                  >
                    <Trash2 size={15} />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

