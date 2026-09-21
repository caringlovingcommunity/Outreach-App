import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  where,
} from 'firebase/firestore';
import { db } from './firebase';
import type { EventDate, EventPairing, EventRecord, EventSignup, EventSlot, UserProfile } from '../types';

interface LegacyEventDate {
  date: string;
  timeSlots?: string[];
  slots?: EventSlot[];
}

interface StoredEvent {
  name: string;
  description?: string;
  location?: string;
  imageUrl?: string;
  createdByUid?: string;
  createdByName?: string;
  createdAt?: any;
  updatedAt?: any;
  dates?: LegacyEventDate[];
}

export const slotId = (date: string, label: string) => `${date}_${label}`
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '_')
  .replace(/^_|_$/g, '');

export const formatEventDate = (date: string) => {
  const [year, month, day] = date.split('-');
  return year && month && day ? `${day}-${month}-${year.slice(-2)}` : date;
};

export const getEventDateCountdown = (date: string) => {
  const [year, month, day] = date.split('-').map(Number);
  if (!year || !month || !day) return 'Date unavailable';

  const target = new Date(year, month - 1, day);
  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const daysUntil = Math.round((target.getTime() - todayStart.getTime()) / 86400000);

  if (daysUntil === 0) return 'Today';
  if (daysUntil === 1) return 'Tomorrow';
  if (daysUntil > 1) return `In ${daysUntil} days`;
  if (daysUntil === -1) return 'Yesterday';
  return `${Math.abs(daysUntil)} days ago`;
};

const normalizeDate = (entry: LegacyEventDate): EventDate => ({
  date: entry.date,
  slots: entry.slots?.length
    ? entry.slots.map((slot) => ({ id: slot.id || slotId(entry.date, slot.label), label: slot.label }))
    : (entry.timeSlots || []).map((label) => ({ id: slotId(entry.date, label), label })),
});

export const normalizeEvent = (id: string, data: StoredEvent): EventRecord => ({
  id,
  name: data.name || 'Untitled event',
  description: data.description,
  location: data.location,
  imageUrl: data.imageUrl,
  createdByUid: data.createdByUid || '',
  createdByName: data.createdByName || 'Event organizer',
  createdAt: data.createdAt,
  updatedAt: data.updatedAt,
  dates: (data.dates || []).map(normalizeDate),
});

export const getEvents = async (): Promise<EventRecord[]> => {
  const snapshot = await getDocs(query(collection(db, 'events'), orderBy('createdAt', 'desc')));
  return snapshot.docs.map((eventDoc) => normalizeEvent(eventDoc.id, eventDoc.data() as StoredEvent));
};

export const subscribeToEvents = (
  onChange: (events: EventRecord[]) => void,
  onError: (error: Error) => void,
) => onSnapshot(
  query(collection(db, 'events'), orderBy('createdAt', 'desc')),
  (snapshot) => onChange(snapshot.docs.map((eventDoc) => normalizeEvent(eventDoc.id, eventDoc.data() as StoredEvent))),
  onError,
);

export const signupId = (userId: string, eventId: string, slotKey: string) => `${userId}_${eventId}_${slotKey}`;

export const getUserEventSignups = async (userId: string): Promise<EventSignup[]> => {
  const snapshot = await getDocs(query(collection(db, 'eventSignups'), where('userId', '==', userId)));
  return snapshot.docs.map((signupDoc) => ({ id: signupDoc.id, ...signupDoc.data() } as EventSignup));
};

export const subscribeToUserEventSignups = (
  userId: string,
  onChange: (signups: EventSignup[]) => void,
  onError: (error: Error) => void,
) => onSnapshot(
  query(collection(db, 'eventSignups'), where('userId', '==', userId)),
  (snapshot) => onChange(snapshot.docs.map((signupDoc) => ({ id: signupDoc.id, ...signupDoc.data() } as EventSignup))),
  onError,
);

export const getPairingsForSignups = async (signups: EventSignup[]) => {
  const entries = await Promise.all(signups.map(async (signup) => {
    const pairing = await getEventPairing(signup.eventId, signup.slotId);
    return [`${signup.eventId}_${signup.slotId}`, pairing] as const;
  }));
  return new Map(entries);
};

export const getEventSlotSignups = async (eventId: string, slotKey: string): Promise<EventSignup[]> => {
  const snapshot = await getDocs(query(
    collection(db, 'eventSignups'),
    where('eventId', '==', eventId),
    where('slotId', '==', slotKey),
  ));
  return snapshot.docs.map((signupDoc) => ({ id: signupDoc.id, ...signupDoc.data() } as EventSignup));
};

export const subscribeToEventSlotSignups = (
  eventId: string,
  slotKey: string,
  onChange: (signups: EventSignup[]) => void,
  onError: (error: Error) => void,
) => onSnapshot(
  query(collection(db, 'eventSignups'), where('eventId', '==', eventId), where('slotId', '==', slotKey)),
  (snapshot) => onChange(snapshot.docs.map((signupDoc) => ({ id: signupDoc.id, ...signupDoc.data() } as EventSignup))),
  onError,
);

export const joinEventSlot = async (event: EventRecord, date: EventDate, slot: EventSlot, user: UserProfile) => {
  const id = signupId(user.uid, event.id, slot.id);
  await setDoc(doc(db, 'eventSignups', id), {
    userId: user.uid,
    displayName: user.displayName,
    role: user.role,
    eventId: event.id,
    slotId: slot.id,
    date: date.date,
    slot: slot.label,
    createdAt: serverTimestamp(),
  });
};

export const leaveEventSlot = (userId: string, eventId: string, slotKey: string) =>
  deleteDoc(doc(db, 'eventSignups', signupId(userId, eventId, slotKey)));

export const getEventPairing = async (eventId: string, slotKey: string): Promise<EventPairing | null> => {
  const pairingDoc = await getDoc(doc(db, 'eventPairings', `${eventId}_${slotKey}`));
  if (!pairingDoc.exists()) return null;
  return { id: pairingDoc.id, ...pairingDoc.data() } as EventPairing;
};

export const subscribeToEventPairing = (
  eventId: string,
  slotKey: string,
  onChange: (pairing: EventPairing | null) => void,
  onError: (error: Error) => void,
) => onSnapshot(
  doc(db, 'eventPairings', `${eventId}_${slotKey}`),
  (snapshot) => onChange(snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } as EventPairing : null),
  onError,
);

export const saveEventPairing = async (
  eventId: string,
  slotKey: string,
  createdByUid: string,
  groups: EventPairing['groups'],
) => {
  const id = `${eventId}_${slotKey}`;
  await setDoc(doc(db, 'eventPairings', id), {
    eventId,
    slotId: slotKey,
    createdByUid,
    groups,
    updatedAt: serverTimestamp(),
  });
};