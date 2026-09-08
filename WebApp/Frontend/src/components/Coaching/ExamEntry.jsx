import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import styles from './ExamEntry.module.css';
import { getStudentExams, createExam } from '../../services/coachingApi';

export default function ExamEntry({ studentId, tone }) {
  const { t } = useTranslation('coaching');
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Yeni sınav formu
  const [newExam, setNewExam] = useState({
    title: '',
    examType: 'TYT',
    examDate: new Date().toISOString().split('T')[0],
    totalCorrect: 0,
    totalIncorrect: 0,
    totalBlank: 0,
    netScore: 0
  });

  useEffect(() => {
    if (!studentId) return;
    
    const fetchExams = async () => {
      setLoading(true);
      try {
        const data = await getStudentExams(studentId);
        setExams(data);
      } catch (error) {
        console.error('Error fetching exams:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchExams();
  }, [studentId]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    let updatedExam = { ...newExam, [name]: value };
    
    // Net hesaplama
    if (['totalCorrect', 'totalIncorrect', 'totalBlank'].includes(name)) {
      const correct = parseInt(updatedExam.totalCorrect) || 0;
      const incorrect = parseInt(updatedExam.totalIncorrect) || 0;
      updatedExam.netScore = correct - (incorrect * 0.25);
    }
    
    setNewExam(updatedExam);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        studentProfileId: studentId,
        title: newExam.title,
        examType: newExam.examType,
        examDate: new Date(newExam.examDate).toISOString(),
        totalCorrect: parseInt(newExam.totalCorrect) || 0,
        totalIncorrect: parseInt(newExam.totalIncorrect) || 0,
        totalBlank: parseInt(newExam.totalBlank) || 0,
        netScore: parseFloat(newExam.netScore) || 0,
        subjects: [] // Basitleştirilmiş
      };
      
      const savedExam = await createExam(payload);
      setExams([savedExam, ...exams]);
      setNewExam({
        ...newExam,
        title: '',
        totalCorrect: 0,
        totalIncorrect: 0,
        totalBlank: 0,
        netScore: 0
      });
      alert('Sınav/Deneme sonucu başarıyla kaydedildi.');
    } catch (error) {
      console.error('Save exam error:', error);
      alert('Sınav kaydedilirken bir hata oluştu.');
    }
  };

  if (loading) return <div className={styles.loading}>Sınavlar yükleniyor...</div>;

  return (
    <div className={styles.examContainer}>
      <h3 className={styles.title}>Deneme / Sınav Sonuçları</h3>
      
      <form className={styles.examForm} onSubmit={handleSave}>
        <h4>Yeni Sonuç Ekle</h4>
        
        <div className={styles.formRow}>
          <div className={styles.formGroup}>
            <label>Başlık</label>
            <input type="text" name="title" value={newExam.title} onChange={handleInputChange} required placeholder="Örn: 3D TYT Deneme 1" />
          </div>
          <div className={styles.formGroup}>
            <label>Türü</label>
            <select name="examType" value={newExam.examType} onChange={handleInputChange}>
              <option value="TYT">TYT</option>
              <option value="AYT">AYT</option>
              <option value="YDT">YDT</option>
              <option value="SchoolExam">Okul Sınavı</option>
            </select>
          </div>
          <div className={styles.formGroup}>
            <label>Tarih</label>
            <input type="date" name="examDate" value={newExam.examDate} onChange={handleInputChange} required />
          </div>
        </div>
        
        <div className={styles.formRow}>
          <div className={styles.formGroup}>
            <label>Doğru</label>
            <input type="number" min="0" name="totalCorrect" value={newExam.totalCorrect} onChange={handleInputChange} required />
          </div>
          <div className={styles.formGroup}>
            <label>Yanlış</label>
            <input type="number" min="0" name="totalIncorrect" value={newExam.totalIncorrect} onChange={handleInputChange} required />
          </div>
          <div className={styles.formGroup}>
            <label>Boş</label>
            <input type="number" min="0" name="totalBlank" value={newExam.totalBlank} onChange={handleInputChange} required />
          </div>
          <div className={styles.formGroup}>
            <label>Net</label>
            <input type="number" step="0.25" name="netScore" value={newExam.netScore} readOnly className={styles.readOnlyInput} />
          </div>
        </div>
        
        <button type="submit" className={styles.submitBtn}>Kaydet</button>
      </form>
      
      <div className={styles.historySection}>
        <h4>Geçmiş Sonuçlar</h4>
        {exams.length === 0 ? (
          <p className={styles.emptyText}>Kayıtlı sınav sonucu bulunamadı.</p>
        ) : (
          <table className={styles.examTable}>
            <thead>
              <tr>
                <th>Tarih</th>
                <th>Başlık</th>
                <th>Tür</th>
                <th>D</th>
                <th>Y</th>
                <th>B</th>
                <th>Net</th>
              </tr>
            </thead>
            <tbody>
              {exams.map(exam => (
                <tr key={exam.id}>
                  <td>{new Date(exam.examDate).toLocaleDateString()}</td>
                  <td>{exam.title}</td>
                  <td>{exam.examType}</td>
                  <td>{exam.totalCorrect}</td>
                  <td>{exam.totalIncorrect}</td>
                  <td>{exam.totalBlank}</td>
                  <td className={styles.netScoreCell}>{exam.netScore}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
