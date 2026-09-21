import React, { useState } from 'react';
import { BarChart3, CalendarDays, ClipboardCheck, PartyPopper, Settings, Shield, UserCircle, Users } from 'lucide-react';
import { AdminUserManagementPage } from './AdminUserManagementPage';
import { SemesterManagerModal } from './SemesterManagerModal';
import { TopNav, BottomNav } from './NavigationBar';
import { NavigationDrawer } from './NavigationDrawer';
import { AvailabilityGrid } from './AvailabilityGrid';
import { OrganizerHeatmap } from './OrganizerHeatmap';
import { OrganizerEvents } from './OrganizerEvents';
import { ProfilePage } from './ProfilePage';
import { SubmissionTracker } from './SubmissionTracker';
import { OrganizerStudentList } from './OrganizerStudentList';
import { FriendsPage } from './FriendsPage';
import { OrganizerApprovalsPage } from './OrganizerApprovalsPage';
import { useAvailability } from '../hooks/useAvailability';
import type { UserProfile } from '../types';

interface OrganizerDashboardProps {
  user: UserProfile;
  logout: () => Promise<void>;
}

type OrganizerTab = 'my_availability' | 'heatmap' | 'events' | 'student_directory' | 'submission_progress' | 'approvals' | 'friends' | 'profile' | 'user_management';

const TABS: { id: OrganizerTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'my_availability', label: 'My Availability', icon: CalendarDays },
  { id: 'heatmap', label: 'Team Heatmap', icon: BarChart3 },
  { id: 'events', label: 'Events', icon: PartyPopper },
  { id: 'student_directory', label: 'Directory', icon: Users },
  { id: 'submission_progress', label: 'Progress', icon: BarChart3 },
  { id: 'approvals', label: 'Member Approvals', icon: ClipboardCheck },
  { id: 'friends', label: 'Friends', icon: Users },
];

export const OrganizerDashboard: React.FC<OrganizerDashboardProps> = ({ user, logout }) => {
  const { activeSemester } = useAvailability();
  const [activeTab, setActiveTab] = useState<OrganizerTab>('my_availability');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
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

  const tabs = user.role === 'admin'
    ? [...TABS, { id: 'user_management' as const, label: 'User Management', icon: Shield }]
    : TABS;

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
              <p className="text-xs text-muted">Organizer Workspace</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <NavigationDrawer
              isOpen={isDrawerOpen}
              onOpenChange={setIsDrawerOpen}
              tabs={tabs.map((tab) => ({
                id: tab.id,
                label: tab.label,
                icon: tab.icon,
                isActive: activeTab === tab.id,
                onClick: () => setActiveTab(tab.id),
              }))}
              profile={{
                photoURL: user.photoURL,
                displayName: user.displayName,
                email: user.email,
                onClick: () => setActiveTab('profile'),
              }}
              onSignOut={handleLogout}
              isLoggingOut={isLoggingOut}
              extraAction={{
                label: 'Manage Semesters',
                icon: Settings,
                onClick: () => setIsSemesterModalOpen(true),
              }}
            />
            <div className="hidden items-center gap-2 border-r border-border pr-3 sm:flex">
              <UserCircle className="h-4 w-4 text-primary" />
              <span className="max-w-32 truncate text-xs font-medium text-text" title={user.displayName}>
                {user.displayName}
              </span>
            </div>
            {/* <button
              type="button"
              onClick={() => setIsSemesterModalOpen(true)}
              className="app-icon-button"
              title="Manage Semesters"
            >
              <Settings className="h-4 w-4" />
            </button> */}
          </div>
        </div>

        <TopNav
          tabs={tabs.map((tab) => ({
            id: tab.id,
            label: tab.label,
            icon: tab.icon,
            isActive: activeTab === tab.id,
            onClick: () => setActiveTab(tab.id),
          }))}
        />
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6 pb-40 sm:px-6 sm:py-8 sm:pb-10">
        {activeTab === 'user_management' ? (
          <AdminUserManagementPage user={user} />
        ) : activeTab === 'profile' ? (
          <ProfilePage user={user} onBack={() => setActiveTab('my_availability')} onProfileUpdated={() => setActiveTab('my_availability')} />
        ) : activeTab === 'friends' ? (
          <FriendsPage currentUserId={user.uid} />
        ) : activeTab === 'submission_progress' ? (
          <SubmissionTracker activeSemesterId={activeSemester?.semesterId} activeSemesterName={activeSemester?.name} />
        ) : activeTab === 'student_directory' ? (
          <OrganizerStudentList />
        ) : activeTab === 'approvals' ? (
          <OrganizerApprovalsPage />
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
        tabs={tabs.map((tab) => ({
          id: tab.id,
          label: tab.label,
          icon: tab.icon,
          isActive: activeTab === tab.id,
          onClick: () => setActiveTab(tab.id),
        }))}
        profile={{ photoURL: user.photoURL, isActive: activeTab === 'profile', onClick: () => setActiveTab('profile') }}
        isDrawerOpen={isDrawerOpen}
      />
    </div>
  );
};
