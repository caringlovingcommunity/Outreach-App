import React, { useState } from 'react';
import { LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ProfilePage } from './ProfilePage';
import { useAuth } from '../context/AuthContext';

export const RegistrationPage: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  if (!user) return null;

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      await logout();
      navigate('/login', { replace: true });
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <div className="app-shell min-h-screen">
      <header className="app-header">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4">
          <div>
            <h1 className="text-sm font-bold text-text">CLC Outreach</h1>
            <p className="text-xs text-muted">Complete your registration</p>
          </div>
          <button type="button" onClick={() => void handleLogout()} disabled={isLoggingOut} className="app-button-secondary">
            <LogOut className="h-4 w-4" />
            {isLoggingOut ? 'Signing out...' : 'Sign out'}
          </button>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-8">
        <ProfilePage
          user={user}
          onBack={() => undefined}
          onProfileUpdated={() => navigate('/', { replace: true })}
          showBackButton={false}
        />
      </main>
    </div>
  );
};
