import React from 'react';
import { CalendarClock, ArrowRight } from 'lucide-react';

export interface HomeAction {
  id: string;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  onClick: () => void;
}

export interface HomeStat {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface HomePageProps {
  displayName: string;
  activeSemesterName?: string | null;
  semesterLoading?: boolean;
  stats?: HomeStat[];
  actions: HomeAction[];
}

// Compact, operational landing view shown as the first tab of both dashboards.
export const HomePage: React.FC<HomePageProps> = ({
  displayName,
  activeSemesterName,
  semesterLoading,
  stats = [],
  actions,
}) => {
  const firstName = displayName?.trim().split(' ')[0] || 'there';

  return (
    <div className="space-y-6">
      <section className="app-panel p-5 sm:p-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">Welcome back</p>
        <h2 className="mt-1 text-xl font-bold text-text">{firstName}</h2>
        <div className="mt-3 flex items-center gap-2 text-sm text-muted">
          <CalendarClock className="h-4 w-4 shrink-0 text-primary" />
          {semesterLoading ? (
            <span>Loading semester...</span>
          ) : activeSemesterName ? (
            <span>
              Active semester: <span className="font-semibold text-text">{activeSemesterName}</span>
            </span>
          ) : (
            <span>No active semester yet. Please contact an organizer.</span>
          )}
        </div>
      </section>

      {stats.length > 0 && (
        <section className="grid gap-3 sm:grid-cols-2">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <div key={stat.label} className="app-panel flex items-center gap-3 p-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary">
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs text-muted">{stat.label}</p>
                  <p className="text-base font-bold text-text">{stat.value}</p>
                </div>
              </div>
            );
          })}
        </section>
      )}

      <section>
        <h3 className="mb-3 text-sm font-semibold text-text">Quick actions</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          {actions.map((action) => {
            const Icon = action.icon;
            return (
              <button
                key={action.id}
                type="button"
                onClick={action.onClick}
                className="app-panel flex items-start gap-3 p-4 text-left transition-colors hover:border-primary hover:bg-primary-soft"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-text">{action.label}</p>
                  <p className="text-xs text-muted">{action.description}</p>
                </div>
                <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-subtle" />
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
};
