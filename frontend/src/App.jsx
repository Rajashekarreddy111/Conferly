import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';

// Auth Pages
import { LoginPage } from './pages/auth/LoginPage';
import { ForgotPasswordPage } from './pages/auth/ForgotPasswordPage';
import { ResetPasswordPage } from './pages/auth/ResetPasswordPage';

// Admin Pages (7)
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { ManageSections } from './pages/admin/ManageSections';
import { ManageCoordinators } from './pages/admin/ManageCoordinators';
import { ManageStudentsAdmin } from './pages/admin/ManageStudentsAdmin';
import { ManageConferencesAdmin } from './pages/admin/ManageConferencesAdmin';
import { ApplicationReports } from './pages/admin/ApplicationReports';
import { AdminSettings } from './pages/admin/AdminSettings';

// Coordinator Pages (6)
import { CoordinatorDashboard } from './pages/coordinator/CoordinatorDashboard';
import { ManageStudentsCoord } from './pages/coordinator/ManageStudentsCoord';
import { ManageConferencesCoord } from './pages/coordinator/ManageConferencesCoord';
import { ConferenceTracking } from './pages/coordinator/ConferenceTracking';
import { StudentTracking } from './pages/coordinator/StudentTracking';
import { CoordinatorProfile } from './pages/coordinator/CoordinatorProfile';

// Student Pages (5)
import { StudentDashboard } from './pages/student/StudentDashboard';
import { AllConferences } from './pages/student/AllConferences';
import { MyApplications } from './pages/student/MyApplications';
import { StudentProfile } from './pages/student/StudentProfile';
import { BasePaperTitle } from './pages/student/BasePaperTitle';

// Shared Paper Management Pages
import { PaperTitleTracking } from './pages/coordinator/PaperTitleTracking';
import { FindRelatedPapers } from './pages/coordinator/FindRelatedPapers';

import { LoadingSpinner } from './components/common/LoadingSpinner';

// Protected Route Guard
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-jet-950 flex items-center justify-center">
        <LoadingSpinner text="Authenticating user session..." />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const isCoord = user?.role === 'coordinator' || user?.role === 'mentor';
  const hasAccess = !allowedRoles || allowedRoles.some((r) => r === user?.role || (r === 'coordinator' && isCoord));

  if (!hasAccess) {
    // Redirect to user's permitted home
    if (user?.role === 'admin') return <Navigate to="/admin/dashboard" replace />;
    if (isCoord) return <Navigate to="/coordinator/dashboard" replace />;
    return <Navigate to="/student/dashboard" replace />;
  }

  return children;
};

// Root index redirector
const RootRedirect = () => {
  const { user, isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-jet-950 flex items-center justify-center">
        <LoadingSpinner text="Initializing portal..." />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const isCoord = user?.role === 'coordinator' || user?.role === 'mentor';
  if (user?.role === 'admin') return <Navigate to="/admin/dashboard" replace />;
  if (isCoord) return <Navigate to="/coordinator/dashboard" replace />;
  return <Navigate to="/student/dashboard" replace />;
};

function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <BrowserRouter>
          <Routes>
            {/* Root */}
            <Route path="/" element={<RootRedirect />} />

            {/* Shared Authentication Routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />

            {/* 1. Admin Routes (7 Pages) */}
            <Route
              path="/admin/dashboard"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/sections"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <ManageSections />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/coordinators"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <ManageCoordinators />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/students"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <ManageStudentsAdmin />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/conferences"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <ManageConferencesAdmin />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/reports"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <ApplicationReports />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/settings"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <AdminSettings />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/paper-tracking"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <PaperTitleTracking />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/find-papers"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <FindRelatedPapers />
                </ProtectedRoute>
              }
            />

            {/* 2. Coordinator Routes */}
            <Route
              path="/coordinator/dashboard"
              element={
                <ProtectedRoute allowedRoles={['coordinator']}>
                  <CoordinatorDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/coordinator/students"
              element={
                <ProtectedRoute allowedRoles={['coordinator']}>
                  <ManageStudentsCoord />
                </ProtectedRoute>
              }
            />
            <Route
              path="/coordinator/conferences"
              element={
                <ProtectedRoute allowedRoles={['coordinator']}>
                  <ManageConferencesCoord />
                </ProtectedRoute>
              }
            />
            <Route
              path="/coordinator/conference-tracking"
              element={
                <ProtectedRoute allowedRoles={['coordinator']}>
                  <ConferenceTracking />
                </ProtectedRoute>
              }
            />
            <Route
              path="/coordinator/student-tracking"
              element={
                <ProtectedRoute allowedRoles={['coordinator']}>
                  <StudentTracking />
                </ProtectedRoute>
              }
            />
            <Route
              path="/coordinator/paper-tracking"
              element={
                <ProtectedRoute allowedRoles={['coordinator']}>
                  <PaperTitleTracking />
                </ProtectedRoute>
              }
            />
            <Route
              path="/coordinator/find-papers"
              element={
                <ProtectedRoute allowedRoles={['coordinator']}>
                  <FindRelatedPapers />
                </ProtectedRoute>
              }
            />
            <Route
              path="/coordinator/profile"
              element={
                <ProtectedRoute allowedRoles={['coordinator']}>
                  <CoordinatorProfile />
                </ProtectedRoute>
              }
            />

            {/* 3. Student Routes */}
            <Route
              path="/student/dashboard"
              element={
                <ProtectedRoute allowedRoles={['student']}>
                  <StudentDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/student/base-paper"
              element={
                <ProtectedRoute allowedRoles={['student']}>
                  <BasePaperTitle />
                </ProtectedRoute>
              }
            />
            <Route
              path="/student/conferences"
              element={
                <ProtectedRoute allowedRoles={['student']}>
                  <AllConferences />
                </ProtectedRoute>
              }
            />
            <Route
              path="/student/applications"
              element={
                <ProtectedRoute allowedRoles={['student']}>
                  <MyApplications />
                </ProtectedRoute>
              }
            />
            <Route
              path="/student/profile"
              element={
                <ProtectedRoute allowedRoles={['student']}>
                  <StudentProfile />
                </ProtectedRoute>
              }
            />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </AuthProvider>
  );
}

export default App;
