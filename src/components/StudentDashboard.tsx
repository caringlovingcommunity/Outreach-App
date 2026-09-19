import React, { useEffect, useState } from 'react';
import { Calendar, CalendarDays, LogOut, Loader2, User as UserIcon } from 'lucide-react';
import { TopNav, BottomNav } from './NavigationBar';
import { AvailabilityGrid } from './AvailabilityGrid';
import { StudentEvents } from './StudentEvents';
import { ProfilePage } from './ProfilePage';
import { useAuth } from '../context/AuthContext';
import { getCompleteUserProfile } from '../services/userService';
import type { UserProfile } from '../types';

interface StudentDashboardProps {
  user: UserProfile;
  logout: () => Promise<void>;
}

type StudentTab = 'my_availability' | 'events' | 'profile';

const TABS: { id: StudentTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'my_availability', label: 'My Availability', icon: Calendar },
  { id: 'events', label: 'Events', icon: CalendarDays },
];

const isProfileComplete = (profile: Awaited<ReturnType<typeof getCompleteUserProfile>>) => Boolean(
  profile?.displayName &&
  profile.faculty &&
  profile.course &&
  profile.yearOfStudy &&
  profile.phone &&
  profile.college &&
  profile.gender &&
  profile.race &&
  profile.hometown
);

export const StudentDashboard: React.FC<StudentDashboardProps> = ({ user, logout }) => {
  const { refreshProfile } = useAuth();
  const [activeTab, setActiveTab] = useState<StudentTab>('my_availability');
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [profileStatus, setProfileStatus] = useState<'loading' | 'incomplete' | 'complete'>('loading');

  useEffect(() => {
    let isMounted = true;

    getCompleteUserProfile(user.uid)
      .then((profile) => {
        if (!isMounted) return;
        if (isProfileComplete(profile)) {
          setProfileStatus('complete');
        } else {
          setProfileStatus('incomplete');
          setActiveTab('profile');
        }
      })
      .catch(() => {
        if (isMounted) {
          setProfileStatus('incomplete');
          setActiveTab('profile');
        }
      });

    return () => {
      isMounted = false;
    };
  }, [user.uid]);

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      await logout();
    } finally {
      setIsLoggingOut(false);
    }
  };

  const handleProfileUpdated = async () => {
    await refreshProfile();
    setProfileStatus('complete');
    setActiveTab('my_availability');
  };

  if (profileStatus === 'loading') {
    return (
      <div className="app-shell flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-20 w-35 items-center justify-center overflow-hidden rounded-lg">
              <img src="/CLC.png" alt="CLC" className="h-full w-full object-cover" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-text">CLC Outreach Availability</h1>
              <p className="text-xs text-muted">Slot Coordination</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {profileStatus === 'complete' && (
              <button
                type="button"
                onClick={() => setActiveTab('profile')}
                className={`app-icon-button ${
                  activeTab === 'profile' ? 'bg-primary-soft text-primary' : ''
                }`}
                title="View Profile"
              >
                <UserIcon className="h-4 w-4" />
              </button>
            )}
            <button
              type="button"
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="app-button-secondary min-h-9 px-3.5 py-1.5 text-xs"
            >
              {isLoggingOut ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <LogOut className="h-3.5 w-3.5" />}
              <span>Sign Out</span>
            </button>
          </div>
        </div>

        {profileStatus === 'complete' && (
          <TopNav
            tabs={TABS.map((tab) => ({
              id: tab.id,
              label: tab.label,
              icon: tab.icon,
              isActive: activeTab === tab.id,
              onClick: () => setActiveTab(tab.id),
            }))}
          />
        )}
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6 pb-40 sm:px-6 sm:py-8 sm:pb-10">
        {activeTab === 'profile' ? (
          <ProfilePage user={user} onBack={() => setActiveTab('my_availability')} onProfileUpdated={handleProfileUpdated} />
        ) : activeTab === 'events' ? (
          <StudentEvents user={user} />
        ) : (
          <AvailabilityGrid />
        )}
      </main>

      {profileStatus === 'complete' && (
        <BottomNav
          tabs={TABS.map((tab) => ({
            id: tab.id,
            label: tab.label,
            icon: tab.icon,
            isActive: activeTab === tab.id,
            onClick: () => setActiveTab(tab.id),
          }))}
          profile={{ photoURL: user.photoURL, isActive: activeTab === 'profile', onClick: () => setActiveTab('profile') }}
        />
      )}
    </div>
  );
};
