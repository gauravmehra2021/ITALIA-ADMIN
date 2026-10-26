import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { AppLayout } from '../layouts/AppLayout';
import { AssessmentTakePage, AssessmentsPage } from '../pages/AssessmentsPage';
import { AiPage } from '../pages/AiPage';
import { ClassesPage } from '../pages/ClassesPage';
import { CourseDetailPage } from '../pages/CourseDetailPage';
import { CoursesPage } from '../pages/CoursesPage';
import { DashboardPage } from '../pages/DashboardPage';
import { EnquiriesPage } from '../pages/EnquiriesPage';
import { LandingPage } from '../pages/LandingPage';
import { LoginPage } from '../pages/LoginPage';
import {
  AdminPage,
  AuditPage,
  CertificatesPage,
  NotificationsPage,
  SubscriptionsPage,
  SupportPage,
  UsersPage,
} from '../pages/MiscPages';
import { ProgressPage } from '../pages/ProgressPage';
import type { ReactNode } from 'react';
import type { UserRole } from '../types';

function Protected({ children }: { children: ReactNode }) {
  const { token } = useAuth();
  if (!token) return <Navigate to="/login" replace />;
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
      <Route path="/" element={<LandingPage />} />
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
              <CourseDetailPage />
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
        <Route
          path="assessments"
          element={
            <RoleGate roles={['Mentor', 'Admin', 'SuperAdmin']}>
              <AssessmentsPage />
            </RoleGate>
          }
        />
        <Route
          path="assessments/:id"
          element={
            <RoleGate roles={['Mentor', 'Admin', 'SuperAdmin']}>
              <AssessmentTakePage />
            </RoleGate>
          }
        />
        <Route
          path="notifications"
          element={
            <RoleGate roles={['Mentor', 'Staff', 'Admin', 'SuperAdmin']}>
              <NotificationsPage />
            </RoleGate>
          }
        />
        <Route
          path="support"
          element={
            <RoleGate roles={['Staff', 'Admin', 'SuperAdmin']}>
              <SupportPage />
            </RoleGate>
          }
        />
        <Route
          path="subscriptions"
          element={
            <RoleGate roles={['Admin', 'SuperAdmin']}>
              <SubscriptionsPage />
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
            <RoleGate roles={['Admin', 'SuperAdmin']}>
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
