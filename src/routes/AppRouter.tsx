import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { AppLayout } from '../layouts/AppLayout';
import { AiPage } from '../pages/AiPage';
import { ClassesPage } from '../pages/ClassesPage';
import { CourseBuilderPage } from '../pages/CourseBuilderPage';
import { LessonEditorPage } from '../pages/LessonEditorPage';
import { CoursesPage } from '../pages/CoursesPage';
import { DashboardPage } from '../pages/DashboardPage';
import { EnquiriesPage } from '../pages/EnquiriesPage';
import { LoginPage } from '../pages/LoginPage';
import { AdminPage, CertificatesPage } from '../pages/MiscPages';
import { AuditPage } from '../pages/AuditPage';
import { NotificationsPage } from '../pages/NotificationsPage';
import { UsersPage } from '../pages/UsersPage';
import { StudentsPage } from '../pages/StudentsPage';
import { BatchesPage } from '../pages/BatchesPage';
import { ProgressPage } from '../pages/ProgressPage';
import { TranslationsPage } from '../pages/TranslationsPage';
import type { ReactNode } from 'react';
import { PANEL_ROLES, type UserRole } from '../types';

/** Signed in AND one of the four panel roles. Students never get into the admin panel. */
function Protected({ children }: { children: ReactNode }) {
  const { token, user } = useAuth();
  if (!token || !user || !PANEL_ROLES.includes(user.role)) return <Navigate to="/login" replace />;
  return children;
}

function RoleGate({ roles, children }: { roles: UserRole[]; children: ReactNode }) {
  const { hasRole } = useAuth();
  if (!hasRole(...roles)) return <Navigate to="/app" replace />;
  return children;
}

export function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/app" replace />} />
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/app"
        element={
          <Protected>
            <AppLayout />
          </Protected>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route
          path="enquiries"
          element={
            <RoleGate roles={['Staff', 'Admin', 'SuperAdmin']}>
              <EnquiriesPage />
            </RoleGate>
          }
        />
        <Route
          path="students"
          element={
            <RoleGate roles={['SuperAdmin', 'Admin', 'Staff', 'Mentor']}>
              <StudentsPage />
            </RoleGate>
          }
        />
        <Route
          path="batches"
          element={
            <RoleGate roles={['SuperAdmin', 'Admin', 'Staff', 'Mentor']}>
              <BatchesPage />
            </RoleGate>
          }
        />
        <Route
          path="courses"
          element={
            <RoleGate roles={['Mentor', 'Admin', 'SuperAdmin']}>
              <CoursesPage />
            </RoleGate>
          }
        />
        <Route
          path="courses/:id"
          element={
            <RoleGate roles={['Mentor', 'Admin', 'SuperAdmin']}>
              <CourseBuilderPage />
            </RoleGate>
          }
        />
        <Route
          path="courses/:id/lessons/:lessonId"
          element={
            <RoleGate roles={['Mentor', 'Admin', 'SuperAdmin']}>
              <LessonEditorPage />
            </RoleGate>
          }
        />
        <Route
          path="translations"
          element={
            <RoleGate roles={['Mentor', 'Admin', 'SuperAdmin']}>
              <TranslationsPage />
            </RoleGate>
          }
        />
        <Route
          path="classes"
          element={
            <RoleGate roles={['Mentor', 'Admin', 'SuperAdmin']}>
              <ClassesPage />
            </RoleGate>
          }
        />
        <Route path="assessments/*" element={<Navigate to="/app/courses" replace />} />
        <Route path="assessments" element={<Navigate to="/app/courses" replace />} />
        <Route
          path="notifications"
          element={
            <RoleGate roles={['Mentor', 'Admin', 'SuperAdmin']}>
              <NotificationsPage />
            </RoleGate>
          }
        />
        <Route
          path="admin"
          element={
            <RoleGate roles={['Admin', 'SuperAdmin']}>
              <AdminPage />
            </RoleGate>
          }
        />
        <Route
          path="users"
          element={
            <RoleGate roles={['SuperAdmin']}>
              <UsersPage />
            </RoleGate>
          }
        />
        <Route
          path="audit"
          element={
            <RoleGate roles={['SuperAdmin']}>
              <AuditPage />
            </RoleGate>
          }
        />
        <Route path="ai" element={<AiPage />} />
        <Route path="certificates" element={<CertificatesPage />} />
        <Route path="progress" element={<ProgressPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
