import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import styles from './StudentList.module.css';
import { getMyStudents } from '../../services/coachingApi';
import signalrService from '../../services/signalrService';

export default function StudentList({ tone, onSelectStudent }) {
  const { t } = useTranslation('coaching');
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchStudents = async () => {
      try {
        const data = await getMyStudents();
        setStudents(data);
      } catch (err) {
        console.error('Error fetching students:', err);
        setError('Öğrenciler yüklenirken bir hata oluştu.');
      } finally {
        setLoading(false);
      }
    };

    fetchStudents();

    // Dinamik güncellemeler (SignalR) - Faz 1
    const handleTaskAssigned = (e) => {
      // Refresh logic or targeted update
      fetchStudents();
    };

    signalrService.addEventListener('CoachingTaskAssigned', handleTaskAssigned);

    return () => {
      signalrService.removeEventListener('CoachingTaskAssigned', handleTaskAssigned);
    };
  }, []);

  if (loading) return <div className={styles.loading}>Öğrenciler yükleniyor...</div>;
  if (error) return <div className={styles.error}>{error}</div>;

  return (
    <div className={styles.listContainer}>
      <div className={styles.header}>
        <h2 className={styles.title}>Öğrencilerim</h2>
        <button className={styles.addButton}>+ Öğrenci Ekle</button>
      </div>

      {students.length === 0 ? (
        <p className={styles.empty}>Henüz kayıtlı öğrenciniz bulunmuyor.</p>
      ) : (
        <div className={styles.grid}>
          {students.map(student => (
            <div key={student.id} className={styles.card} onClick={() => onSelectStudent(student)}>
              <div className={styles.cardHeader}>
                <div className={styles.avatar}>
                  {student.firstName ? student.firstName.charAt(0) : '?'}
                </div>
                <div>
                  <h3 className={styles.name}>{student.firstName} {student.lastName}</h3>
                  <p className={styles.grade}>{student.gradeLevel || 'Sınıf Belirtilmemiş'}</p>
                </div>
              </div>
              <div className={styles.cardBody}>
                <div className={styles.stat}>
                  <span>Son Seri:</span>
                  <strong>{student.currentStreak}</strong>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
