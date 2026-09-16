import React, { useState } from 'react';
import type { Semester, UserProfile } from '../types';
import { useOrganizerHeatmap } from '../hooks/useOrganizerHeatmap';
import { Users, Clock, Loader2, AlertCircle, X, ChevronRight } from 'lucide-react';

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

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-8 bg-white rounded-2xl shadow-sm border border-gray-100 min-h-[300px]">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mb-3" />
        <p className="text-sm text-gray-500 font-medium">Aggregating team schedules...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-xs flex items-center gap-2">
        <AlertCircle className="w-4 h-4 flex-shrink-0" />
        {error}
      </div>
    );
  }

  const selectedDayObj = DAYS.find((d) => d.id === activeDay) || DAYS[0];

  return (
    <div className="flex flex-col space-y-4 pb-20 mt-5">
      {/* Overview Stats Banner */}
      <div className="bg-gradient-to-br from-purple-700 to-indigo-800 text-white p-5 rounded-2xl shadow-sm flex items-center justify-between">
        <div>
          <div className="flex items-center gap-1.5 text-purple-200 text-xs font-semibold tracking-wider uppercase">
            <Users className="w-3.5 h-3.5" />
            Team Aggregation
          </div>
          <h2 className="text-lg font-bold mt-1">Outreach Availability</h2>
          <p className="text-xs text-purple-100 mt-1">
            {totalStudentsSubmitted} {totalStudentsSubmitted === 1 ? 'student has' : 'students have'} submitted responses
          </p>
        </div>
        <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-sm flex flex-col items-center justify-center border border-white/20">
          <span className="text-lg font-extrabold">{totalStudentsSubmitted}</span>
          <span className="text-[9px] uppercase font-bold text-purple-200">Total</span>
        </div>
      </div>

      {/* Horizontal Day Selector */}
      <div className="bg-white p-1.5 rounded-2xl border border-gray-200 shadow-sm">
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
                className={`flex-1 min-w-[44px] py-2.5 rounded-xl flex flex-col items-center justify-center transition-all ${
                  isCurrent
                    ? 'bg-purple-700 text-white font-bold shadow-sm'
                    : 'text-gray-600 hover:bg-gray-100 font-medium'
                }`}
              >
                <span className="text-xs">{day.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full mt-1 font-semibold ${
                    isCurrent ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'
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
          <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
            {selectedDayObj.fullLabel} Heatmap
          </span>
          <span className="text-xs text-gray-400">Tap card for names</span>
        </div>

        {TIME_SLOTS.map((slot) => {
          const slotKey = `${activeDay}_${slot.id}`;
          const aggData = aggregations[slotKey] || { slotKey, count: 0, availableUsers: [] };
          const count = aggData.count;

          // Color intensity calculations
          let intensityClass = 'bg-white border-gray-200 text-gray-700';
          let badgeClass = 'bg-gray-100 text-gray-600';

          if (count >= 4) {
            intensityClass = 'bg-purple-50 border-purple-400 text-purple-950 shadow-sm';
            badgeClass = 'bg-purple-700 text-white font-bold';
          } else if (count >= 2) {
            intensityClass = 'bg-indigo-50/70 border-indigo-300 text-indigo-950';
            badgeClass = 'bg-indigo-600 text-white font-bold';
          } else if (count === 1) {
            intensityClass = 'bg-slate-50 border-slate-200 text-slate-800';
            badgeClass = 'bg-slate-200 text-slate-700 font-medium';
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
              className={`w-full p-4 rounded-2xl border text-left transition-all flex items-center justify-between active:scale-[0.98] ${intensityClass} ${
                count === 0 ? 'opacity-60 cursor-not-allowed' : 'hover:border-purple-300'
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    count > 0 ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-400'
                  }`}
                >
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-bold text-sm">{slot.label}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{slot.time}</div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className={`px-2.5 py-1 rounded-full text-xs ${badgeClass}`}>
                  {count} {count === 1 ? 'Student' : 'Students'} Free
                </span>
                {count > 0 && <ChevronRight className="w-4 h-4 text-gray-400" />}
              </div>
            </button>
          );
        })}
      </div>

      {/* Bottom Student Detail Drawer */}
      {selectedSlotModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-end justify-center p-0 sm:p-4">
          <div className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl p-5 space-y-4 max-h-[80vh] flex flex-col animate-in slide-in-from-bottom duration-200">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <h3 className="font-bold text-gray-900 text-base">
                  {selectedSlotModal.dayLabel} • {selectedSlotModal.slotLabel}
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  {selectedSlotModal.users.length} available {selectedSlotModal.users.length === 1 ? 'student' : 'students'}
                </p>
              </div>
              <button
                onClick={() => setSelectedSlotModal(null)}
                className="p-1.5 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto space-y-2.5 flex-1 pr-1">
              {selectedSlotModal.users.map((st) => (
                <div
                  key={st.uid}
                  className="p-3 bg-gray-50 rounded-xl flex items-center gap-3 border border-gray-100"
                >
                  {st.photoURL ? (
                    <img
                      src={st.photoURL}
                      alt={st.displayName}
                      className="w-9 h-9 rounded-full border border-gray-200"
                    />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-purple-100 text-purple-700 font-bold flex items-center justify-center text-xs">
                      {st.displayName?.charAt(0) || 'S'}
                    </div>
                  )}
                  <div>
                    <div className="font-bold text-sm text-gray-900">{st.displayName}</div>
                    <div className="text-xs text-gray-500">{st.email}</div>
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