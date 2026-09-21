import React, { useEffect, useState } from 'react';
import { addDoc, collection, deleteDoc, doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { CalendarDays, Loader2, Pencil, Plus, Trash2, Users, X } from 'lucide-react';
import { db } from '../services/firebase';
import type { UserProfile } from '../types';
import { EventParticipation } from './EventParticipation';
import { SlotPairingModal, type AvailableStudent } from './organizer/SlotPairingModal';
import { formatEventDate, getEventDateCountdown, subscribeToEventSlotSignups, subscribeToEvents, slotId } from '../services/eventsService';

interface EventDateEntry {
  date: string;
  timeSlots: string[];
}

interface EventRecord {
  id: string;
  name: string;
  description?: string;
  location?: string;
  imageUrl?: string;
  createdByUid?: string;
  createdByName?: string;
  dates: EventDateEntry[];
}

const DEFAULT_SLOTS = ['08:00 - 11:00', '14:00 - 17:00', '19:00 - 22:00'];

const emptyDateEntry = (): EventDateEntry => ({ date: '', timeSlots: [...DEFAULT_SLOTS] });

interface Props {
  user: UserProfile;
}

export const OrganizerEvents: React.FC<Props> = ({ user }) => {
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [viewingEvent, setViewingEvent] = useState<EventRecord | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [dates, setDates] = useState<EventDateEntry[]>([emptyDateEntry()]);
  const [pairingSlot, setPairingSlot] = useState<{
    eventId: string;
    eventCreatorUid: string;
    label: string;
    slotId: string;
    participants: AvailableStudent[];
  } | null>(null);

  useEffect(() => {
    setLoading(true);
    const unsubscribe = subscribeToEvents((nextEvents) => {
      setEvents(nextEvents.map((event) => ({
        ...event,
        dates: event.dates.map((date) => ({ date: date.date, timeSlots: date.slots.map((slot) => slot.label) })),
      })));
      setLoading(false);
    }, () => {
      setError('Unable to load events. Please try again.');
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!pairingSlot) return undefined;
    return subscribeToEventSlotSignups(pairingSlot.eventId, pairingSlot.slotId, (signups) => {
      setPairingSlot((current) => current
        ? { ...current, participants: signups.map((signup) => ({ uid: signup.userId, displayName: signup.displayName })) }
        : current);
    }, () => setError('Unable to load participants for this slot.'));
  }, [pairingSlot?.eventId, pairingSlot?.slotId]);

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
    setDescription('');
    setLocation('');
    setImageUrl('');
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
    setDescription(targetEvent.description || '');
    setLocation(targetEvent.location || '');
    setImageUrl(targetEvent.imageUrl || '');
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
          description: description.trim(),
          location: location.trim(),
          imageUrl: imageUrl.trim(),
          dates: cleanedDates,
          updatedAt: serverTimestamp(),
        });
      } else {
        await addDoc(collection(db, 'events'), {
          name: name.trim(),
          description: description.trim(),
          location: location.trim(),
          imageUrl: imageUrl.trim(),
          createdByUid: user.uid,
          createdByName: user.displayName,
          dates: cleanedDates,
          createdAt: serverTimestamp(),
        });
      }
      resetForm();
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
    } catch (deleteError) {
      console.error('Failed to delete event:', deleteError);
      setError('Unable to delete the event. Please check your permissions.');
    } finally {
      setDeletingId(null);
    }
  };

  const openPairing = (event: EventRecord, date: EventDateEntry, label: string) => {
    const normalizedSlotId = slotId(date.date, label);
    setPairingSlot({ eventId: event.id, eventCreatorUid: event.createdByUid || user.uid, label: `${formatEventDate(date.date)} • ${label}`, slotId: normalizedSlotId, participants: [] });
  };

  return (
    <section className="space-y-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">Event planning</p>
          <h2 className="mt-1 text-2xl font-bold text-text">Outreach events</h2>
          <p className="mt-1 text-sm text-muted">Create dates and time windows for participants to join.</p>
        </div>
        <button
          type="button"
          onClick={() => (showForm ? resetForm() : startCreate())}
          className="app-button-primary"
        >
          <Plus className="h-4 w-4" />
          Create Event
        </button>
      </div>

      {error && <div className="app-alert-error">{error}</div>}

      {showForm && (
        <form onSubmit={saveEvent} className="app-panel p-5 sm:p-6">
          <h3 className="text-base font-semibold text-text">{editingEventId ? 'Edit event details' : 'New event details'}</h3>
          <label className="mt-4 block">
            <span className="app-label">Event name</span>
            <input required value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Community Food Drive" className="app-input" />
          </label>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="app-label">Location</span>
              <input value={location} onChange={(event) => setLocation(event.target.value)} placeholder="e.g. CLC Centre" className="app-input" />
            </label>
            <label className="block">
              <span className="app-label">Image or event link</span>
              <input type="url" value={imageUrl} onChange={(event) => setImageUrl(event.target.value)} placeholder="https://..." className="app-input" />
            </label>
          </div>
          <label className="mt-4 block">
            <span className="app-label">Description</span>
            <textarea value={description} onChange={(event) => setDescription(event.target.value)} placeholder="What should participants know?" rows={3} className="app-input" />
          </label>

          <div className="mt-5">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-semibold text-text">Event dates &amp; slots</h4>
                <p className="mt-0.5 text-xs text-muted">Add each day the event runs and its own joinable time slots — dates don't need to be consecutive.</p>
              </div>
              <button type="button" onClick={addDate} className="app-button-text min-h-8 px-1 text-xs">+ Add date</button>
            </div>

            <div className="mt-3 space-y-4">
              {dates.map((entry, dateIndex) => (
                <div key={dateIndex} className="rounded-app-md border border-border bg-surface-muted p-3">
                  <div className="flex gap-2">
                    <input required type="date" value={entry.date} onChange={(event) => updateDate(dateIndex, event.target.value)} className="app-input min-w-0 flex-1" />
                    {dates.length > 1 && <button type="button" onClick={() => removeDate(dateIndex)} className="app-button-text px-2 text-xs text-error hover:bg-error-soft hover:text-error">Remove date</button>}
                  </div>

                  <div className="mt-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold uppercase tracking-wide text-muted">Joinable time slots</span>
                      <button type="button" onClick={() => addSlot(dateIndex)} className="app-button-text min-h-8 px-1 text-xs">+ Add slot</button>
                    </div>
                    <div className="mt-2 space-y-2">
                      {entry.timeSlots.map((slot, slotIndex) => (
                        <div key={slotIndex} className="flex gap-2">
                          <input value={slot} onChange={(event) => updateSlot(dateIndex, slotIndex, event.target.value)} placeholder="e.g. 09:00 - 11:00" className="app-input min-w-0 flex-1 py-2" />
                          {entry.timeSlots.length > 1 && <button type="button" onClick={() => removeSlot(dateIndex, slotIndex)} className="app-button-text px-2 text-xs text-error hover:bg-error-soft hover:text-error">Remove</button>}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-5 flex justify-end gap-2 border-t border-border pt-4">
            <button type="button" onClick={resetForm} className="app-button-secondary">Cancel</button>
            <button type="submit" disabled={saving} className="app-button-primary">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {saving ? 'Saving...' : editingEventId ? 'Save Changes' : 'Create Event'}
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="app-loading-state min-h-40"><Loader2 className="h-7 w-7 animate-spin text-primary" /></div>
      ) : events.length === 0 ? (
        <div className="app-empty-state border-dashed">
          <CalendarDays className="mx-auto h-8 w-8 text-subtle" />
          <p className="mt-3 text-sm font-medium text-text">No events created yet.</p>
          <p className="mt-1 text-xs text-muted">Create the first event for participants to join.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {events.map((event) => (
            <article key={event.id} className="app-panel p-5">
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-lg font-semibold text-text">{event.name}</h3>
                <span className="flex-shrink-0 text-xs font-medium text-muted">{event.dates.length} {event.dates.length === 1 ? 'date' : 'dates'}</span>
              </div>
              <div className="mt-3 space-y-3 text-sm text-muted">
                {event.dates.slice(0, 2).map((entry, index) => (
                  <div key={index} className="flex items-start gap-2">
                    <CalendarDays className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
                    <div>
                      <div className="flex flex-wrap items-center gap-2 font-medium text-text">{formatEventDate(entry.date)}<span className="rounded-full bg-primary-soft px-2 py-0.5 text-[10px] font-semibold text-primary">{getEventDateCountdown(entry.date)}</span></div>
                      <div className="mt-0.5 flex items-start gap-1.5 text-xs text-muted">
                        <Users className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
                        <span>{entry.timeSlots.join(' • ') || 'No time slots configured'}</span>
                      </div>
                    </div>
                  </div>
                ))}
                {event.dates.length > 2 && (
                  <p className="pl-6 text-xs font-medium text-subtle">+{event.dates.length - 2} more {event.dates.length - 2 === 1 ? 'date' : 'dates'}</p>
                )}
              </div>
              <div className="mt-4 flex justify-end gap-2 border-t border-border pt-3">
                <button type="button" onClick={() => setViewingEvent(event)} className="app-button-text min-h-9 px-3 py-1.5 text-xs">View details</button>
                <button type="button" onClick={() => startEdit(event)} className="app-button-text min-h-9 px-3 py-1.5 text-xs">
                  <Pencil className="h-3.5 w-3.5" />
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => deleteEvent(event.id)}
                  disabled={deletingId === event.id}
                  className="app-button-text min-h-9 px-3 py-1.5 text-xs text-error hover:bg-error-soft hover:text-error"
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
        <div className="app-modal-backdrop items-end justify-center">
          <div className="app-modal max-h-[80vh] space-y-4">
            <div className="flex items-start justify-between border-b border-border pb-3">
              <div>
                <h3 className="text-base font-bold text-text">{viewingEvent.name}</h3>
                <p className="mt-0.5 text-xs text-muted">{viewingEvent.dates.length} {viewingEvent.dates.length === 1 ? 'date' : 'dates'} configured</p>
              </div>
              <button onClick={() => setViewingEvent(null)} className="app-icon-button size-9">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 space-y-3 overflow-y-auto pr-1">
              {viewingEvent.dates.map((entry, index) => (
                <div key={index} className="rounded-app-md border border-border bg-surface-muted p-3">
                  <div className="flex items-center gap-2 font-medium text-text">
                    <CalendarDays className="h-4 w-4 text-primary" />
                    <span>{formatEventDate(entry.date)}</span>
                    <span className="rounded-full bg-primary-soft px-2 py-0.5 text-[10px] font-semibold text-primary">{getEventDateCountdown(entry.date)}</span>
                  </div>
                  <div className="mt-1.5 flex items-start gap-1.5 text-xs text-muted">
                    <Users className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
                    <div className="flex flex-wrap gap-1.5">
                      {entry.timeSlots.length ? (
                        (user.role === 'admin' || viewingEvent.createdByUid === user.uid) ? entry.timeSlots.map((label) => (
                          <button key={label} type="button" onClick={() => void openPairing(viewingEvent, entry, label)} className="app-button-text min-h-8 px-2 py-1 text-xs">
                            Manage {label}
                          </button>
                        )) : <span>{entry.timeSlots.join(' • ')}</span>
                      ) : <span>No time slots configured</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-2 border-t border-border pt-3">
              <button type="button" onClick={() => deleteEvent(viewingEvent.id)} className="app-button-text min-h-9 px-3 py-1.5 text-xs text-error hover:bg-error-soft hover:text-error">
                <Trash2 className="h-3.5 w-3.5" />
                Delete
              </button>
              <button type="button" onClick={() => startEdit(viewingEvent)} className="app-button-primary min-h-9 px-3 py-1.5 text-xs">
                <Pencil className="h-3.5 w-3.5" />
                Edit
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="border-t border-border pt-8">
        <EventParticipation user={user} heading={false} />
      </div>

      {pairingSlot && (
        <SlotPairingModal
          isOpen
          onClose={() => setPairingSlot(null)}
          eventId={pairingSlot.eventId}
          slotId={pairingSlot.slotId}
          createdByUid={pairingSlot.eventCreatorUid}
          slotLabel={pairingSlot.label}
          availableStudents={pairingSlot.participants}
        />
      )}
    </section>
  );
};
