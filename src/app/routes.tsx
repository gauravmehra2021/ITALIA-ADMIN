import { createBrowserRouter, Navigate } from 'react-router';
import ProtectedRoute from './components/ProtectedRoute';
import PublicRoute from './components/PublicRoute';
import DashboardLayout from './layouts/DashboardLayout';
import Login from './pages/auth/Login';
import ForgotPassword from './pages/auth/ForgotPassword';
import ResetPassword from './pages/auth/ResetPassword';
import Dashboard from './pages/Dashboard';
import Inquiries from './pages/Inquiries';
import InquiryDetail from './pages/InquiryDetail';
import Employees from './pages/Employees';
import Account from './pages/Account';
import Visitors from './pages/Visitors';
import VerifyOtp from './pages/auth/Verifyotp';
import { useAuth } from './contexts/AuthContext';

function RoleRedirect() {
  const { user } = useAuth();
  return <Navigate to={user?.role === 'employee' ? '/inquiries' : '/dashboard'} replace />;
}

function AdminOnlyRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  if (user?.role === 'employee') return <Navigate to="/inquiries" replace />;
  return <>{children}</>;
}

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Navigate to="/login" replace />,
  },
  {
    path: '/login',
    element: (
      <PublicRoute>
        <Login />
      </PublicRoute>
    ),
  },
  {
    path: '/forgot-password',
    element: (
      <PublicRoute>
        <ForgotPassword />
      </PublicRoute>
    ),
  },
  {
    path: '/verify-otp',
    element: (
      <PublicRoute>
        <VerifyOtp />
      </PublicRoute>
    ),
  },
  {
    path: '/reset-password',
    element: (
      <PublicRoute>
        <ResetPassword />
      </PublicRoute>
    ),
  },
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <DashboardLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        element: <RoleRedirect />,
      },
      {
        path: 'dashboard',
        element: <AdminOnlyRoute><Dashboard /></AdminOnlyRoute>,
      },
      {
        path: 'inquiries',
        element: <Inquiries />,
      },
      {
        path: 'inquiries/:id',
        element: <InquiryDetail />,
      },
      {
        path: 'employees',
        element: <AdminOnlyRoute><Employees /></AdminOnlyRoute>,
      },
      {
        path: 'account',
        element: <Account />,
      },
      {
        path: 'visitors',
        element: <AdminOnlyRoute><Visitors /></AdminOnlyRoute>,
      },
    ],
  },
  {
    path: '*',
    element: <RoleRedirect />,
  },
]);
