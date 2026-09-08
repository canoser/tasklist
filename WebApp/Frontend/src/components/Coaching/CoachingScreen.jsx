import React, { useState } from 'react';
import CoachDashboard from './CoachDashboard';

export default function CoachingScreen({ user, tone }) {
  // Simple tab state for the screen
  const [activeView, setActiveView] = useState('dashboard');

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
          onClick={() => setActiveView('students')}
          style={{ background: 'transparent', border: 'none', color: activeView === 'students' ? '#4facfe' : '#ccc', cursor: 'pointer', fontWeight: activeView === 'students' ? 'bold' : 'normal' }}
        >
          Öğrenciler
        </button>
      </nav>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        {activeView === 'dashboard' && <CoachDashboard user={user} tone={tone} />}
        {activeView === 'students' && <div>Öğrenci Listesi Yapım Aşamasında</div>}
      </div>
    </div>
  );
}
