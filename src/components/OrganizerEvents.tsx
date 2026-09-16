import React, { useEffect, useState } from 'react';
import { addDoc, collection, deleteDoc, doc, getDocs, orderBy, query, serverTimestamp, updateDoc } from 'firebase/firestore';
import { CalendarDays, Loader2, Pencil, Plus, Trash2, Users, X } from 'lucide-react';
import { db } from '../services/firebase';

interface EventDateEntry {
  date: string;
  timeSlots: string[];
}

interface EventRecord {
  id: string;
  name: string;
  dates: EventDateEntry[];
}

const DEFAULT_SLOTS = ['08:00 - 11:00', '14:00 - 17:00', '19:00 - 22:00'];

const emptyDateEntry = (): EventDateEntry => ({ date: '', timeSlots: [...DEFAULT_SLOTS] });

export const OrganizerEvents: React.FC = () => {
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [viewingEvent, setViewingEvent] = useState<EventRecord | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [dates, setDates] = useState<EventDateEntry[]>([emptyDateEntry()]);

  const loadEvents = async () => {
    try {
      setLoading(true);
      const snapshot = await getDocs(query(collection(db, 'events'), orderBy('createdAt', 'desc')));
      setEvents(snapshot.docs.map((eventDoc) => ({
        id: eventDoc.id,
        ...(eventDoc.data() as Omit<EventRecord, 'id'>),
      })));
    } catch (loadError) {
      console.error('Failed to load events:', loadError);
      setError('Unable to load events. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadEvents();
  }, []);

  const updateDate = (index: number, value: string) => {
    setDates((current) => current.map((entry, entryIndex) => entryIndex === index ? { ...entry, date: value } : entry));
  };

  const addDate = () => setDates((current) => [...current, emptyDateEntry()]);

  const removeDate = (index: number) => {
    setDates((current) => current.filter((_, entryIndex) => entryIndex !== index));
  };

  const updateSlot = (dateIndex: number, slotIndex: number, value: string) => {
    setDates((current) => current.map((entry, entryIndex) => {
      if (entryIndex !== dateIndex) return entry;
      return { ...entry, timeSlots: entry.timeSlots.map((slot, i) => i === slotIndex ? value : slot) };
    }));
  };

  const addSlot = (dateIndex: number) => {
    setDates((current) => current.map((entry, entryIndex) => entryIndex === dateIndex ? { ...entry, timeSlots: [...entry.timeSlots, ''] } : entry));
  };

  const removeSlot = (dateIndex: number, slotIndex: number) => {
    setDates((current) => current.map((entry, entryIndex) => {
      if (entryIndex !== dateIndex) return entry;
      return { ...entry, timeSlots: entry.timeSlots.filter((_, i) => i !== slotIndex) };
    }));
  };

  const resetForm = () => {
    setName('');
    setDates([emptyDateEntry()]);
    setEditingEventId(null);
    setShowForm(false);
  };

  const startCreate = () => {
    resetForm();
    setShowForm(true);
  };

  const startEdit = (targetEvent: EventRecord) => {
    setName(targetEvent.name);
    setDates(targetEvent.dates.map((entry) => ({ date: entry.date, timeSlots: [...entry.timeSlots] })));
    setEditingEventId(targetEvent.id);
    setViewingEvent(null);
    setShowForm(true);
  };

  const saveEvent = async (event: React.FormEvent) => {
    event.preventDefault();
    const cleanedDates = dates
      .filter((entry) => entry.date)
      .map((entry) => ({
        date: entry.date,
        timeSlots: entry.timeSlots.map((slot) => slot.trim()).filter(Boolean),
      }));
    if (!name.trim() || cleanedDates.length === 0) return;

    try {
      setSaving(true);
      setError(null);
      if (editingEventId) {
        await updateDoc(doc(db, 'events', editingEventId), {
          name: name.trim(),
          dates: cleanedDates,
        });
      } else {
        await addDoc(collection(db, 'events'), {
          name: name.trim(),
          dates: cleanedDates,
          createdAt: serverTimestamp(),
        });
      }
      resetForm();
      await loadEvents();
    } catch (saveError) {
      console.error('Failed to save event:', saveError);
      setError('Unable to save the event. Please check your permissions.');
    } finally {
      setSaving(false);
    }
  };

  const deleteEvent = async (eventId: string) => {
    if (!window.confirm('Delete this event? This cannot be undone.')) return;

    try {
      setDeletingId(eventId);
      await deleteDoc(doc(db, 'events', eventId));
      setViewingEvent(null);
      await loadEvents();
    } catch (deleteError) {
      console.error('Failed to delete event:', deleteError);
      setError('Unable to delete the event. Please check your permissions.');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <section className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-indigo-600">Event planning</p>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight text-stone-900">Outreach events</h2>
          <p className="mt-1 text-sm text-stone-600">Create dates and time windows for participants to join.</p>
        </div>
        <button
          type="button"
          onClick={() => (showForm ? resetForm() : startCreate())}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-700"
        >
          <Plus className="h-4 w-4" />
          Create Event
        </button>
      </div>

      {error && <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}

      {showForm && (
        <form onSubmit={saveEvent} className="rounded-2xl border border-indigo-100 bg-white p-5 shadow-sm sm:p-6">
          <h3 className="text-base font-semibold text-stone-900">{editingEventId ? 'Edit event details' : 'New event details'}</h3>
          <label className="mt-4 block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-stone-500">Event name</span>
            <input required value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Community Food Drive" className="w-full rounded-xl border border-stone-300 px-3 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" />
          </label>

          <div className="mt-5">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-semibold text-stone-900">Event dates &amp; slots</h4>
                <p className="mt-0.5 text-xs text-stone-500">Add each day the event runs and its own joinable time slots — dates don't need to be consecutive.</p>
              </div>
              <button type="button" onClick={addDate} className="text-xs font-semibold text-indigo-600 hover:text-indigo-700">+ Add date</button>
            </div>

            <div className="mt-3 space-y-4">
              {dates.map((entry, dateIndex) => (
                <div key={dateIndex} className="rounded-xl border border-stone-200 bg-stone-50 p-3">
                  <div className="flex gap-2">
                    <input required type="date" value={entry.date} onChange={(event) => updateDate(dateIndex, event.target.value)} className="min-w-0 flex-1 rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" />
                    {dates.length > 1 && <button type="button" onClick={() => removeDate(dateIndex)} className="px-2 text-xs font-medium text-stone-500 hover:text-red-600">Remove date</button>}
                  </div>

                  <div className="mt-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold uppercase tracking-wide text-stone-500">Joinable time slots</span>
                      <button type="button" onClick={() => addSlot(dateIndex)} className="text-xs font-semibold text-indigo-600 hover:text-indigo-700">+ Add slot</button>
                    </div>
                    <div className="mt-2 space-y-2">
                      {entry.timeSlots.map((slot, slotIndex) => (
                        <div key={slotIndex} className="flex gap-2">
                          <input value={slot} onChange={(event) => updateSlot(dateIndex, slotIndex, event.target.value)} placeholder="e.g. 09:00 - 11:00" className="min-w-0 flex-1 rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" />
                          {entry.timeSlots.length > 1 && <button type="button" onClick={() => removeSlot(dateIndex, slotIndex)} className="px-2 text-xs font-medium text-stone-500 hover:text-red-600">Remove</button>}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-5 flex justify-end gap-2 border-t border-stone-100 pt-4">
            <button type="button" onClick={resetForm} className="rounded-xl px-4 py-2.5 text-sm font-medium text-stone-600 hover:bg-stone-100">Cancel</button>
            <button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-stone-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-stone-800 disabled:opacity-50">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {saving ? 'Saving...' : editingEventId ? 'Save Changes' : 'Create Event'}
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="flex min-h-40 items-center justify-center rounded-2xl border border-stone-200 bg-white"><Loader2 className="h-7 w-7 animate-spin text-indigo-600" /></div>
      ) : events.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-stone-300 bg-white p-10 text-center">
          <CalendarDays className="mx-auto h-8 w-8 text-stone-400" />
          <p className="mt-3 text-sm font-medium text-stone-700">No events created yet.</p>
          <p className="mt-1 text-xs text-stone-500">Create the first event for participants to join.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {events.map((event) => (
            <article key={event.id} className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-lg font-semibold text-stone-900">{event.name}</h3>
                <span className="flex-shrink-0 text-xs font-medium text-stone-500">{event.dates.length} {event.dates.length === 1 ? 'date' : 'dates'}</span>
              </div>
              <div className="mt-3 space-y-3 text-sm text-stone-600">
                {event.dates.slice(0, 2).map((entry, index) => (
                  <div key={index} className="flex items-start gap-2">
                    <CalendarDays className="mt-0.5 h-4 w-4 flex-shrink-0 text-indigo-600" />
                    <div>
                      <div className="font-medium text-stone-800">{entry.date}</div>
                      <div className="mt-0.5 flex items-start gap-1.5 text-xs text-stone-500">
                        <Users className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
                        <span>{entry.timeSlots.join(' • ') || 'No time slots configured'}</span>
                      </div>
                    </div>
                  </div>
                ))}
                {event.dates.length > 2 && (
                  <p className="pl-6 text-xs font-medium text-stone-400">+{event.dates.length - 2} more {event.dates.length - 2 === 1 ? 'date' : 'dates'}</p>
                )}
              </div>
              <div className="mt-4 flex justify-end gap-2 border-t border-stone-100 pt-3">
                <button type="button" onClick={() => setViewingEvent(event)} className="rounded-lg px-3 py-1.5 text-xs font-semibold text-stone-600 hover:bg-stone-100">View details</button>
                <button type="button" onClick={() => startEdit(event)} className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold text-indigo-600 hover:bg-indigo-50">
                  <Pencil className="h-3.5 w-3.5" />
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => deleteEvent(event.id)}
                  disabled={deletingId === event.id}
                  className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
                >
                  {deletingId === event.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                  Delete
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      {viewingEvent && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 backdrop-blur-xs sm:items-center sm:p-4">
          <div className="flex max-h-[80vh] w-full max-w-md flex-col space-y-4 rounded-t-3xl bg-white p-5 sm:rounded-3xl">
            <div className="flex items-start justify-between border-b border-stone-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-stone-900">{viewingEvent.name}</h3>
                <p className="mt-0.5 text-xs text-stone-500">{viewingEvent.dates.length} {viewingEvent.dates.length === 1 ? 'date' : 'dates'} configured</p>
              </div>
              <button onClick={() => setViewingEvent(null)} className="rounded-full p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 space-y-3 overflow-y-auto pr-1">
              {viewingEvent.dates.map((entry, index) => (
                <div key={index} className="rounded-xl border border-stone-100 bg-stone-50 p-3">
                  <div className="flex items-center gap-2 font-medium text-stone-800">
                    <CalendarDays className="h-4 w-4 text-indigo-600" />
                    {entry.date}
                  </div>
                  <div className="mt-1.5 flex items-start gap-1.5 text-xs text-stone-600">
                    <Users className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
                    <span>{entry.timeSlots.join(' • ') || 'No time slots configured'}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-2 border-t border-stone-100 pt-3">
              <button type="button" onClick={() => deleteEvent(viewingEvent.id)} className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50">
                <Trash2 className="h-3.5 w-3.5" />
                Delete
              </button>
              <button type="button" onClick={() => startEdit(viewingEvent)} className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700">
                <Pencil className="h-3.5 w-3.5" />
                Edit
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
