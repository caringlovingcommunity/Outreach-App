import React, { useState } from 'react';
import type { Semester, UserProfile } from '../types';
import { useOrganizerHeatmap } from '../hooks/useOrganizerHeatmap';
import { Users, Clock, Loader2, AlertCircle, X, ChevronRight } from 'lucide-react';
import { Download, Share2, Check } from 'lucide-react';
import { generateFormattedDaySummary, downloadSemesterCSV } from '../utils/exportUtils';

const DAYS = [
  { id: 'MON', label: 'Mon', fullLabel: 'Monday' },
  { id: 'TUE', label: 'Tue', fullLabel: 'Tuesday' },
  { id: 'WED', label: 'Wed', fullLabel: 'Wednesday' },
  { id: 'THU', label: 'Thu', fullLabel: 'Thursday' },
  { id: 'FRI', label: 'Fri', fullLabel: 'Friday' },
  { id: 'SAT', label: 'Sat', fullLabel: 'Saturday' },
  { id: 'SUN', label: 'Sun', fullLabel: 'Sunday' },
];

const TIME_SLOTS = [
  { id: '0800_1100', label: 'Morning', time: '08:00 - 11:00' },
  { id: '1400_1700', label: 'Afternoon', time: '14:00 - 17:00' },
  { id: '1900_2200', label: 'Evening', time: '19:00 - 22:00' },
];

interface Props {
  activeSemester: Semester | null;
}

export const OrganizerHeatmap: React.FC<Props> = ({ activeSemester }) => {
  const { aggregations, totalStudentsSubmitted, loading, error } = useOrganizerHeatmap(activeSemester);
  const [activeDay, setActiveDay] = useState<string>('MON');
  const [selectedSlotModal, setSelectedSlotModal] = useState<{
    slotLabel: string;
    dayLabel: string;
    users: UserProfile[];
  } | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  const handleCopyText = async () => {
    const summaryText = generateFormattedDaySummary(activeDay, aggregations);
    try {
      await navigator.clipboard.writeText(summaryText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy to clipboard', err);
    }
  };

  if (loading) {
    return (
      <div className="app-loading-state">
        <Loader2 className="mb-3 h-8 w-8 animate-spin text-primary" />
        <p className="text-sm font-medium text-muted">Aggregating team schedules...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="app-alert-error text-xs">
        <AlertCircle className="w-4 h-4 flex-shrink-0" />
        {error}
      </div>
    );
  }

  const selectedDayObj = DAYS.find((d) => d.id === activeDay) || DAYS[0];

  return (
    <div className="mt-2 flex flex-col space-y-4 pb-20">
      {/* Overview Stats Banner */}
      <div className="flex items-center justify-between rounded-app-lg bg-primary p-5 text-white shadow-app-sm">
        <div>
          <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-white/75">
            <Users className="w-3.5 h-3.5" />
            Team Aggregation
          </div>
          <h2 className="text-lg font-bold mt-1">Outreach Availability</h2>
          <p className="mt-1 text-xs text-white/80">
            {totalStudentsSubmitted} {totalStudentsSubmitted === 1 ? 'student has' : 'students have'} submitted responses
          </p>
        </div>
        <div className="flex h-12 w-12 flex-col items-center justify-center rounded-app-md border border-white/30 bg-white/15">
          <span className="text-lg font-extrabold">{totalStudentsSubmitted}</span>
          <span className="text-[9px] font-bold uppercase text-white/75">Total</span>
        </div>
      </div>

      {/* Export Toolbar */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleCopyText}
          className="app-button-secondary min-h-10 flex-1 px-3 py-2 text-xs"
        >
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5 text-success" />
              <span className="text-success">Copied to Clipboard!</span>
            </>
          ) : (
            <>
              <Share2 className="h-3.5 w-3.5 text-primary" />
              <span>Share {selectedDayObj.label} Text</span>
            </>
          )}
        </button>
        <button
          type="button"
          onClick={() => downloadSemesterCSV(activeSemester, aggregations)}
          className="app-button-secondary min-h-10 px-3 py-2 text-xs"
          title="Download full CSV"
        >
          <Download className="h-3.5 w-3.5 text-primary" />
          <span>Export CSV</span>
        </button>
      </div>

      {/* Horizontal Day Selector */}
      <div className="app-panel p-1.5">
        <div className="flex items-center justify-between gap-1 overflow-x-auto no-scrollbar">
          {DAYS.map((day) => {
            const isCurrent = activeDay === day.id;

            // Calculate total available students across all 3 slots for this day
            const totalForDay = TIME_SLOTS.reduce((acc, slot) => {
              const key = `${day.id}_${slot.id}`;
              return acc + (aggregations[key]?.count || 0);
            }, 0);

            return (
              <button
                key={day.id}
                type="button"
                onClick={() => setActiveDay(day.id)}
                className={`flex min-w-11 flex-1 flex-col items-center justify-center rounded-app-md py-2.5 transition-colors ${
                  isCurrent
                    ? 'bg-primary font-bold text-white shadow-app-sm'
                    : 'font-medium text-muted hover:bg-primary-soft hover:text-primary'
                }`}
              >
                <span className="text-xs">{day.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full mt-1 font-semibold ${
                    isCurrent ? 'bg-white/20 text-white' : 'bg-surface-muted text-muted'
                  }`}
                >
                  {totalForDay}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Time Slot Heatmap Cards */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <span className="text-xs font-bold uppercase tracking-wider text-muted">
            {selectedDayObj.fullLabel} Heatmap
          </span>
          <span className="text-xs text-subtle">Tap card for names</span>
        </div>

        {TIME_SLOTS.map((slot) => {
          const slotKey = `${activeDay}_${slot.id}`;
          const aggData = aggregations[slotKey] || { slotKey, count: 0, availableUsers: [] };
          const count = aggData.count;

          // Color intensity calculations
          let intensityClass = 'bg-surface border-border text-text';
          let badgeClass = 'bg-surface-muted text-muted';

          if (count >= 4) {
            intensityClass = 'bg-primary-soft border-primary text-text shadow-app-sm';
            badgeClass = 'bg-primary text-white font-bold';
          } else if (count >= 2) {
            intensityClass = 'bg-primary-soft/70 border-primary-muted text-text';
            badgeClass = 'bg-primary-hover text-white font-bold';
          } else if (count === 1) {
            intensityClass = 'bg-surface-muted border-border text-text';
            badgeClass = 'bg-primary-muted text-text font-medium';
          }

          return (
            <button
              key={slot.id}
              type="button"
              disabled={count === 0}
              onClick={() =>
                setSelectedSlotModal({
                  slotLabel: `${slot.label} (${slot.time})`,
                  dayLabel: selectedDayObj.fullLabel,
                  users: aggData.availableUsers,
                })
              }
              className={`flex w-full items-center justify-between rounded-app-lg border p-4 text-left transition-colors active:scale-[0.99] ${intensityClass} ${
                count === 0 ? 'cursor-not-allowed opacity-60' : 'hover:border-primary'
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    count > 0 ? 'bg-primary-soft text-primary' : 'bg-surface-muted text-subtle'
                  }`}
                >
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-bold text-sm">{slot.label}</div>
                  <div className="mt-0.5 text-xs text-muted">{slot.time}</div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className={`px-2.5 py-1 rounded-full text-xs ${badgeClass}`}>
                  {count} {count === 1 ? 'Student' : 'Students'} Free
                </span>
                {count > 0 && <ChevronRight className="h-4 w-4 text-subtle" />}
              </div>
            </button>
          );
        })}
      </div>

      {/* Bottom Student Detail Drawer */}
      {selectedSlotModal && (
        <div className="app-modal-backdrop items-end justify-center">
          <div className="app-modal max-h-[80vh] space-y-4 sm:rounded-app-lg">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h3 className="text-base font-bold text-text">
                  {selectedSlotModal.dayLabel} • {selectedSlotModal.slotLabel}
                </h3>
                <p className="mt-0.5 text-xs text-muted">
                  {selectedSlotModal.users.length} available {selectedSlotModal.users.length === 1 ? 'student' : 'students'}
                </p>
              </div>
              <button
                onClick={() => setSelectedSlotModal(null)}
                className="app-icon-button size-9"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto space-y-2.5 flex-1 pr-1">
              {selectedSlotModal.users.map((st) => (
                <div
                  key={st.uid}
                  className="flex items-center gap-3 rounded-app-md border border-border bg-surface-muted p-3"
                >
                  {st.photoURL ? (
                    <img
                      src={st.photoURL}
                      alt={st.displayName}
                      className="h-9 w-9 rounded-full border border-border"
                    />
                  ) : (
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-soft text-xs font-bold text-primary">
                      {st.displayName?.charAt(0) || 'S'}
                    </div>
                  )}
                  <div>
                    <div className="text-sm font-bold text-text">{st.displayName}</div>
                    <div className="text-xs text-muted">{st.email}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};