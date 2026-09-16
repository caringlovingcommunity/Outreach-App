import React from 'react';
import { useAvailability } from '../hooks/useAvailability';
import { Calendar, Clock, Save, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

const DAYS = [
  { id: 'MON', label: 'Mon' },
  { id: 'TUE', label: 'Tue' },
  { id: 'WED', label: 'Wed' },
  { id: 'THU', label: 'Thu' },
  { id: 'FRI', label: 'Fri' },
  { id: 'SAT', label: 'Sat' },
  { id: 'SUN', label: 'Sun' },
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

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-white rounded-xl shadow-sm border border-gray-100">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mb-3" />
        <p className="text-sm text-gray-500 font-medium">Loading semester availability...</p>
      </div>
    );
  }

  if (!activeSemester) {
    return (
      <div className="p-6 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 flex items-center gap-3">
        <AlertCircle className="w-6 h-6 flex-shrink-0" />
        <div>
          <h3 className="font-semibold">No Active Semester</h3>
          <p className="text-sm text-amber-700 mt-0.5">
            There is currently no active semester configured. Please contact an outreach organizer.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-gray-100 bg-gray-50/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-indigo-600 font-semibold text-xs tracking-wider uppercase">
            <Calendar className="w-4 h-4" />
            Active Term
          </div>
          <h2 className="text-xl font-bold text-gray-900 mt-1">{activeSemester.name}</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Click time blocks to select when you are free for outreach.
          </p>
        </div>

        <button
          onClick={saveAvailability}
          disabled={saving}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white font-medium text-sm rounded-lg transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
        >
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              Save Availability
            </>
          )}
        </button>
      </div>

      {/* Status Messages */}
      {error && (
        <div className="mx-6 mt-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {saveSuccess && (
        <div className="mx-6 mt-6 p-4 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-700 text-sm flex items-center gap-2">
          <CheckCircle className="w-4 h-4 flex-shrink-0" />
          Availability successfully updated and saved!
        </div>
      )}

      {/* Grid Table */}
      <div className="p-6 overflow-x-auto">
        <table className="w-full min-w-[600px] border-collapse">
          <thead>
            <tr>
              <th className="p-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider w-36">
                Time Window
              </th>
              {DAYS.map((day) => (
                <th key={day.id} className="p-3 text-center text-xs font-bold text-gray-700 uppercase tracking-wider">
                  {day.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {TIME_SLOTS.map((slot) => (
              <tr key={slot.id}>
                <td className="py-4 px-3 text-left">
                  <div className="flex items-center gap-1.5 font-medium text-gray-900 text-sm">
                    <Clock className="w-3.5 h-3.5 text-gray-400" />
                    {slot.label}
                  </div>
                  <div className="text-xs text-gray-400 mt-0.5">{slot.time}</div>
                </td>
                {DAYS.map((day) => {
                  const slotKey = `${day.id}_${slot.id}`;
                  const isSelected = selectedSlots.includes(slotKey);

                  return (
                    <td key={day.id} className="p-1.5 text-center">
                      <button
                        type="button"
                        onClick={() => toggleSlot(slotKey)}
                        className={`w-full py-3 px-2 rounded-lg text-xs font-semibold transition-all duration-150 border ${
                          isSelected
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm hover:bg-indigo-700'
                            : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100 hover:border-gray-300'
                        }`}
                      >
                        {isSelected ? 'Available' : 'Free'}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};