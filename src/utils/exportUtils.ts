import type { SlotAggregation } from '../hooks/useOrganizerHeatmap';
import type { Semester } from '../types';

const DAYS = [
  { id: 'MON', label: 'Monday' },
  { id: 'TUE', label: 'Tuesday' },
  { id: 'WED', label: 'Wednesday' },
  { id: 'THU', label: 'Thursday' },
  { id: 'FRI', label: 'Friday' },
  { id: 'SAT', label: 'Saturday' },
  { id: 'SUN', label: 'Sunday' },
];

const TIME_SLOTS = [
  { id: '0800_1100', label: 'Morning (08:00 - 11:00)' },
  { id: '1400_1700', label: 'Afternoon (14:00 - 17:00)' },
  { id: '1900_2200', label: 'Evening (19:00 - 22:00)' },
];

/**
 * Formats day availability into a clean plain-text string suitable for WhatsApp / Telegram sharing.
 */
export const generateFormattedDaySummary = (
  dayId: string,
  aggregations: Record<string, SlotAggregation>
): string => {
  const dayObj = DAYS.find((d) => d.id === dayId) || DAYS[0];
  let text = `*📅 ${dayObj.label} Outreach Availability*\n\n`;

  let totalFree = 0;

  TIME_SLOTS.forEach((slot) => {
    const slotKey = `${dayId}_${slot.id}`;
    const agg = aggregations[slotKey];
    const users = agg?.availableUsers || [];

    text += `*${slot.label}* (${users.length} Free):\n`;

    if (users.length === 0) {
      text += `  • No students available\n`;
    } else {
      users.forEach((u) => {
        text += `  • ${u.displayName}\n`;
        totalFree++;
      });
    }
    text += `\n`;
  });

  text += `_Total student-slot windows: ${totalFree}_\n`;

  return text;
};

/**
 * Generates and triggers a download of a CSV file containing all team availabilities for the semester.
 */
export const downloadSemesterCSV = (
  activeSemester: Semester | null,
  aggregations: Record<string, SlotAggregation>
) => {
  const semesterName = activeSemester ? activeSemester.name : 'Active Semester';
  
  // Build CSV Header
  const headers = ['Day', 'Time Window', 'Slot Key', 'Student Name', 'Student Email'];
  const rows: string[][] = [];

  DAYS.forEach((day) => {
    TIME_SLOTS.forEach((slot) => {
      const slotKey = `${day.id}_${slot.id}`;
      const agg = aggregations[slotKey];
      const users = agg?.availableUsers || [];

      if (users.length === 0) {
        rows.push([day.label, slot.label, slotKey, 'None', 'None']);
      } else {
        users.forEach((user) => {
          // Escape quotes in names to ensure CSV safety
          const safeName = `"${(user.displayName || 'Unknown').replace(/"/g, '""')}"`;
          const safeEmail = `"${(user.email || '').replace(/"/g, '""')}"`;
          rows.push([day.label, slot.label, slotKey, safeName, safeEmail]);
        });
      }
    });
  });

  // Convert array to CSV string
  const csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');

  // Trigger file download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  const fileName = `outreach_availability_${activeSemester?.semesterId || 'export'}.csv`;
  link.setAttribute('download', fileName);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};