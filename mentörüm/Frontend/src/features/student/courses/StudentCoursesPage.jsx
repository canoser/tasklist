import React, { useState } from 'react';
import { useStudentCourses, useStudentCourseResources, useUpdateResourceProgress } from '../studentSchoolApi';
import { useStudentCurriculum } from '../studentApi';
import Card from '../../../components/common/Card/Card';
import Button from '../../../components/common/Button/Button';
import { 
  BookOpen, 
  FileText, 
  Video, 
  CheckCircle2, 
  Circle, 
  ArrowLeft, 
  ExternalLink, 
  ChevronRight, 
  Layers, 
  Target 
} from 'lucide-react';
import { useDownloadUrl } from '../../storage/storageApi';
import styles from './StudentCoursesPage.module.css';

const StudentCoursesPage = () => {
  const [activeTab, setActiveTab] = useState('courses'); // 'courses' | 'curriculum'
  
  // Dersler ve Kaynaklar
  const { data: courses, isLoading: coursesLoading } = useStudentCourses();
  const [selectedCourse, setSelectedCourse] = useState(null);
  const { data: resources, isLoading: resourcesLoading } = useStudentCourseResources(selectedCourse?.id);
  const updateProgress = useUpdateResourceProgress();
  const download = useDownloadUrl();

  // Müfredat & Konu Takibi (Profil'den taşındı)
  const { data: curriculum = [], isLoading: curriculumLoading } = useStudentCurriculum();
  const [subjectFilter, setSubjectFilter] = useState('ALL');

  // Konu takibi istatistikleri
  const totalTopics = curriculum?.length || 0;
  const completedTopics = curriculum?.filter((t) => t.isCompleted)?.length || 0;
  const completionPct = totalTopics > 0 ? Math.round((completedTopics / totalTopics) * 100) : 0;

  // Mevcut ders isimleri (Filtreleme için)
  const availableSubjects = Array.from(new Set(curriculum.map((t) => t.subjectName).filter(Boolean)));
  const filteredTopics = subjectFilter === 'ALL' 
    ? curriculum 
    : curriculum.filter((t) => t.subjectName === subjectFilter);

  // Kaynak tamamlama (Tik atma / kaldırma)
  const handleToggleResourceDone = async (r) => {
    const isCurrentlyDone = r.isDone || (r.progress || 0) >= 100;
    const nextDone = !isCurrentlyDone;
    try {
      await updateProgress.mutateAsync({
        resourceId: r.id,
        data: {
          progress: nextDone ? 100 : 0,
          isDone: nextDone,
        },
      });
    } catch {
      alert('İlerleme güncellenemedi.');
    }
  };

  // Belge veya video açma
  const handleOpenResource = async (r) => {
    if (r.uploadId) {
      try {
        const res = await download.mutateAsync(r.uploadId);
        window.open(res.url, '_blank', 'noopener');
      } catch {
        alert('Dosya açılamadı.');
      }
    } else if (r.resourceRef) {
      window.open(r.resourceRef, '_blank', 'noopener');
    }
  };

  const isVideoResource = (r) => {
    const text = `${r.title || ''} ${r.resourceRef || ''}`.toLowerCase();
    return text.includes('video') || text.includes('izle') || text.includes('youtube') || text.includes('vimeo');
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>Derslerim & Müfredat</h1>
        <p className={styles.subtitle}>
          Kayıtlı derslerini incele, video ve kaynak belgelerini tamamla, müfredat konularındaki ilerlemeni takip et.
        </p>
      </header>

      {/* ── ÜST SEKME NAVİGASYONU ── */}
      <div className={styles.topTabs}>
        <button
          type="button"
          className={`${styles.topTabBtn} ${activeTab === 'courses' ? styles.topTabBtnActive : ''}`}
          onClick={() => setActiveTab('courses')}
        >
          <BookOpen size={16} />
          <span>Derslerim, Kaynaklar & Video Dersler</span>
        </button>

        <button
          type="button"
          className={`${styles.topTabBtn} ${activeTab === 'curriculum' ? styles.topTabBtnActive : ''}`}
          onClick={() => setActiveTab('curriculum')}
        >
          <Target size={16} />
          <span>Müfredat & Konu Takibi ({completedTopics}/{totalTopics})</span>
        </button>
      </div>

      {/* ════════════════════════════════════════════════════════════
          1. SEKME: DERSLERİM, KAYNAKLAR & VİDEO DERSLER
          ════════════════════════════════════════════════════════════ */}
      {activeTab === 'courses' && (
        <div>
          {!selectedCourse ? (
            /* Ders Listesi */
            <div>
              {coursesLoading && <p style={{ fontSize: '0.85rem', color: 'var(--text-color-muted)' }}>Dersler yükleniyor...</p>}

              {(!courses || courses.length === 0) && !coursesLoading ? (
                <Card padding="lg" style={{ textAlign: 'center', color: 'var(--text-secondary)', background: 'var(--bg-color-surface)' }}>
                  <div style={{ display: 'inline-flex', padding: '14px', borderRadius: '50%', background: 'rgba(99, 102, 241, 0.1)', color: 'var(--color-primary)', marginBottom: '12px' }}>
                    <BookOpen size={28} />
                  </div>
                  <h3 style={{ margin: '0 0 6px', fontSize: '1.05rem', color: 'var(--text-primary)' }}>Kayıtlı Dersin Bulunmuyor</h3>
                  <p style={{ margin: 0, fontSize: '0.85rem' }}>Koçun veya okulun henüz sana bir ders atamamış. Atanan dersler, kaynaklar ve video dersler burada listelenecek.</p>
                </Card>
              ) : (
                <div className={styles.courseGrid}>
                  {courses?.map((c) => {
                    const typeLabel = c.type === 'OZEL_DERS' ? 'Bireysel Koçluk' : (c.type === 'DERS' ? 'Akademik Ders' : (c.type || 'Akademik Ders'));
                    return (
                      <div 
                        key={c.id} 
                        className={styles.courseCard} 
                        onClick={() => setSelectedCourse(c)}
                      >
                        <div className={styles.courseInfo}>
                          <div className={styles.courseIcon}>
                            <BookOpen size={20} />
                          </div>
                          <div>
                            <div className={styles.courseName}>{c.name}</div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px', flexWrap: 'wrap' }}>
                              <span className={styles.courseType}>{typeLabel}</span>
                              {c.teacherName && (
                                <span style={{ fontSize: '0.72rem', color: 'var(--text-color-muted)' }}>
                                  Öğretmen: {c.teacherName}
                                </span>
                              )}
                              {c.subjectName && c.subjectName !== c.name && (
                                <span style={{ fontSize: '0.72rem', color: 'var(--text-color-muted)' }}>
                                  ({c.subjectName})
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <ChevronRight size={18} color="var(--text-color-muted)" />
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            /* Seçili Dersin Kaynakları ve Video Dersleri */
            <div>
              <div className={styles.backBtnRow}>
                <Button 
                  size="sm" 
                  variant="ghost" 
                  onClick={() => setSelectedCourse(null)}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                >
                  <ArrowLeft size={15} /> Derslerime Dön
                </Button>
                <div className={styles.selectedCourseTitle}>{selectedCourse.name}</div>
              </div>

              {resourcesLoading && <p style={{ fontSize: '0.85rem', color: 'var(--text-color-muted)' }}>Kaynaklar yükleniyor...</p>}

              {(!resources || resources.length === 0) && !resourcesLoading ? (
                <Card padding="lg" style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
                  <p style={{ margin: 0, fontSize: '0.88rem' }}>Bu derse henüz eklenmiş kaynak belge veya video ders bulunmuyor.</p>
                </Card>
              ) : (
                <div className={styles.resourceList}>
                  {resources?.map((r) => {
                    const isVideo = isVideoResource(r);
                    const isDone = r.isDone || (r.progress || 0) >= 100;
                    return (
                      <div key={r.id} className={styles.resourceCard}>
                        <div className={styles.resourceHeader}>
                          <div className={styles.resourceLeft}>
                            <div 
                              className={styles.resourceIcon} 
                              style={{ 
                                background: isVideo ? 'rgba(239, 68, 68, 0.12)' : 'rgba(59, 130, 246, 0.12)', 
                                color: isVideo ? '#EF4444' : '#3B82F6' 
                              }}
                            >
                              {isVideo ? <Video size={17} /> : <FileText size={17} />}
                            </div>
                            <div>
                              <div className={styles.resourceTitle}>{r.title}</div>
                              <span style={{ fontSize: '0.72rem', color: 'var(--text-color-muted)' }}>
                                {isVideo ? 'Video Ders' : 'Çalışma Belgesi'}
                              </span>
                            </div>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {/* Aç / İndir / İzle Butonu */}
                            {(r.uploadId || r.resourceRef) && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleOpenResource(r)}
                                style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 8px', fontSize: '0.78rem' }}
                              >
                                {isVideo ? 'İzle' : 'Aç'} <ExternalLink size={12} />
                              </Button>
                            )}

                            {/* İnteraktif Tamamlandı Tik Butonu */}
                            <button
                              type="button"
                              className={styles.tickBtn}
                              onClick={() => handleToggleResourceDone(r)}
                              title={isDone ? 'Tamamlanmadı olarak işaretle' : 'Tamamlandı olarak işaretle'}
                            >
                              {isDone ? (
                                <>
                                  <CheckCircle2 size={20} style={{ color: 'var(--color-success, #10B981)' }} />
                                  <span className={styles.tickLabelDone}>Bitti</span>
                                </>
                              ) : (
                                <>
                                  <Circle size={20} style={{ color: 'var(--text-color-muted, #94A3B8)' }} />
                                  <span className={styles.tickLabelTodo}>Tamamla</span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>

                        {/* İlerleme Çubuğu */}
                        <div className={styles.progressBar}>
                          <div 
                            className={styles.progressFill} 
                            style={{ width: `${r.progress || (isDone ? 100 : 0)}%` }} 
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════
          2. SEKME: MÜFREDAT & KONU TAKİBİ (Profil'den taşındı)
          ════════════════════════════════════════════════════════════ */}
      {activeTab === 'curriculum' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* İlerleme Özeti Kartı */}
          <div className={styles.curriculumStats}>
            <div className={styles.statsRow}>
              <span style={{ fontWeight: 700, color: 'var(--text-color-main)' }}>Genel Müfredat İlerlemesi</span>
              <span style={{ fontWeight: 800, color: 'var(--color-primary, #10B981)' }}>
                %{completionPct} ({completedTopics}/{totalTopics} Konu)
              </span>
            </div>
            <div className={styles.progressBar} style={{ height: 8 }}>
              <div className={styles.progressFill} style={{ width: `${completionPct}%` }} />
            </div>
          </div>

          {/* Ders Filtreleme Hap Butonları */}
          {availableSubjects.length > 1 && (
            <div className={styles.subjectFilterBar}>
              <button
                type="button"
                className={`${styles.filterChip} ${subjectFilter === 'ALL' ? styles.filterChipActive : ''}`}
                onClick={() => setSubjectFilter('ALL')}
              >
                Tümü ({totalTopics})
              </button>
              {availableSubjects.map((sub) => {
                const count = curriculum.filter((t) => t.subjectName === sub).length;
                return (
                  <button
                    key={sub}
                    type="button"
                    className={`${styles.filterChip} ${subjectFilter === sub ? styles.filterChipActive : ''}`}
                    onClick={() => setSubjectFilter(sub)}
                  >
                    {sub} ({count})
                  </button>
                );
              })}
            </div>
          )}

          {/* Konu Listesi */}
          {curriculumLoading && <p style={{ fontSize: '0.85rem', color: 'var(--text-color-muted)' }}>Konular yükleniyor...</p>}

          {(!filteredTopics || filteredTopics.length === 0) && !curriculumLoading ? (
            <Card padding="lg" style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
              <p style={{ margin: 0, fontSize: '0.88rem' }}>Bu kategoriye ait müfredat konusu bulunamadı.</p>
            </Card>
          ) : (
            <div className={styles.topicList}>
              {filteredTopics.map((t) => (
                <div key={t.id} className={styles.topicCard}>
                  <div className={styles.topicLeft}>
                    {t.isCompleted ? (
                      <CheckCircle2 size={18} style={{ color: 'var(--color-success, #10B981)', flexShrink: 0 }} />
                    ) : (
                      <Circle size={18} style={{ color: 'var(--text-color-muted, #94A3B8)', flexShrink: 0 }} />
                    )}
                    <div>
                      <div className={styles.topicName}>{t.topicName}</div>
                      <div className={styles.topicMeta}>
                        {t.subjectName} {t.grade && `· ${t.grade}. Sınıf`} {t.unitName && `· ${t.unitName}`}
                      </div>
                    </div>
                  </div>

                  <span 
                    style={{ 
                      fontSize: '0.72rem', 
                      fontWeight: 700, 
                      padding: '3px 8px', 
                      borderRadius: 6,
                      background: t.isCompleted ? 'rgba(16, 185, 129, 0.12)' : 'rgba(255, 255, 255, 0.05)',
                      color: t.isCompleted ? '#10B981' : 'var(--text-color-muted)'
                    }}
                  >
                    {t.isCompleted ? 'Tamamlandı' : 'Devam Ediyor'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default StudentCoursesPage;
