import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Login } from './components/Login';
import { SemesterManagerModal } from './components/SemesterManagerModal';
import { LogOut, Loader2, User as UserIcon, CalendarCheck, Shield, Sparkles, Settings } from 'lucide-react';
import { AvailabilityGrid } from './components/AvailabilityGrid';
import { OrganizerHeatmap } from './components/OrganizerHeatmap';
import { SubmissionTracker } from './components/SubmissionTracker';
import { ProfilePage } from './components/ProfilePage';
import { useAvailability } from './hooks/useAvailability';

const Dashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const { activeSemester } = useAvailability();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [currentView, setCurrentView] = useState<'dashboard' | 'profile'>('dashboard');
  const [currentUser, setCurrentUser] = useState(user);
  const [activeTab, setActiveTab] = useState<'my_availability' | 'heatmap'>('my_availability');
  const [isSemesterModalOpen, setIsSemesterModalOpen] = useState(false);

  if (!user) return null;

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      await logout();
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setIsLoggingOut(false);
    }
  };

  const isOrganizer = user.role === 'organizer';
  const displayedUser = currentUser ?? user;

  if (currentView === 'profile') {
    return (
      <div className="min-h-screen bg-stone-50 text-stone-800 antialiased">
        <ProfilePage
          user={displayedUser}
          onBack={() => setCurrentView('dashboard')}
          onProfileUpdated={(newName) => {
            setCurrentUser((prev) => (prev ? { ...prev, displayName: newName } : null));
          }}
        />
      </div>
    );
  }

  return (
    <div
      id="dashboard-root"
      className="min-h-screen w-full bg-stone-50 text-stone-800 antialiased"
    >
      {/* Navigation Header */}
      <header
        id="app-header"
        className="sticky top-0 z-10 border-b border-stone-200 bg-white/90 backdrop-blur-md px-6 py-3.5"
      >
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-stone-900 text-white">
              <CalendarCheck className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <h1 className="text-sm font-semibold tracking-tight text-stone-900">
                CLC Outreach Availability
              </h1>
              <p className="text-xs text-stone-600">Slot Coordination</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setCurrentView('profile')}
              className="p-1.5 text-gray-500 hover:text-indigo-600 rounded-lg hover:bg-gray-100 transition-colors"
              title="View Profile"
            >
              <UserIcon className="w-4 h-4" />
            </button>

            {isOrganizer && (
              <button
                type="button"
                onClick={() => setIsSemesterModalOpen(true)}
                className="p-1.5 text-gray-500 hover:text-indigo-600 rounded-lg hover:bg-gray-100 transition-colors"
                title="Manage Semesters"
              >
                <Settings className="w-4 h-4" />
              </button>
            )}

            <button
              id="signout-header-button"
              type="button"
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="flex items-center gap-2 rounded-lg border border-stone-200 bg-white px-3.5 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-50 hover:text-stone-900 transition-colors focus:outline-none focus:ring-2 focus:ring-stone-900 cursor-pointer disabled:opacity-50"
            >
              {isLoggingOut ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <LogOut className="h-3.5 w-3.5" />
              )}
              <span>Sign Out</span>
            </button>
          </div>
        </div>

        {isOrganizer && (
          <div className="mx-auto mt-3 flex max-w-5xl rounded-lg bg-stone-100 p-1">
            <button
              type="button"
              onClick={() => setActiveTab('my_availability')}
              className={`flex-1 rounded-md px-3 py-2 text-xs font-medium transition-colors ${
                activeTab === 'my_availability'
                  ? 'bg-white text-stone-900 shadow-sm'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              My Availability
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('heatmap')}
              className={`flex-1 rounded-md px-3 py-2 text-xs font-medium transition-colors ${
                activeTab === 'heatmap'
                  ? 'bg-white text-indigo-700 shadow-sm'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Team Heatmap
            </button>
          </div>
        )}
      </header>

      {/* Main Content Area */}
      <main id="main-content" className="mx-auto max-w-5xl px-6 py-10">
        <div className="grid gap-6 md:grid-cols-3">
          {/* Welcome User Profile Card */}
          <div
            id="user-profile-card"
            className="md:col-span-2 rounded-2xl border border-stone-200 bg-white p-7 shadow-xs"
          >
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
              {/* Profile Picture */}
              <div
                id="user-avatar-wrapper"
                className="relative h-20 w-20 shrink-0 overflow-hidden rounded-full border-2 border-stone-200 bg-stone-100 shadow-xs"
              >
                {user.photoURL && !imageError ? (
                  <img
                    id="user-avatar-image"
                    src={user.photoURL}
                    alt={user.displayName || 'Profile'}
                    referrerPolicy="no-referrer"
                    onError={() => setImageError(true)}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-stone-400">
                    <UserIcon className="h-10 w-10" />
                  </div>
                )}
              </div>

              {/* User Details */}
              <div id="user-details-group" className="flex-1 space-y-1.5">
                <div className="flex flex-wrap items-center gap-2.5">
                  <h2
                    id="user-display-name"
                    className="text-xl font-semibold text-stone-900"
                  >
                    {displayedUser.displayName || 'Outreach Member'}
                  </h2>

                  {/* Role Badge */}
                  <span
                    id="user-role-badge"
                    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider ${
                      isOrganizer
                        ? 'bg-purple-100 text-purple-800 border border-purple-200'
                        : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                    }`}
                  >
                    <Shield className="h-3 w-3" />
                    {user.role}
                  </span>
                </div>

                <p
                  id="user-email-address"
                  className="text-sm text-stone-600 font-mono"
                >
                  {displayedUser.email}
                </p>

                <p className="text-xs text-stone-600 pt-1">
                  User ID:{' '}
                  <span className="font-mono text-stone-600">{displayedUser.uid}</span>
                </p>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-stone-100 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-xs text-stone-600">
                <Sparkles className="h-4 w-4 text-amber-500" />
                <span>Account authenticated via Firebase Google Auth</span>
              </div>

              <button
                id="signout-profile-button"
                type="button"
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="flex items-center gap-2 rounded-xl bg-stone-900 px-4 py-2 text-xs font-medium text-white hover:bg-stone-800 transition-colors focus:outline-none focus:ring-2 focus:ring-stone-900 focus:ring-offset-2 disabled:opacity-50 cursor-pointer"
              >
                {isLoggingOut ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <LogOut className="h-3.5 w-3.5" />
                )}
                <span>Sign Out</span>
              </button>
            </div>
          </div>

          {/* Quick Info / Role Overview Card */}
          <div
            id="role-info-card"
            className="rounded-2xl border border-stone-200 bg-white p-7 shadow-xs flex flex-col justify-between"
          >
            <div className="space-y-3">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-stone-600">
                Role & Permissions
              </h3>
              <p className="text-sm text-stone-600 leading-relaxed">
                {isOrganizer
                  ? 'As an Organizer, you can coordinate outreach dates, configure active semester schedules, and review student availability submissions.'
                  : 'As a Student, you can submit your weekly availability slots for outreach activities during the active semester.'}
              </p>
            </div>

            <div className="mt-6 rounded-xl bg-stone-50 p-4 border border-stone-100">
              <div className="text-xs font-medium text-stone-500">
                Core Module Status
              </div>
              <div className="mt-1 flex items-center gap-2 text-sm font-semibold text-stone-800">
                <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                <span>Auth & Profile Initialized</span>
              </div>
            </div>
          </div>
        </div>

        {isOrganizer && (
          <SubmissionTracker
            activeSemesterId={activeSemester?.semesterId}
            activeSemesterName={activeSemester?.name}
          />
        )}

        {activeTab === 'heatmap' && isOrganizer ? (
          <OrganizerHeatmap activeSemester={activeSemester} />
        ) : (
          <AvailabilityGrid />
        )}
      </main>

      {isOrganizer && (
        <SemesterManagerModal
          isOpen={isSemesterModalOpen}
          onClose={() => setIsSemesterModalOpen(false)}
          onSemesterChanged={() => {
            window.location.reload();
          }}
        />
      )}
    </div>
  );
};

const AppContent: React.FC = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div
        id="loading-screen"
        className="min-h-screen w-full flex flex-col items-center justify-center bg-stone-50 p-4"
      >
        <div className="flex flex-col items-center space-y-4 text-center">
          <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-xs border border-stone-200">
            <Loader2 className="h-7 w-7 animate-spin text-stone-800" />
          </div>
          <div className="space-y-1">
            <h2 className="text-base font-medium text-stone-900">
              CLC Outreach Availability
            </h2>
            <p className="text-xs text-stone-600">
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

  return <Dashboard />;
};

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
