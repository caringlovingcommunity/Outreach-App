import React, { lazy, Suspense, useEffect, useState } from 'react';
import { ClipboardCheck, Home, PartyPopper, Settings, Shield, UserCircle, Users } from 'lucide-react';
import { SemesterManagerModal } from './SemesterManagerModal';
import { TopNav, BottomNav } from './NavigationBar';
import { NavigationDrawer } from './NavigationDrawer';
import { HomePage } from './HomePage';
import { useAvailability } from '../hooks/useAvailability';
import type { UserProfile } from '../types';

const AdminUserManagementPage = lazy(() => import('./AdminUserManagementPage').then((module) => ({ default: module.AdminUserManagementPage })));
const OrganizerEvents = lazy(() => import('./OrganizerEvents').then((module) => ({ default: module.OrganizerEvents })));
const ProfilePage = lazy(() => import('./ProfilePage').then((module) => ({ default: module.ProfilePage })));
const OrganizerStudentList = lazy(() => import('./OrganizerStudentList').then((module) => ({ default: module.OrganizerStudentList })));
const FriendsPage = lazy(() => import('./FriendsPage').then((module) => ({ default: module.FriendsPage })));
const OrganizerApprovalsPage = lazy(() => import('./OrganizerApprovalsPage').then((module) => ({ default: module.OrganizerApprovalsPage })));

interface OrganizerDashboardProps {
  user: UserProfile;
  logout: () => Promise<void>;
}

type OrganizerTab = 'home' | 'events' | 'student_directory' | 'approvals' | 'friends' | 'profile' | 'user_management';

const TABS: { id: OrganizerTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'events', label: 'Events', icon: PartyPopper },
  { id: 'approvals', label: 'Member Approvals', icon: ClipboardCheck },
  { id: 'friends', label: 'Friends', icon: Users },
];

const ADMIN_TABS: { id: OrganizerTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'student_directory', label: 'Directory', icon: Users },
  { id: 'user_management', label: 'User Management', icon: Shield },
];

export const OrganizerDashboard: React.FC<OrganizerDashboardProps> = ({ user, logout }) => {
  const { activeSemester } = useAvailability();
  const [activeTab, setActiveTab] = useState<OrganizerTab>('home');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isSemesterModalOpen, setIsSemesterModalOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [activeTab]);

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      await logout();
    } finally {
      setIsLoggingOut(false);
    }
  };

  const tabs = user.role === 'admin' ? [...TABS, ...ADMIN_TABS] : TABS;

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
        <Suspense fallback={<div className="app-loading-state">Loading page...</div>}>
          <div key={activeTab} className="page-view-fade">
            {activeTab === 'home' ? (
              <HomePage
                displayName={user.displayName}
                activeSemesterName={activeSemester?.name}
              />
            ) : activeTab === 'user_management' ? (
              <AdminUserManagementPage user={user} />
            ) : activeTab === 'profile' ? (
              <ProfilePage user={user} onBack={() => setActiveTab('home')} onProfileUpdated={() => setActiveTab('home')} />
            ) : activeTab === 'friends' ? (
              <FriendsPage currentUserId={user.uid} />
            ) : activeTab === 'student_directory' ? (
              <OrganizerStudentList />
            ) : activeTab === 'approvals' ? (
              <OrganizerApprovalsPage />
            ) : activeTab === 'events' ? (
              <OrganizerEvents user={user} />
            ) : (
              <HomePage displayName={user.displayName} activeSemesterName={activeSemester?.name} />
            )}
          </div>
        </Suspense>
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
        isDrawerOpen={isDrawerOpen}
      />
    </div>
  );
};
