import React from 'react';
import GradeReportDashboard from '../../../components/common/GradeReportDashboard/GradeReportDashboard';

export default function StudentReportsPage() {
  return (
    <div style={{ padding: '16px', maxWidth: 1200, margin: '0 auto' }} data-testid="student-reports-page">
      <header style={{ marginBottom: 16 }}>
        <h1 style={{ margin: '0 0 4px 0', fontSize: '1.35rem', fontWeight: 800 }}>
          Raporum & Sınıf Gelişim Karnem
        </h1>
        <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--text-color-muted, #64748b)' }}>
          Sınıf düzeyine özel koçluk karneni, ders bazlı hedef-net farklarını ve geçmiş sınıf arşivini incele.
        </p>
      </header>

      <GradeReportDashboard selfMode />
    </div>
  );
}

