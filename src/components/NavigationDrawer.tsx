import React, { useEffect, useRef, useState } from 'react';
import { LogOut, Menu, MoreVertical, User, X } from 'lucide-react';
import type { NavTab } from './NavigationBar';

interface NavigationDrawerProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  tabs: NavTab[];
  profile?: {
    photoURL?: string;
    displayName: string;
    email: string;
    onClick: () => void;
  };
  onSignOut: () => void;
  isLoggingOut?: boolean;
  extraAction?: {
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    onClick: () => void;
  };
}

export const NavigationDrawer: React.FC<NavigationDrawerProps> = ({
  isOpen,
  onOpenChange,
  tabs,
  profile,
  onSignOut,
  isLoggingOut = false,
  extraAction,
}) => {
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  const closeDrawer = () => {
    onOpenChange(false);
    triggerRef.current?.focus();
  };

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        if (isProfileMenuOpen) {
          setIsProfileMenuOpen(false);
        } else {
          closeDrawer();
        }
      }
    };

    const handleOutsideClick = (event: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setIsProfileMenuOpen(false);
      }
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleOutsideClick);
    closeButtonRef.current?.focus();

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isOpen, isProfileMenuOpen]);

  const selectItem = (onClick: () => void) => {
    closeDrawer();
    onClick();
  };

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => onOpenChange(true)}
        aria-label="Open navigation menu"
        aria-expanded={isOpen}
        aria-controls="navigation-drawer"
        className="app-icon-button"
        title="Open navigation menu"
      >
        <Menu className="h-5 w-5" aria-hidden="true" />
      </button>

      <div
        className={`fixed inset-0 z-[60] bg-overlay transition-opacity duration-200 ${
          isOpen ? 'visible opacity-100' : 'invisible opacity-0'
        }`}
        aria-hidden={!isOpen}
        onClick={closeDrawer}
      >
        <aside
          id="navigation-drawer"
          role="dialog"
          aria-modal="true"
          aria-label="Navigation menu"
          onClick={(event) => event.stopPropagation()}
          className={`flex h-full w-[min(21rem,calc(100vw-2rem))] flex-col border-r border-border bg-surface shadow-app-lg transition-transform duration-200 ease-out ${
            isOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <div className="flex items-center gap-3">
              <img src="/CLC.png" alt="CLC" className="h-10 w-16 rounded-app-sm object-cover" />
              <div>
                <h2 className="text-sm font-bold text-text">CLC Outreach</h2>
                <p className="text-xs text-muted">Navigation</p>
              </div>
            </div>
            <button
              ref={closeButtonRef}
              type="button"
              onClick={closeDrawer}
              aria-label="Close navigation menu"
              className="app-icon-button"
              title="Close navigation menu"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>

          <nav className="flex-1 overflow-y-auto p-3" aria-label="Primary navigation">
            <div className="space-y-1">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => selectItem(tab.onClick)}
                    className={`flex min-h-12 w-full items-center gap-3 rounded-app-md px-3.5 py-3 text-left text-sm font-semibold transition-colors focus-visible:bg-primary-soft ${
                      tab.isActive ? 'bg-primary-soft text-primary' : 'text-text hover:bg-surface-muted'
                    }`}
                  >
                    <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
              {extraAction && (
                <button
                  type="button"
                  onClick={() => selectItem(extraAction.onClick)}
                  className="flex min-h-12 w-full items-center gap-3 rounded-app-md px-3.5 py-3 text-left text-sm font-semibold text-text transition-colors hover:bg-surface-muted focus-visible:bg-primary-soft"
                >
                  <extraAction.icon className="h-5 w-5 shrink-0" aria-hidden="true" />
                  <span>{extraAction.label}</span>
                </button>
              )}
            </div>
          </nav>

          <div className="border-t border-border p-3">
            {profile && (
              <div ref={profileMenuRef} className="relative mb-2 flex min-h-14 items-center gap-3 rounded-app-md px-3 py-2">
                {profile.photoURL ? (
                  <img src={profile.photoURL} alt="" className="h-9 w-9 rounded-full object-cover ring-2 ring-border" />
                ) : (
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-soft text-sm font-bold text-primary">
                    {profile.displayName.charAt(0).toUpperCase() || 'U'}
                  </div>
                )}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-text">{profile.displayName}</span>
                  <span className="block truncate text-xs text-muted">{profile.email}</span>
                </span>
                <button
                  type="button"
                  onClick={() => setIsProfileMenuOpen((current) => !current)}
                  aria-label="Open profile actions"
                  aria-haspopup="menu"
                  aria-expanded={isProfileMenuOpen}
                  className="app-icon-button size-9 shrink-0"
                  title="Profile actions"
                >
                  <MoreVertical className="h-5 w-5" aria-hidden="true" />
                </button>
                <div
                  role="menu"
                  aria-label="Profile actions"
                  className={`absolute bottom-full right-0 z-10 mb-2 w-48 rounded-app-md border border-border bg-surface p-1 shadow-app-md transition duration-150 ${
                    isProfileMenuOpen ? 'visible translate-y-0 opacity-100' : 'invisible translate-y-1 opacity-0'
                  }`}
                >
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setIsProfileMenuOpen(false);
                      selectItem(profile.onClick);
                    }}
                    className="flex min-h-11 w-full items-center gap-3 rounded-app-sm px-3 py-2.5 text-left text-sm font-medium text-text hover:bg-primary-soft focus-visible:bg-primary-soft"
                  >
                    <User className="h-4 w-4 text-muted" aria-hidden="true" />
                    <span>View Profile</span>
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setIsProfileMenuOpen(false);
                      selectItem(onSignOut);
                    }}
                    disabled={isLoggingOut}
                    className="flex min-h-11 w-full items-center gap-3 rounded-app-sm px-3 py-2.5 text-left text-sm font-medium text-text hover:bg-error-soft hover:text-error focus-visible:bg-error-soft disabled:opacity-60"
                  >
                    <LogOut className="h-4 w-4 text-muted" aria-hidden="true" />
                    <span>{isLoggingOut ? 'Signing Out...' : 'Sign Out'}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </aside>
      </div>
    </>
  );
};
