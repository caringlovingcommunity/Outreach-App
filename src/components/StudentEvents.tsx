import React, { useEffect, useState } from 'react';
import { collection, deleteDoc, doc, getDocs, orderBy, query, serverTimestamp, setDoc, where } from 'firebase/firestore';
import { CalendarDays, Check, Loader2, AlertCircle } from 'lucide-react';
import { db } from '../services/firebase';
import type { UserProfile } from '../types';

interface EventDateEntry {
  date: string;
  timeSlots: string[];
}

interface EventRecord {
  id: string;
  name: string;
  dates: EventDateEntry[];
}

interface Props {
  user: UserProfile;
}

// Deterministic id keeps join/leave idempotent without an extra query per toggle.
const signupId = (uid: string, eventId: string, dateIndex: number, slotIndex: number) =>
  `${uid}_${eventId}_${dateIndex}_${slotIndex}`;

export const StudentEvents: React.FC<Props> = ({ user }) => {
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [joinedKeys, setJoinedKeys] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingKey, setPendingKey] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [eventsSnapshot, signupsSnapshot] = await Promise.all([
        getDocs(query(collection(db, 'events'), orderBy('createdAt', 'desc'))),
        getDocs(query(collection(db, 'eventSignups'), where('userId', '==', user.uid))),
      ]);

      setEvents(eventsSnapshot.docs.map((eventDoc) => ({
        id: eventDoc.id,
        ...(eventDoc.data() as Omit<EventRecord, 'id'>),
      })));

      setJoinedKeys(new Set(signupsSnapshot.docs.map((signupDoc) => signupDoc.id)));
    } catch (loadError) {
      console.error('Failed to load events:', loadError);
      setError('Unable to load events. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.uid]);

  const toggleSlot = async (event: EventRecord, dateIndex: number, dateEntry: EventDateEntry, slotIndex: number, slot: string) => {
    const key = signupId(user.uid, event.id, dateIndex, slotIndex);
    const isJoined = joinedKeys.has(key);

    try {
      setPendingKey(key);
      setError(null);
      if (isJoined) {
        await deleteDoc(doc(db, 'eventSignups', key));
        setJoinedKeys((current) => {
          const next = new Set(current);
          next.delete(key);
          return next;
        });
      } else {
        await setDoc(doc(db, 'eventSignups', key), {
          userId: user.uid,
          displayName: user.displayName,
          email: user.email,
          eventId: event.id,
          eventName: event.name,
          date: dateEntry.date,
          slot,
          createdAt: serverTimestamp(),
        });
        setJoinedKeys((current) => new Set(current).add(key));
      }
    } catch (toggleError) {
      console.error('Failed to update signup:', toggleError);
      setError('Unable to update your signup. Please check your permissions.');
    } finally {
      setPendingKey(null);
    }
  };

  if (loading) {
    return (
      <div className="app-loading-state">
        <Loader2 className="mb-3 h-8 w-8 animate-spin text-primary" />
        <p className="text-sm font-medium text-muted">Loading events...</p>
      </div>
    );
  }

  return (
    <div className="mt-2 flex flex-col space-y-4 pb-20">
      <div className="rounded-app-lg bg-primary p-5 text-white shadow-app-sm">
        <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-white/75">
          <CalendarDays className="w-3.5 h-3.5" />
          Outreach Events
        </div>
        <h2 className="text-lg font-bold mt-1">Join a time slot</h2>
        <p className="mt-1 text-xs text-white/80">Tap a slot below to sign up. Tap again to leave.</p>
      </div>

      {error && (
        <div className="app-alert-error text-xs">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {events.length === 0 ? (
        <div className="app-empty-state border-dashed">
          <CalendarDays className="mx-auto h-8 w-8 text-subtle" />
          <p className="mt-3 text-sm font-medium text-text">No events yet.</p>
          <p className="mt-1 text-xs text-muted">Check back later for outreach events to join.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {events.map((event) => (
            <div key={event.id} className="app-panel p-5">
              <h3 className="text-base font-bold text-text">{event.name}</h3>
              <div className="mt-3 space-y-3">
                {event.dates.map((dateEntry, dateIndex) => (
                  <div key={dateIndex}>
                    <div className="text-xs font-bold uppercase tracking-wider text-muted">{dateEntry.date}</div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {dateEntry.timeSlots.length === 0 ? (
                        <span className="text-xs text-subtle">No time slots configured</span>
                      ) : (
                        dateEntry.timeSlots.map((slot, slotIndex) => {
                          const key = signupId(user.uid, event.id, dateIndex, slotIndex);
                          const isJoined = joinedKeys.has(key);
                          const isPending = pendingKey === key;

                          return (
                            <button
                              key={slotIndex}
                              type="button"
                              disabled={isPending}
                              onClick={() => toggleSlot(event, dateIndex, dateEntry, slotIndex, slot)}
                              className={`inline-flex min-h-10 items-center gap-1.5 rounded-app-md border px-3 py-2 text-xs font-semibold transition-colors active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60 ${
                                isJoined
                                  ? 'border-primary bg-primary text-white shadow-app-sm'
                                  : 'border-border bg-surface text-text hover:border-primary-muted hover:bg-primary-soft'
                              }`}
                            >
                              {isPending ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : isJoined ? (
                                <Check className="h-3.5 w-3.5" />
                              ) : null}
                              {slot}
                            </button>
                          );
                        })
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
