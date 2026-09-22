import React from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Login } from './components/Login';
import { RequireProfileComplete, RequireRegistration } from './components/RequireProfileComplete';
import { Loader2 } from 'lucide-react';
import { OrganizerDashboard } from './components/OrganizerDashboard';
import { StudentDashboard } from './components/StudentDashboard';
import { RegistrationPage } from './components/RegistrationPage';

const Dashboard: React.FC = () => {
  const { user, logout } = useAuth();

  if (!user) return null;

  if (user.role === 'organizer' || user.role === 'admin') {
    return <OrganizerDashboard user={user} logout={logout} />;
  }

  return <StudentDashboard user={user} logout={logout} />;
};

const AppContent: React.FC = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div
        id="loading-screen"
        className="app-shell flex flex-col items-center justify-center p-4"
      >
        <div className="flex flex-col items-center space-y-4 text-center">
          <div className="relative flex h-14 w-14 items-center justify-center rounded-app-lg border border-border bg-surface shadow-app-sm">
            <Loader2 className="h-7 w-7 animate-spin text-primary" />
          </div>
          <div className="space-y-1">
            <h2 className="text-base font-semibold text-text">
              CLC Outreach App
            </h2>
            <p className="text-xs text-muted">
              Verifying authentication state...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  return <Navigate to="/" replace />;
};

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<AppContent />} />
          <Route
            path="/register"
            element={
              <RequireRegistration>
                <RegistrationPage />
              </RequireRegistration>
            }
          />
          <Route
            path="/"
            element={
              <RequireProfileComplete>
                <Dashboard />
              </RequireProfileComplete>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
