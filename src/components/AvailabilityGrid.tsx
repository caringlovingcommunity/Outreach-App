import React, { useState } from 'react';
import { useAvailability } from '../hooks/useAvailability';
import { Calendar, Clock, Save, CheckCircle, AlertCircle, Loader2, Check } from 'lucide-react';

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

export const AvailabilityGrid: React.FC = () => {
  const {
    activeSemester,
    selectedSlots,
    loading,
    saving,
    error,
    saveSuccess,
    toggleSlot,
    saveAvailability,
  } = useAvailability();

  const [activeDay, setActiveDay] = useState<string>('MON');

  if (loading) {
    return (
      <div className="app-loading-state">
        <Loader2 className="mb-3 h-8 w-8 animate-spin text-primary" />
        <p className="text-sm font-medium text-muted">Loading availability...</p>
      </div>
    );
  }

  if (!activeSemester) {
    return (
      <div className="app-alert-warning p-5">
        <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
        <div>
          <h3 className="font-semibold text-sm">No Active Semester</h3>
          <p className="mt-1 text-xs">
            There is currently no active semester configured. Please contact an outreach organizer.
          </p>
        </div>
      </div>
    );
  }

  const selectedDayObj = DAYS.find((d) => d.id === activeDay) || DAYS[0];

  return (
    <div className="mt-2 flex flex-col space-y-4 pb-20">
      {/* Semester Banner Card */}
      <div className="rounded-app-lg bg-primary p-5 text-white shadow-app-sm">
        <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-white/75">
          <Calendar className="w-3.5 h-3.5" />
          Active Term
        </div>
        <h2 className="text-lg font-bold mt-1">{activeSemester.name}</h2>
        <p className="mt-1 text-xs text-white/80">
          Tap days and time blocks below to set your free slots.
        </p>
      </div>

      {/* Notifications */}
      {error && (
        <div className="app-alert-error text-xs">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {saveSuccess && (
        <div className="app-alert-success text-xs">
          <CheckCircle className="w-4 h-4 flex-shrink-0" />
          Availability successfully saved!
        </div>
      )}

      {/* Horizontal Day Selector Tabs */}
      <div className="app-panel p-1.5">
        <div className="flex items-center justify-between gap-1 overflow-x-auto no-scrollbar">
          {DAYS.map((day) => {
            const isCurrent = activeDay === day.id;
            // Check if any slot is selected for this day
            const hasSlotsOnDay = TIME_SLOTS.some((slot) =>
              selectedSlots.includes(`${day.id}_${slot.id}`)
            );

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
                {hasSlotsOnDay && (
                  <span
                    className={`w-1.5 h-1.5 rounded-full mt-1 ${
                      isCurrent ? 'bg-white' : 'bg-primary'
                    }`}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Time Slot Selection Cards for Active Day */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <span className="text-xs font-bold uppercase tracking-wider text-muted">
            {selectedDayObj.fullLabel} Slots
          </span>
          <span className="text-xs text-subtle">Tap block to toggle</span>
        </div>

        {TIME_SLOTS.map((slot) => {
          const slotKey = `${activeDay}_${slot.id}`;
          const isSelected = selectedSlots.includes(slotKey);

          return (
            <button
              key={slot.id}
              type="button"
              onClick={() => toggleSlot(slotKey)}
              className={`flex w-full items-center justify-between rounded-app-lg border p-4 text-left transition-colors active:scale-[0.99] ${
                isSelected
                  ? 'border-primary bg-primary-soft text-text shadow-app-sm'
                  : 'border-border bg-surface text-text hover:border-primary-muted'
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    isSelected ? 'bg-primary text-white' : 'bg-surface-muted text-muted'
                  }`}
                >
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-bold text-sm">{slot.label}</div>
                  <div className="mt-0.5 text-xs text-muted">{slot.time}</div>
                </div>
              </div>

              <div
                className={`w-6 h-6 rounded-full border flex items-center justify-center transition-colors ${
                  isSelected
                    ? 'border-primary bg-primary text-white'
                    : 'border-border bg-surface'
                }`}
              >
                {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
              </div>
            </button>
          );
        })}
      </div>

{/* Bottom Save Action Bar */}
      <div className="-mx-1 mt-6 flex justify-center border-t border-border bg-surface p-4">
        <div className="w-full max-w-md">
          <button
            type="button"
            onClick={saveAvailability}
            disabled={saving}
            className="app-button-primary w-full py-3.5 shadow-app-md"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving Changes...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Save Availability
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};