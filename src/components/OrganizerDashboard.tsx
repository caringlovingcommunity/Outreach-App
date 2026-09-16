import React, { useState } from 'react';
import { BarChart3, CalendarDays, LogOut, Loader2, PartyPopper, Settings, UserCircle, Users } from 'lucide-react';
import { SemesterManagerModal } from './SemesterManagerModal';
import { TopNav, BottomNav } from './NavigationBar';
import { AvailabilityGrid } from './AvailabilityGrid';
import { OrganizerHeatmap } from './OrganizerHeatmap';
import { OrganizerEvents } from './OrganizerEvents';
import { ProfilePage } from './ProfilePage';
import { SubmissionTracker } from './SubmissionTracker';
import { OrganizerStudentList } from './OrganizerStudentList';
import { useAvailability } from '../hooks/useAvailability';
import type { UserProfile } from '../types';

interface OrganizerDashboardProps {
  user: UserProfile;
  logout: () => Promise<void>;
}

type OrganizerTab = 'my_availability' | 'heatmap' | 'events' | 'student_directory' | 'submission_progress' | 'profile';

const TABS: { id: OrganizerTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'my_availability', label: 'My Availability', icon: CalendarDays },
  { id: 'heatmap', label: 'Team Heatmap', icon: BarChart3 },
  { id: 'events', label: 'Events', icon: PartyPopper },
  { id: 'student_directory', label: 'Directory', icon: Users },
  { id: 'submission_progress', label: 'Progress', icon: BarChart3 },
];

export const OrganizerDashboard: React.FC<OrganizerDashboardProps> = ({ user, logout }) => {
  const { activeSemester } = useAvailability();
  const [activeTab, setActiveTab] = useState<OrganizerTab>('my_availability');
  const [isSemesterModalOpen, setIsSemesterModalOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      await logout();
    } finally {
      setIsLoggingOut(false);
    }
  };

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
              <p className="text-xs text-stone-600">Organizer Workspace</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden items-center gap-2 border-r border-stone-200 pr-3 sm:flex">
              <UserCircle className="h-4 w-4 text-indigo-600" />
              <span className="max-w-32 truncate text-xs font-medium text-stone-700" title={user.displayName}>
                {user.displayName}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setActiveTab('profile')}
              className={`rounded-lg p-1.5 transition-colors hover:bg-gray-100 hover:text-indigo-600 ${
                activeTab === 'profile' ? 'bg-indigo-50 text-indigo-600' : 'text-gray-500'
              }`}
              title="View Profile"
            >
              <UserCircle className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setIsSemesterModalOpen(true)}
              className="rounded-lg p-1.5 text-gray-500 transition-colors hover:bg-gray-100 hover:text-indigo-600"
              title="Manage Semesters"
            >
              <Settings className="h-4 w-4" />
            </button>
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

        <TopNav
          tabs={TABS.map((tab) => ({
            id: tab.id,
            label: tab.label,
            icon: tab.icon,
            isActive: activeTab === tab.id,
            onClick: () => setActiveTab(tab.id),
          }))}
        />
      </header>

      <main className="mx-auto max-w-5xl px-6 py-10 pb-40 sm:pb-10">
        {activeTab === 'profile' ? (
          <ProfilePage user={user} onBack={() => setActiveTab('my_availability')} onProfileUpdated={() => setActiveTab('my_availability')} />
        ) : activeTab === 'submission_progress' ? (
          <SubmissionTracker activeSemesterId={activeSemester?.semesterId} activeSemesterName={activeSemester?.name} />
        ) : activeTab === 'student_directory' ? (
          <OrganizerStudentList />
        ) : activeTab === 'events' ? (
          <OrganizerEvents />
        ) : activeTab === 'heatmap' ? (
          <OrganizerHeatmap activeSemester={activeSemester} />
        ) : (
          <AvailabilityGrid />
        )}
      </main>

      <SemesterManagerModal
        isOpen={isSemesterModalOpen}
        onClose={() => setIsSemesterModalOpen(false)}
        onSemesterChanged={() => window.location.reload()}
      />

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
    </div>
  );
};
