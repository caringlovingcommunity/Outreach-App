import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircle, CalendarDays, Check, ExternalLink, Loader2, MapPin, Users } from 'lucide-react';
import type { EventPairing, EventRecord, EventSignup, UserProfile } from '../types';
import {
  subscribeToEvents,
  subscribeToEventPairing,
  subscribeToUserEventSignups,
  formatEventDate,
  getEventDateCountdown,
  joinEventSlot,
  leaveEventSlot,
  signupId,
} from '../services/eventsService';

interface Props {
  user: UserProfile;
  heading?: boolean;
  showSlotInstruction?: boolean;
}

export const EventParticipation: React.FC<Props> = ({ user, heading = true, showSlotInstruction = true }) => {
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [signups, setSignups] = useState<EventSignup[]>([]);
  const [pairings, setPairings] = useState<Map<string, EventPairing | null>>(new Map());
  const [loading, setLoading] = useState(true);
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const signupKeys = useMemo(
    () => new Set(signups.map((signup) => signup.id)),
    [signups],
  );

  const sortedEvents = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const today = now.getTime();

    return [...events].sort((first, second) => {
      const firstDates = first.dates.map((dateEntry) => new Date(`${dateEntry.date}T00:00:00`).getTime()).filter(Number.isFinite);
      const secondDates = second.dates.map((dateEntry) => new Date(`${dateEntry.date}T00:00:00`).getTime()).filter(Number.isFinite);
      const firstUpcoming = firstDates.filter((date) => date >= today).sort((a, b) => a - b)[0];
      const secondUpcoming = secondDates.filter((date) => date >= today).sort((a, b) => a - b)[0];
      const firstDate = firstUpcoming ?? Math.max(...firstDates, Number.NEGATIVE_INFINITY);
      const secondDate = secondUpcoming ?? Math.max(...secondDates, Number.NEGATIVE_INFINITY);

      if (firstUpcoming === undefined && secondUpcoming !== undefined) return 1;
      if (firstUpcoming !== undefined && secondUpcoming === undefined) return -1;
      return firstDate - secondDate;
    });
  }, [events]);

  useEffect(() => {
    setLoading(true);
    setError(null);
    const unsubscribes: (() => void)[] = [];
    let latestSignups: EventSignup[] = [];
    const handleError = () => {
      setError('Unable to load events. Please try again.');
      setLoading(false);
    };
    unsubscribes.push(subscribeToEvents((nextEvents) => {
      setEvents(nextEvents);
      setLoading(false);
    }, handleError));
    unsubscribes.push(subscribeToUserEventSignups(user.uid, (nextSignups) => {
      latestSignups = nextSignups;
      setSignups(nextSignups);
      setLoading(false);
      setPairings((current) => {
        const next = new Map<string, EventPairing | null>();
        nextSignups.forEach((signup) => next.set(`${signup.eventId}_${signup.slotId}`, current.get(`${signup.eventId}_${signup.slotId}`) ?? null));
        return next;
      });
      latestSignups.forEach((signup) => {
        unsubscribes.push(subscribeToEventPairing(signup.eventId, signup.slotId, (pairing) => {
          setPairings((current) => new Map(current).set(`${signup.eventId}_${signup.slotId}`, pairing));
        }, handleError));
      });
    }, handleError));
    return () => unsubscribes.forEach((unsubscribe) => unsubscribe());
  }, [user.uid]);

  const toggleSlot = async (event: EventRecord, dateEntry: EventRecord['dates'][number], slot: EventRecord['dates'][number]['slots'][number]) => {
    const key = signupId(user.uid, event.id, slot.id);
    const isJoined = signupKeys.has(key);

    try {
      setPendingKey(key);
      setError(null);
      if (isJoined) {
        await leaveEventSlot(user.uid, event.id, slot.id);
        setSignups((current) => current.filter((signup) => signup.id !== key));
        setPairings((current) => {
          const next = new Map(current);
          next.delete(`${event.id}_${slot.id}`);
          return next;
        });
      } else {
        await joinEventSlot(event, dateEntry, slot, user);
        const signup = {
          id: key,
          eventId: event.id,
          slotId: slot.id,
          date: dateEntry.date,
          slot: slot.label,
          userId: user.uid,
          displayName: user.displayName,
          role: user.role,
          createdAt: null,
        };
        setSignups((current) => [...current, signup]);
      }
    } catch (toggleError) {
      console.error('Failed to update event signup:', toggleError);
      setError('Unable to update your signup. Please check your permissions.');
    } finally {
      setPendingKey(null);
    }
  };

  if (loading) {
    return <div className="app-loading-state mt-8 min-h-48"><Loader2 className="h-7 w-7 animate-spin text-primary" /></div>;
  }

  return (
    <section className="mx-auto max-w-5xl pb-6">
      {heading && (
        <>
          <div className="-mx-4 -mt-6 bg-primary px-4 py-7 text-white sm:-mx-6 sm:-mt-8 sm:px-8">
            <p className="text-2xl font-bold sm:text-3xl">Events</p>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-white/85 sm:text-base">
              View outreach event details and choose the slots you can attend.
            </p>
          </div>
        </>
      )}

      {showSlotInstruction && (
        <div className="mt-5 flex items-start gap-3 rounded-app-md border border-primary/20 bg-primary-soft px-4 py-3 text-sm text-text">
          <CalendarDays className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
          <p><span className="font-bold text-primary">Please select your slot</span><span className="block text-muted">Tap a time slot below to confirm when you can attend.</span></p>
        </div>
      )}

      {error && <div className="app-alert-error mt-5 text-xs"><AlertCircle className="h-4 w-4 shrink-0" />{error}</div>}

      {events.length === 0 ? (
        <div className="app-empty-state mt-6 border-dashed">
          <CalendarDays className="mx-auto h-8 w-8 text-subtle" />
          <p className="mt-3 text-sm font-medium text-text">No events yet.</p>
          <p className="mt-1 text-xs text-muted">Check back later for outreach events to join.</p>
        </div>
      ) : (
        <div className="mt-6 divide-y divide-border border-y border-border">
          {sortedEvents.map((event) => (
            <article key={event.id} className="overflow-hidden py-6 first:pt-5 last:pb-5">
              {event.imageUrl && <img src={event.imageUrl} alt="" className="mb-5 h-40 w-full rounded-app-md object-cover" />}
              <div>
                <h3 className="text-lg font-bold text-text">{event.name}</h3>
                {event.description && <p className="mt-1 whitespace-pre-line text-sm text-muted">{event.description}</p>}
                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs leading-5 text-muted">
                  {event.location && <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5 text-primary" />{event.location}</span>}
                  <span className="inline-flex items-center gap-1"><Users className="h-3.5 w-3.5 text-primary" />Created by {event.createdByName}</span>
                  {event.imageUrl && <a href={event.imageUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">Open link <ExternalLink className="h-3.5 w-3.5" /></a>}
                </div>

                <div className="mt-6 space-y-5">
                  {event.dates.map((dateEntry) => (
                    <div key={`${event.id}_${dateEntry.date}`}>
                      <div className="flex flex-wrap items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted"><CalendarDays className="h-4 w-4 text-primary" />{formatEventDate(dateEntry.date)}<span className="rounded-full bg-primary-soft px-2 py-0.5 text-[10px] font-semibold normal-case tracking-normal text-primary">{getEventDateCountdown(dateEntry.date)}</span></div>
                      <div className="mt-3 flex flex-wrap gap-2 border-t border-border pt-3">
                        {dateEntry.slots.length === 0 ? <span className="text-xs text-subtle">No time slots configured</span> : dateEntry.slots.map((slot) => {
                          const key = signupId(user.uid, event.id, slot.id);
                          const isJoined = signupKeys.has(key);
                          const isPending = pendingKey === key;
                          const pairing = pairings.get(`${event.id}_${slot.id}`);
                          const group = pairing?.groups.find((candidate) => candidate.memberIds.includes(user.uid));
                          const pairedNames = group
                            ? group.memberIds
                              .filter((memberId) => memberId !== user.uid)
                              .map((memberId) => group.memberNames?.[memberId])
                              .filter((name): name is string => Boolean(name))
                            : [];
                          return (
                            <div key={slot.id} className="flex flex-col items-start gap-1">
                              <button type="button" disabled={isPending} onClick={() => void toggleSlot(event, dateEntry, slot)} className={`inline-flex min-h-10 items-center gap-1.5 rounded-app-md border px-3 py-2 text-xs font-semibold transition-colors disabled:opacity-60 ${isJoined ? 'border-primary bg-primary text-white' : 'border-border bg-surface text-text hover:border-primary-muted hover:bg-primary-soft'}`}>
                                {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : isJoined ? <Check className="h-3.5 w-3.5" /> : null}
                                {slot.label}
                              </button>
                              {isJoined && group && pairedNames.length > 0 && <span className="px-1 text-[10px] font-semibold text-success">Paired with {pairedNames.join(', ')}</span>}
                              {isJoined && group && pairedNames.length === 0 && <span className="px-1 text-[10px] text-muted">Pairing saved</span>}
                              {isJoined && pairing && !group && <span className="px-1 text-[10px] text-muted">Not assigned yet</span>}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
};
