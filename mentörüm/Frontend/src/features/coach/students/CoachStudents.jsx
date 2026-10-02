import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '../../../components/common/Card/Card';
import Button from '../../../components/common/Button/Button';
import Input from '../../../components/common/Input/Input';
import styles from './CoachStudents.module.css';

// Mock data (API bağlanana kadar)
const MOCK_STUDENTS = [
  { id: 1, fullName: 'Ayşe Yılmaz', grade: '12. Sınıf', area: 'Sayısal', active: true, hwCompletion: 85, lastActive: '2 saat önce' },
  { id: 2, fullName: 'Mehmet Demir', grade: '11. Sınıf', area: 'Eşit Ağırlık', active: true, hwCompletion: 60, lastActive: '1 gün önce' },
  { id: 3, fullName: 'Zeynep Kaya', grade: '8. Sınıf', area: 'LGS', active: true, hwCompletion: 95, lastActive: '15 dk önce' },
  { id: 4, fullName: 'Can Yıldız', grade: '12. Sınıf', area: 'Sözel', active: false, hwCompletion: 10, lastActive: '2 hafta önce' }
];

const CoachStudents = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterGrade, setFilterGrade] = useState('all');
  const [filterActive, setFilterActive] = useState('active');

  const filteredStudents = MOCK_STUDENTS.filter(s => {
    const matchSearch = s.fullName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchGrade = filterGrade === 'all' || s.grade.includes(filterGrade);
    const matchActive = filterActive === 'all' || (filterActive === 'active' ? s.active : !s.active);
    return matchSearch && matchGrade && matchActive;
  });

  return (
    <div className={styles.pageContainer}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Öğrenciler</h1>
          <p className={styles.subtitle}>Tüm öğrencilerinizin performansını ve durumunu yönetin.</p>
        </div>
        <Button variant="primary" icon="➕">Yeni Öğrenci Ekle</Button>
      </header>

      {/* Filtreler */}
      <Card className={styles.filterCard}>
        <div className={styles.filterGrid}>
          <Input 
            placeholder="Öğrenci ara..." 
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)} 
          />
          <select 
            className={styles.select}
            value={filterGrade} 
            onChange={(e) => setFilterGrade(e.target.value)}
          >
            <option value="all">Tüm Sınıflar</option>
            <option value="8">8. Sınıf (LGS)</option>
            <option value="11">11. Sınıf</option>
            <option value="12">12. Sınıf (YKS)</option>
          </select>
          <select 
            className={styles.select}
            value={filterActive} 
            onChange={(e) => setFilterActive(e.target.value)}
          >
            <option value="active">Sadece Aktifler</option>
            <option value="inactive">Pasifler</option>
            <option value="all">Tümü</option>
          </select>
        </div>
      </Card>

      {/* Öğrenci Listesi (Grid) */}
      <div className={styles.studentsGrid}>
        {filteredStudents.map(student => (
          <Card key={student.id} interactive className={styles.studentCard}>
            <div className={styles.cardHeader}>
              <div className={styles.avatar}>
                {student.fullName.charAt(0)}
              </div>
              <div className={styles.studentMeta}>
                <h3 className={styles.studentName}>{student.fullName}</h3>
                <span className={styles.studentDetail}>{student.grade} • {student.area}</span>
              </div>
              <div className={`${styles.statusBadge} ${student.active ? styles.active : styles.inactive}`}>
                {student.active ? 'Aktif' : 'Pasif'}
              </div>
            </div>

            <div className={styles.cardBody}>
              <div className={styles.statRow}>
                <span>Ödev Tamamlama</span>
                <span className={styles.statValue}>%{student.hwCompletion}</span>
              </div>
              <div className={styles.progressBar}>
                <div 
                  className={styles.progressFill} 
                  style={{ 
                    width: `${student.hwCompletion}%`,
                    backgroundColor: student.hwCompletion > 80 ? '#22c55e' : student.hwCompletion > 50 ? '#f59e0b' : '#ef4444' 
                  }}
                />
              </div>
              <div className={styles.statRow}>
                <span className={styles.lastActive}>Son giriş: {student.lastActive}</span>
              </div>
            </div>

            <div className={styles.cardFooter}>
              <Button variant="ghost" size="sm" onClick={() => navigate(`/coach/students/${student.id}`)}>Profili Gör</Button>
              <Button variant="secondary" size="sm">Ödev Ata</Button>
            </div>
          </Card>
        ))}
      </div>
      
      {filteredStudents.length === 0 && (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>🔍</div>
          <h3>Öğrenci Bulunamadı</h3>
          <p>Arama kriterlerinize uyan bir öğrenci yok.</p>
        </div>
      )}
    </div>
  );
};

export default CoachStudents;
