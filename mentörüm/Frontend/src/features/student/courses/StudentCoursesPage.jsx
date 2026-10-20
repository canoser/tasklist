import React, { useState } from 'react';
import { useStudentCourses, useStudentCourseResources, useUpdateResourceProgress } from '../studentSchoolApi';
import Card from '../../../components/common/Card/Card';
import Button from '../../../components/common/Button/Button';
import { BookOpen, FileText } from 'lucide-react';
import { useDownloadUrl } from '../../storage/storageApi';
import styles from './StudentCoursesPage.module.css';

const StudentCoursesPage = () => {
  const { data: courses, isLoading } = useStudentCourses();
  const [selectedCourse, setSelectedCourse] = useState(null);
  const { data: resources } = useStudentCourseResources(selectedCourse);
  const updateProgress = useUpdateResourceProgress();
  const download = useDownloadUrl();

  const handleProgress = (resourceId, progress) => {
    updateProgress.mutateAsync({ resourceId, data: { progress, isDone: progress >= 100 } });
  };

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Derslerim</h1>
      {isLoading && <p>Yükleniyor...</p>}

      {!selectedCourse ? (
        <div className={styles.list}>
          {(!courses || courses.length === 0) ? (
            <Card padding="lg" style={{ textAlign: 'center', color: 'var(--text-secondary)', background: 'var(--bg-color-surface)' }}>
              <div style={{ display: 'inline-flex', padding: '14px', borderRadius: '50%', background: 'rgba(99, 102, 241, 0.1)', color: 'var(--color-primary)', marginBottom: '12px' }}>
                <BookOpen size={28} />
              </div>
              <h3 style={{ margin: '0 0 6px', fontSize: '1.05rem', color: 'var(--text-primary)' }}>Kayıtlı Dersin Bulunmuyor</h3>
              <p style={{ margin: 0, fontSize: '0.85rem' }}>Koçun veya okulun henüz sana bir ders atamamış. Atanan dersler ve kaynaklar burada listelenecek.</p>
            </Card>
          ) : (
            courses.map((c) => (
              <Card key={c.id} className={styles.card} padding="md" onClick={() => setSelectedCourse(c.id)}>
                <strong>{c.name}</strong>
                <span className={styles.type}>{c.type}</span>
              </Card>
            ))
          )}
        </div>
      ) : (
        <div>
          <Button size="sm" variant="outline" onClick={() => setSelectedCourse(null)}>← Geri</Button>
          <div className={styles.resList}>
            {resources?.map((r) => (
              <Card key={r.id} className={styles.card} padding="md">
                <strong>{r.title}</strong>
                {r.uploadId && (
                  <div style={{ marginTop: '6px' }}>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={async () => {
                        try {
                          const res = await download.mutateAsync(r.uploadId);
                          window.open(res.url, '_blank', 'noopener');
                        } catch {
                          alert('Dosya açılamadı.');
                        }
                      }}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 8px', fontSize: '0.8rem' }}
                    >
                      <FileText size={14} />
                      <span>Belgeyi Aç / İndir ↗</span>
                    </Button>
                  </div>
                )}
                <div className={styles.progressBar}>
                  <div className={styles.progressFill} style={{ width: `${r.progress || 0}%` }} />
                </div>
                <div className={styles.actions}>
                  <span className={styles.pct}>{r.progress || 0}%</span>
                  <Button size="sm" onClick={() => handleProgress(r.id, 100)} disabled={(r.progress || 0) >= 100}>Tamamlandı</Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentCoursesPage;
