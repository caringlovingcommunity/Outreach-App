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
      <div className="flex flex-col items-center justify-center p-8 bg-white rounded-2xl shadow-sm border border-gray-100 min-h-[300px]">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mb-3" />
        <p className="text-sm text-gray-500 font-medium">Loading availability...</p>
      </div>
    );
  }

  if (!activeSemester) {
    return (
      <div className="p-5 bg-amber-50 border border-amber-200 rounded-2xl text-amber-800 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
        <div>
          <h3 className="font-semibold text-sm">No Active Semester</h3>
          <p className="text-xs text-amber-700 mt-1">
            There is currently no active semester configured. Please contact an outreach organizer.
          </p>
        </div>
      </div>
    );
  }

  const selectedDayObj = DAYS.find((d) => d.id === activeDay) || DAYS[0];

  return (
    <div className="flex flex-col space-y-4 pb-20 mt-5">
      {/* Semester Banner Card */}
      <div className="bg-gradient-to-br from-indigo-600 to-indigo-700 text-white p-5 rounded-2xl shadow-sm">
        <div className="flex items-center gap-1.5 text-indigo-200 text-xs font-semibold tracking-wider uppercase">
          <Calendar className="w-3.5 h-3.5" />
          Active Term
        </div>
        <h2 className="text-lg font-bold mt-1">{activeSemester.name}</h2>
        <p className="text-xs text-indigo-100 mt-1">
          Tap days and time blocks below to set your free slots.
        </p>
      </div>

      {/* Notifications */}
      {error && (
        <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {saveSuccess && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-xs flex items-center gap-2">
          <CheckCircle className="w-4 h-4 flex-shrink-0" />
          Availability successfully saved!
        </div>
      )}

      {/* Horizontal Day Selector Tabs */}
      <div className="bg-white p-1.5 rounded-2xl border border-gray-200 shadow-sm">
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
                className={`flex-1 min-w-[44px] py-2.5 rounded-xl flex flex-col items-center justify-center transition-all ${
                  isCurrent
                    ? 'bg-indigo-600 text-white font-bold shadow-sm'
                    : 'text-gray-600 hover:bg-gray-100 font-medium'
                }`}
              >
                <span className="text-xs">{day.label}</span>
                {hasSlotsOnDay && (
                  <span
                    className={`w-1.5 h-1.5 rounded-full mt-1 ${
                      isCurrent ? 'bg-white' : 'bg-indigo-600'
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
          <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
            {selectedDayObj.fullLabel} Slots
          </span>
          <span className="text-xs text-gray-400">Tap block to toggle</span>
        </div>

        {TIME_SLOTS.map((slot) => {
          const slotKey = `${activeDay}_${slot.id}`;
          const isSelected = selectedSlots.includes(slotKey);

          return (
            <button
              key={slot.id}
              type="button"
              onClick={() => toggleSlot(slotKey)}
              className={`w-full p-4 rounded-2xl border text-left transition-all flex items-center justify-between active:scale-[0.98] ${
                isSelected
                  ? 'bg-indigo-50 border-indigo-500 text-indigo-950 shadow-sm'
                  : 'bg-white border-gray-200 text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    isSelected ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-500'
                  }`}
                >
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-bold text-sm">{slot.label}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{slot.time}</div>
                </div>
              </div>

              <div
                className={`w-6 h-6 rounded-full border flex items-center justify-center transition-colors ${
                  isSelected
                    ? 'bg-indigo-600 border-indigo-600 text-white'
                    : 'border-gray-300 bg-white'
                }`}
              >
                {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
              </div>
            </button>
          );
        })}
      </div>

      {/* Sticky Bottom Save Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/90 backdrop-blur-md border-t border-gray-200 flex justify-center z-50">
        <div className="w-full max-w-md">
          <button
            type="button"
            onClick={saveAvailability}
            disabled={saving}
            className="w-full py-3.5 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white font-bold text-sm rounded-xl shadow-lg shadow-indigo-200 flex items-center justify-center gap-2 transition-all active:scale-[0.99]"
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