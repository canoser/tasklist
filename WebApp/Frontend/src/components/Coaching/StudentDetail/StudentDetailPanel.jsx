import React, { useState } from 'react';
import styles from './StudentDetailPanel.module.css';
import WeeklySchedule from '../WeeklySchedule';
import ExamEntry from '../ExamEntry';
import PaymentsPanel from '../PaymentsPanel';

// Placeholder components for tabs not yet fully moved
const TasksTab = ({ student, tone }) => {
  return (
    <div className={styles.tabContent}>
      <h3>Görevler & Haftalık Plan</h3>
      <p>Öğrenciye atanmış aktif görevler ve yeni görev atama formu buraya eklenecek.</p>
    </div>
  );
};

const StatsTab = ({ student, tone }) => {
  return (
    <div className={styles.tabContent}>
      <h3>İstatistikler & Performans</h3>
      <p>Öğrencinin haftalık çalışma saatleri, net grafikleri ve gelişim analizi.</p>
    </div>
  );
};

export default function StudentDetailPanel({ student, tone }) {
  const [activeTab, setActiveTab] = useState('tasks');

  if (!student) return null;

  return (
    <div className={styles.panelContainer}>
      <div className={styles.header}>
        <div className={styles.studentInfo}>
          <h2>{student.firstName} {student.lastName}</h2>
          <p className={styles.grade}>{student.gradeLevel || 'Öğrenci'}</p>
        </div>
        <div className={styles.headerActions}>
          <button className={styles.whatsappBtn}>WhatsApp ile Ulaş</button>
        </div>
      </div>

      <div className={styles.tabsContainer}>
        <button 
          className={`${styles.tabBtn} ${activeTab === 'tasks' ? styles.active : ''}`}
          onClick={() => setActiveTab('tasks')}
        >
          Görevler
        </button>
        <button 
          className={`${styles.tabBtn} ${activeTab === 'stats' ? styles.active : ''}`}
          onClick={() => setActiveTab('stats')}
        >
          İstatistikler
        </button>
        <button 
          className={`${styles.tabBtn} ${activeTab === 'academic' ? styles.active : ''}`}
          onClick={() => setActiveTab('academic')}
        >
          Program
        </button>
        <button 
          className={`${styles.tabBtn} ${activeTab === 'exams' ? styles.active : ''}`}
          onClick={() => setActiveTab('exams')}
        >
          Sınavlar
        </button>
        <button 
          className={`${styles.tabBtn} ${activeTab === 'payments' ? styles.active : ''}`}
          onClick={() => setActiveTab('payments')}
        >
          Ödemeler
        </button>
      </div>

      <div className={styles.contentArea}>
        {activeTab === 'tasks' && <TasksTab student={student} tone={tone} />}
        {activeTab === 'stats' && <StatsTab student={student} tone={tone} />}
        {activeTab === 'academic' && (
          <div className={styles.tabContent}>
            <h3>Akademik Profil & Program</h3>
            <WeeklySchedule studentId={student.id} tone={tone} readOnly={false} />
          </div>
        )}
        {activeTab === 'exams' && (
          <div className={styles.tabContent}>
            <h3>Sınav Sonuçları</h3>
            <ExamEntry studentId={student.id} tone={tone} />
          </div>
        )}
        {activeTab === 'payments' && (
          <div className={styles.tabContent}>
            <h3>Ödemeler</h3>
            <PaymentsPanel tone={tone} studentId={student.id} />
          </div>
        )}
      </div>
    </div>
  );
}
