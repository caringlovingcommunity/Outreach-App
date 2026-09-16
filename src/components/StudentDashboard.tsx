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
      <div className="flex min-h-screen items-center justify-center bg-stone-50">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-stone-50 text-stone-800 antialiased">
      <header className="sticky top-0 z-10 border-b border-stone-200 bg-white/90 px-6 py-3.5 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-20 w-35 items-center justify-center overflow-hidden rounded-lg">
              <img src="/CLC.png" alt="CLC" className="h-full w-full object-cover" />
            </div>
            <div>
              <h1 className="text-sm font-semibold tracking-tight text-stone-900">CLC Outreach Availability</h1>
              <p className="text-xs text-stone-600">Slot Coordination</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {profileStatus === 'complete' && (
              <button
                type="button"
                onClick={() => setActiveTab('profile')}
                className={`rounded-lg p-1.5 transition-colors hover:bg-gray-100 hover:text-indigo-600 ${
                  activeTab === 'profile' ? 'bg-indigo-50 text-indigo-600' : 'text-gray-500'
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
              className="flex items-center gap-2 rounded-lg border border-stone-200 bg-white px-3.5 py-1.5 text-xs font-medium text-stone-700 transition-colors hover:bg-stone-50 disabled:opacity-50"
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

      <main className="mx-auto max-w-5xl px-6 py-10 pb-40 sm:pb-10">
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
