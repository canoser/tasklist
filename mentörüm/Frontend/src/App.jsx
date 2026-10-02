import { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './features/auth/authStore';
import { apiClient } from './api/apiClient';

import LoginPage from './features/auth/LoginPage';
import InviteAcceptPage from './features/auth/InviteAcceptPage';
import CoachLayout from './components/layout/CoachLayout/CoachLayout';
import StudentLayout from './components/layout/StudentLayout/StudentLayout';
import ParentLayout from './components/layout/ParentLayout/ParentLayout';
import CoachDashboard from './features/coach/dashboard/CoachDashboard';
import StudentHomework from './features/student/homework/StudentHomework';
import StudentHome from './features/student/home/StudentHome';
import CoachStudents from './features/coach/students/CoachStudents';
import CoachStudentDetail from './features/coach/student-detail/CoachStudentDetail';
import CalendarPage from './features/coach/calendar/CalendarPage';
import CoachReports from './features/coach/reports/CoachReports';
import ParentSummary from './features/parent/summary/ParentSummary';
import ParentHomework from './features/parent/homework/ParentHomework';
import ComingSoon from './components/common/Card/ComingSoon';

// Korumalı Route Bileşeni
const PrivateRoute = ({ children, allowedRoles }) => {
  const { user } = useAuthStore();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <div>Yetkisiz Erişim (403)</div>;
  }

  return children;
};

function App() {
  const { user, setAuth, clearAuth } = useAuthStore();
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      try {
        // App ilk açıldığında cookie'den refresh token ile oturum açmayı dene
        if (!user) {
          const response = await apiClient.post('/auth/refresh');
          // apiClient.js response interceptor'ı içindeki veriyi döndürüyor
          const data = response.data || response; // API yanıt formatına göre
          setAuth(data.user, data.accessToken);
        }
      } catch {
        // Oturum yok veya süresi dolmuş
        clearAuth();
      } finally {
        setIsInitializing(false);
      }
    };

    initAuth();
  }, [user, setAuth, clearAuth]);

  if (isInitializing) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>Yükleniyor...</div>;
  }

  return (
    <Router>
      <Routes>
        <Route path="/login" element={
          user ? (
            <Navigate to={
              user.role === 'Student' ? '/student/home' :
              user.role === 'Parent' ? '/parent/summary' :
              '/coach/dashboard'
            } replace />
          ) : <LoginPage />
        } />
        <Route path="/invite/:token" element={<InviteAcceptPage />} />
        
        {/* Koç Rotaları */}
        <Route 
          path="/coach" 
          element={
            <PrivateRoute allowedRoles={['Coach']}>
              <CoachLayout />
            </PrivateRoute>
          } 
        >
          <Route path="dashboard" element={<CoachDashboard />} />
          <Route path="students" element={<CoachStudents />} />
          <Route path="students/:id" element={<CoachStudentDetail />} />
          <Route path="calendar" element={<CalendarPage />} />
          <Route path="reports" element={<CoachReports />} />
        </Route>

        {/* Öğrenci Rotaları */}
        <Route 
          path="/student" 
          element={
            <PrivateRoute allowedRoles={['Student']}>
              <StudentLayout />
            </PrivateRoute>
          } 
        >
          <Route path="home" element={<StudentHome />} />
          <Route path="homework" element={<StudentHomework />} />
          <Route path="calendar" element={<ComingSoon title="Ders Takvimi" icon="📅" />} />
          <Route path="profile" element={<ComingSoon title="Kullanıcı Profili" icon="👤" />} />
        </Route>

        {/* Veli Rotaları */}
        <Route 
          path="/parent" 
          element={
            <PrivateRoute allowedRoles={['Parent']}>
              <ParentLayout />
            </PrivateRoute>
          } 
        >
          <Route path="summary" element={<ParentSummary />} />
          <Route path="homework" element={<ParentHomework />} />
          <Route path="calendar" element={<ComingSoon title="Takvim" icon="📅" />} />
        </Route>

        {/* Ana sayfa yönlendirmesi */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        
        {/* 404 Catch All */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
