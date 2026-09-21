import React, { useEffect, useState } from 'react';
import { BarChart3, CalendarDays, ClipboardList } from 'lucide-react';
import { AvailabilityGrid } from './AvailabilityGrid';
import { OrganizerHeatmap } from './OrganizerHeatmap';
import { SubmissionTracker } from './SubmissionTracker';
import type { Semester } from '../types';

type WorkspaceView = 'availability' | 'heatmap' | 'progress';

interface OrganizerAvailabilityWorkspaceProps {
  activeSemester: Semester | null;
}

const views: { id: WorkspaceView; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'availability', label: 'My Availability', icon: CalendarDays },
  { id: 'heatmap', label: 'Team Heatmap', icon: BarChart3 },
  { id: 'progress', label: 'Progress', icon: ClipboardList },
];

export const OrganizerAvailabilityWorkspace: React.FC<OrganizerAvailabilityWorkspaceProps> = ({ activeSemester }) => {
  const [activeView, setActiveView] = useState<WorkspaceView>('availability');

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [activeView]);

  return (
    <section className="mx-auto max-w-5xl space-y-5 pb-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-primary">Organizer workspace</p>
        <h1 className="mt-1 text-2xl font-bold text-text">Availability & Progress</h1>
        <p className="mt-1 text-sm text-muted">Plan your availability, review team coverage, and track submissions.</p>
      </div>

      <div className="app-panel grid grid-cols-3 gap-1 p-1" role="tablist" aria-label="Availability workspace views">
        {views.map((view) => {
          const Icon = view.icon;
          const isActive = activeView === view.id;
          return (
            <button
              key={view.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setActiveView(view.id)}
              className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-app-md px-2 text-center text-[11px] font-semibold transition-colors sm:flex-row sm:gap-2 sm:text-sm ${
                isActive ? 'bg-primary text-white shadow-app-sm' : 'text-muted hover:bg-primary-soft hover:text-primary'
              }`}
            >
              <Icon className="h-4 w-4 sm:h-5 sm:w-5" aria-hidden="true" />
              <span>{view.label}</span>
            </button>
          );
        })}
      </div>

      <div>
        {activeView === 'availability' ? <AvailabilityGrid /> : activeView === 'heatmap' ? <OrganizerHeatmap activeSemester={activeSemester} /> : <SubmissionTracker activeSemesterId={activeSemester?.semesterId} activeSemesterName={activeSemester?.name} />}
      </div>
    </section>
  );
};
