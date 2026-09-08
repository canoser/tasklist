import React, { useState } from 'react';
import CoachDashboard from './CoachDashboard';
import StudentList from './StudentList';
import PaymentsPanel from './PaymentsPanel';
import SharedLinksPanel from './SharedLinksPanel';
import StudentMobileDashboard from './StudentMobileDashboard';
import StudentDetailPanel from './StudentDetail/StudentDetailPanel';

export default function CoachingScreen({ user, tone }) {
  const [activeView, setActiveView] = useState('dashboard');
  const [selectedStudent, setSelectedStudent] = useState(null);

  const handleSelectStudent = (student) => {
    setSelectedStudent(student);
    setActiveView('studentDetail');
  };

  // Basit Rol kontrolü (Gelecekte user.role veya JWT claim'den alınacak)
  const isStudent = user && (user.role === 'Student' || user.isStudent === true);

  if (isStudent) {
    return <StudentMobileDashboard user={user} tone={tone} />;
  }

  return (
    <div style={{ padding: '20px', color: '#fff', display: 'flex', flexDirection: 'column', gap: '1rem', height: '100%' }}>
      <nav style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem' }}>
        <button 
          onClick={() => setActiveView('dashboard')}
          style={{ background: 'transparent', border: 'none', color: activeView === 'dashboard' ? '#4facfe' : '#ccc', cursor: 'pointer', fontWeight: activeView === 'dashboard' ? 'bold' : 'normal' }}
        >
          Dashboard
        </button>
        <button 
          onClick={() => { setActiveView('students'); setSelectedStudent(null); }}
          style={{ background: 'transparent', border: 'none', color: activeView === 'students' ? '#4facfe' : '#ccc', cursor: 'pointer', fontWeight: activeView === 'students' ? 'bold' : 'normal' }}
        >
          Öğrenciler
        </button>
        <button 
          onClick={() => { setActiveView('payments'); setSelectedStudent(null); }}
          style={{ background: 'transparent', border: 'none', color: activeView === 'payments' ? '#4facfe' : '#ccc', cursor: 'pointer', fontWeight: activeView === 'payments' ? 'bold' : 'normal' }}
        >
          Ödemeler
        </button>
        <button 
          onClick={() => { setActiveView('sharedlinks'); setSelectedStudent(null); }}
          style={{ background: 'transparent', border: 'none', color: activeView === 'sharedlinks' ? '#4facfe' : '#ccc', cursor: 'pointer', fontWeight: activeView === 'sharedlinks' ? 'bold' : 'normal' }}
        >
          Paylaşım
        </button>
        {selectedStudent && (
          <button 
            onClick={() => setActiveView('studentDetail')}
            style={{ background: 'transparent', border: 'none', color: activeView === 'studentDetail' ? '#4facfe' : '#ccc', cursor: 'pointer', fontWeight: activeView === 'studentDetail' ? 'bold' : 'normal' }}
          >
            {selectedStudent.firstName} Detay
          </button>
        )}
      </nav>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        {activeView === 'dashboard' && <CoachDashboard user={user} tone={tone} />}
        {activeView === 'students' && <StudentList tone={tone} onSelectStudent={handleSelectStudent} />}
        {activeView === 'payments' && <PaymentsPanel tone={tone} />}
        {activeView === 'sharedlinks' && <SharedLinksPanel tone={tone} />}
        {activeView === 'studentDetail' && selectedStudent && (
          <StudentDetailPanel student={selectedStudent} tone={tone} />
        )}
      </div>
    </div>
  );
}
