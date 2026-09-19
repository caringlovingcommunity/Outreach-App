import React from 'react';
import { User as UserIcon } from 'lucide-react';

export interface NavTab {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  isActive: boolean;
  onClick: () => void;
}

export interface NavProfile {
  photoURL?: string;
  isActive?: boolean;
  onClick: () => void;
}

interface TopNavProps {
  tabs: NavTab[];
}

// Desktop tab strip shown inside the sticky header.
export const TopNav: React.FC<TopNavProps> = ({ tabs }) => (
  <nav className="mx-auto mt-3 hidden max-w-5xl gap-1 rounded-app-md border border-border bg-surface-muted p-1 sm:flex">
    {tabs.map((tab) => (
      <button
        key={tab.id}
        type="button"
        onClick={tab.onClick}
        className={`flex-1 rounded-app-sm px-3 py-2 text-xs font-semibold transition-colors ${
          tab.isActive ? 'bg-surface text-primary shadow-app-sm' : 'text-muted hover:bg-primary-soft hover:text-primary'
        }`}
      >
        {tab.label}
      </button>
    ))}
  </nav>
);

interface BottomNavProps {
  tabs: NavTab[];
  profile: NavProfile;
}

// Mobile-only fixed nav bar, always ending with a Profile entry.
export const BottomNav: React.FC<BottomNavProps> = ({ tabs, profile }) => (
  <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 shadow-[0_-4px_16px_rgb(31_41_55_/_0.1)] sm:hidden">
    <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${tabs.length + 1}, minmax(0, 1fr))` }}>
      {tabs.map((tab) => {
        const Icon = tab.icon;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={tab.onClick}
            className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-app-md text-[10px] font-semibold transition-colors ${
              tab.isActive ? 'bg-primary-soft text-primary' : 'text-muted active:bg-surface-muted'
            }`}
          >
            <Icon className="h-5 w-5" />
            <span>{tab.label}</span>
          </button>
        );
      })}
      <button
        type="button"
        onClick={profile.onClick}
        title="View Profile"
        className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-app-md text-[10px] font-semibold transition-colors ${
          profile.isActive ? 'bg-primary-soft text-primary' : 'text-muted active:bg-surface-muted'
        }`}
      >
        {profile.photoURL ? (
          <img src={profile.photoURL} alt="" className="h-6 w-6 rounded-full object-cover ring-2 ring-border" />
        ) : (
          <UserIcon className="h-6 w-6" />
        )}
        <span>Profile</span>
      </button>
    </div>
  </nav>
);
