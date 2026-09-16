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
      <div className="flex flex-col items-center justify-center p-8 bg-white rounded-2xl shadow-sm border border-gray-100 min-h-[300px]">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mb-3" />
        <p className="text-sm text-gray-500 font-medium">Loading events...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col space-y-4 pb-20 mt-5">
      <div className="bg-gradient-to-br from-indigo-600 to-indigo-700 text-white p-5 rounded-2xl shadow-sm">
        <div className="flex items-center gap-1.5 text-indigo-200 text-xs font-semibold tracking-wider uppercase">
          <CalendarDays className="w-3.5 h-3.5" />
          Outreach Events
        </div>
        <h2 className="text-lg font-bold mt-1">Join a time slot</h2>
        <p className="text-xs text-indigo-100 mt-1">Tap a slot below to sign up. Tap again to leave.</p>
      </div>

      {error && (
        <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {events.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-stone-300 bg-white p-10 text-center">
          <CalendarDays className="mx-auto h-8 w-8 text-stone-400" />
          <p className="mt-3 text-sm font-medium text-stone-700">No events yet.</p>
          <p className="mt-1 text-xs text-stone-500">Check back later for outreach events to join.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {events.map((event) => (
            <div key={event.id} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <h3 className="text-base font-bold text-stone-900">{event.name}</h3>
              <div className="mt-3 space-y-3">
                {event.dates.map((dateEntry, dateIndex) => (
                  <div key={dateIndex}>
                    <div className="text-xs font-bold text-gray-500 uppercase tracking-wider">{dateEntry.date}</div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {dateEntry.timeSlots.length === 0 ? (
                        <span className="text-xs text-gray-400">No time slots configured</span>
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
                              className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold transition-all active:scale-[0.98] disabled:opacity-60 ${
                                isJoined
                                  ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm'
                                  : 'bg-white border-gray-200 text-gray-700 hover:border-indigo-300'
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
