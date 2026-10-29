import { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './features/auth/authStore';
import { apiClient } from './api/apiClient';

import LoginPage from './features/auth/LoginPage';
import ResetPasswordPage from './features/auth/ResetPasswordPage';
import InviteAcceptPage from './features/auth/InviteAcceptPage';
import CoachLayout from './components/layout/CoachLayout/CoachLayout';
import StudentLayout from './components/layout/StudentLayout/StudentLayout';
import ParentLayout from './components/layout/ParentLayout/ParentLayout';
import TeacherLayout from './components/layout/TeacherLayout/TeacherLayout';
import CoachDashboard from './features/coach/dashboard/CoachDashboard';
import StudentHomework from './features/student/homework/StudentHomework';
import StudentCalendarPage from './features/student/calendar/StudentCalendarPage';
import StudentHome from './features/student/home/StudentHome';
import CoachStudents from './features/coach/students/CoachStudents';
import CoachStudentDetail from './features/coach/student-detail/CoachStudentDetail';
import CalendarPage from './features/coach/calendar/CalendarPage';
import CoachReports from './features/coach/reports/CoachReports';
import ParentSummary from './features/parent/summary/ParentSummary';
import ParentHomework from './features/parent/homework/ParentHomework';
import ParentCalendarPage from './features/parent/calendar/ParentCalendarPage';
import CoachProgramsPage from './features/coach/programs/CoachProgramsPage';
import CoachTeachersPage from './features/coach/teachers/CoachTeachersPage';
import CoachCoursesPage from './features/coach/courses/CoachCoursesPage';
import CoachCourseDetailPage from './features/coach/courses/CoachCourseDetailPage';
import CoachGroupsPage from './features/coach/groups/CoachGroupsPage';
import CoachProgramSettingsPage from './features/coach/settings/CoachProgramSettingsPage';
import WeeklySchedulePage from './features/coach/schedule/WeeklySchedulePage';
import AdminPanelPage from './features/admin/AdminPanelPage';
import StudentSchedulePage from './features/student/schedule/StudentSchedulePage';
import StudentCoursesPage from './features/student/courses/StudentCoursesPage';
import ParentSchedulePage from './features/parent/schedule/ParentSchedulePage';
import ParentExamsPage from './features/parent/exams/ParentExamsPage';
import ParentPaymentsPage from './features/parent/payments/ParentPaymentsPage';
import TeacherCoursesPage from './features/teacher/courses/TeacherCoursesPage';
import TeacherSchedulePage from './features/teacher/schedule/TeacherSchedulePage';
import TeacherProfilePage from './features/teacher/profile/TeacherProfilePage';
import StudentProfilePage from './features/student/profile/StudentProfilePage';
import StudentThemePage from './features/student/theme/StudentThemePage';
import CoachTeacherDetailPage from './features/coach/teachers/CoachTeacherDetailPage';
import CoachProfilePage from './features/coach/profile/CoachProfilePage';
import ApprovalsPage from './features/coach/approvals/ApprovalsPage';
import CoachPaymentsPage from './features/coach/payments/CoachPaymentsPage';
import CoachAuditLogsPage from './features/coach/audit/CoachAuditLogsPage';
import ViewAsBanner from './components/common/ViewAsBanner/ViewAsBanner';
import ThemeSync from './components/common/ThemeSync/ThemeSync';
import StoragePage from './features/storage/StoragePage';
import ErrorBoundary from './components/common/ErrorBoundary/ErrorBoundary';

// Korumalı Route Bileşeni
const PrivateRoute = ({ children, allowedRoles, requireAdmin }) => {
  const { user, viewAs } = useAuthStore();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (requireAdmin && !user.isAdmin) {
    return <Navigate to="/coach/dashboard" replace />;
  }

  // Koç, "Gözüyle Gör" aktifken hedef rolün rotalarına erişebilir (salt-okunur önizleme).
  const effectiveRole = (user.role === 'Coach' || user.role === 'Admin') && viewAs
    ? viewAs.role
    : user.role;

  if (allowedRoles && !allowedRoles.includes(effectiveRole)) {
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
        // App ilk açıldığında cookie'den refresh token ile oturum açmayı dene (yalnızca bir kez)
        const response = await apiClient.post('/auth/refresh', {});
        const data = response.data || response; // API yanıt formatına göre
        setAuth(data.user, data.accessToken);
      } catch {
        // Oturum yok veya süresi dolmuş
        clearAuth();
      } finally {
        setIsInitializing(false);
      }
    };

    initAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (isInitializing) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>Yükleniyor...</div>;
  }

  return (
    <Router>
      <ViewAsBanner />
      <ThemeSync />
      <ErrorBoundary>
        <Routes>
        <Route path="/login" element={
          user ? (
            <Navigate to={
              user.role === 'Student' ? '/student/home' :
              user.role === 'Parent' ? '/parent/summary' :
              user.role === 'Teacher' ? '/teacher/courses' :
              '/coach/dashboard'
            } replace />
          ) : <LoginPage />
        } />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/invite/:token" element={<InviteAcceptPage />} />
        
        {/* Koç Rotaları */}
        <Route 
          path="/coach" 
          element={
            <PrivateRoute allowedRoles={['Coach', 'Admin']}>
              <CoachLayout />
            </PrivateRoute>
          } 
        >
          <Route path="dashboard" element={<CoachDashboard />} />
          <Route path="students" element={<CoachStudents />} />
          <Route path="students/:id" element={<CoachStudentDetail />} />
          <Route path="calendar" element={<CalendarPage />} />
          <Route path="approvals" element={<ApprovalsPage />} />
          <Route path="teachers" element={<CoachTeachersPage />} />
          <Route path="teachers/:teacherId" element={<CoachTeacherDetailPage />} />
          <Route path="payments" element={<CoachPaymentsPage />} />
          <Route path="reports" element={<CoachReports />} />
          <Route path="profile" element={<CoachProfilePage />} />
          <Route path="programs" element={<CoachProgramsPage />} />
          <Route path="programs/:programId/teachers" element={<CoachTeachersPage />} />
          <Route path="programs/:programId/teachers/:teacherId" element={<CoachTeacherDetailPage />} />
          <Route path="programs/:programId/courses" element={<CoachCoursesPage />} />
          <Route path="programs/:programId/courses/:courseId" element={<CoachCourseDetailPage />} />
          <Route path="programs/:programId/groups" element={<CoachGroupsPage />} />
          <Route path="programs/:programId/schedule" element={<WeeklySchedulePage />} />
          <Route path="programs/:programId/settings" element={<CoachProgramSettingsPage />} />
          <Route path="audit-logs" element={<CoachAuditLogsPage />} />
          <Route path="programs/:programId/audit-logs" element={<CoachAuditLogsPage />} />
          <Route path="storage" element={<StoragePage />} />
          <Route path="admin" element={<PrivateRoute requireAdmin><AdminPanelPage /></PrivateRoute>} />
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
          <Route path="calendar" element={<StudentCalendarPage />} />
          <Route path="schedule" element={<StudentSchedulePage />} />
          <Route path="courses" element={<StudentCoursesPage />} />
          <Route path="profile" element={<StudentProfilePage />} />
          <Route path="theme" element={<StudentThemePage />} />
          <Route path="storage" element={<StoragePage />} />
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
          <Route path="calendar" element={<ParentCalendarPage />} />
          <Route path="schedule" element={<ParentSchedulePage />} />
          <Route path="exams" element={<ParentExamsPage />} />
          <Route path="payments" element={<ParentPaymentsPage />} />
        </Route>

        {/* Öğretmen Rotaları */}
        <Route 
          path="/teacher" 
          element={
            <PrivateRoute allowedRoles={['Teacher']}>
              <TeacherLayout />
            </PrivateRoute>
          } 
        >
          <Route path="courses" element={<TeacherCoursesPage />} />
          <Route path="schedule" element={<TeacherSchedulePage />} />
          <Route path="profile" element={<TeacherProfilePage />} />
          <Route path="storage" element={<StoragePage />} />
        </Route>

        {/* Ana sayfa yönlendirmesi */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        
        {/* 404 Catch All */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </ErrorBoundary>
  </Router>
);
}

export default App;
