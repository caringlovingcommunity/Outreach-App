import {
  addDoc,
  collection,
  deleteDoc,
  deleteField,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import { db } from './firebase';
import { JOURNEY_OF_FAITH_STEPS } from '../types';
import type { Contact, ContactInput, FollowUpProgress } from '../types';
import type { PublicUserProfile } from '../types/user';

const contactsCollection = collection(db, 'contacts');

export interface ContactAccountMatch {
  uid: string;
  displayName: string;
  photoURL: string;
}

export const getLinkedAccountProfile = async (userId: string): Promise<ContactAccountMatch | null> => {
  const profileSnapshot = await getDoc(doc(db, 'users_public', userId));
  if (!profileSnapshot.exists()) return null;
  const profile = profileSnapshot.data() as PublicUserProfile;
  return {
    uid: profile.uid,
    displayName: profile.displayName,
    photoURL: profile.photoURL || '',
  };
};

export const getDisciplerForStudent = async (studentId: string): Promise<ContactAccountMatch | null> => {
  const linkedContacts = await getDocs(query(
    contactsCollection,
    where('linkedUserId', '==', studentId),
  ));
  const linkedByUid = linkedContacts.docs[0]?.data().linkedByUid;
  return typeof linkedByUid === 'string' ? getLinkedAccountProfile(linkedByUid) : null;
};

const cleanOptional = (value?: string): string | undefined => {
  const trimmed = value?.trim();
  return trimmed || undefined;
};

const emptyFollowUpProgress = (): FollowUpProgress => Object.fromEntries(
  JOURNEY_OF_FAITH_STEPS.map((step) => [step, false]),
) as unknown as FollowUpProgress;

const toPayload = (input: ContactInput, createdById: string, createdByName: string) => {
  const phoneNumber = cleanOptional(input.phoneNumber);
  const remarks = cleanOptional(input.remarks);

  return {
    createdById,
    createdByName,
    name: input.name.trim(),
    ...(phoneNumber ? { phoneNumber } : {}),
    gender: input.gender,
    photoUrl: null,
    gospelStatus: input.gospelStatus,
    responseStatuses: input.gospelStatus === 'not_started' ? [] : input.responseStatuses,
    followUpProgress: input.responseStatuses.includes('say_yes_follow_up')
      ? input.followUpProgress
      : emptyFollowUpProgress(),
    ...(remarks ? { remarks } : {}),
  };
};

export const createContact = async (
  input: ContactInput,
  createdById: string,
  createdByName: string,
): Promise<void> => {
  await addDoc(contactsCollection, {
    ...toPayload(input, createdById, createdByName),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
};

const mapContact = (contactDoc: { id: string; data: () => Record<string, unknown> }): Contact => ({
  id: contactDoc.id,
  ...(contactDoc.data() as Omit<Contact, 'id'>),
});

export const getMyContacts = async (userId: string): Promise<Contact[]> => {
  const [createdSnapshot, linkedSnapshot] = await Promise.all([
    getDocs(query(
      contactsCollection,
      where('createdById', '==', userId),
      orderBy('createdAt', 'desc'),
    )),
    getDocs(query(
      contactsCollection,
      where('linkedByUid', '==', userId),
      orderBy('createdAt', 'desc'),
    )),
  ]);
  const contacts = new Map<string, Contact>();
  [...createdSnapshot.docs, ...linkedSnapshot.docs].forEach((contactDoc) => {
    contacts.set(contactDoc.id, mapContact(contactDoc));
  });
  return [...contacts.values()].sort((left, right) => {
    const leftTime = left.createdAt?.toMillis?.() ?? left.createdAt?.getTime?.() ?? 0;
    const rightTime = right.createdAt?.toMillis?.() ?? right.createdAt?.getTime?.() ?? 0;
    return rightTime - leftTime;
  });
};

export const getFilteredContacts = async (userId: string): Promise<Contact[]> => {
  const [contacts, filteredProfiles] = await Promise.all([
    getMyContacts(userId),
    getDocs(query(collection(db, 'users_public'), where('membershipStatus', '==', 'FILTERED'))),
  ]);
  const filteredUserIds = new Set(filteredProfiles.docs.map((profile) => profile.id));
  return contacts.filter((contact) => contact.linkedUserId && filteredUserIds.has(contact.linkedUserId));
};

export const getCommunityContacts = async (): Promise<Contact[]> => {
  const snapshot = await getDocs(query(contactsCollection, orderBy('createdAt', 'desc')));
  return snapshot.docs.map(mapContact);
};

export const updateContact = async (
  contactId: string,
  input: ContactInput,
  createdById: string,
  createdByName: string,
): Promise<void> => {
  await updateDoc(doc(db, 'contacts', contactId), {
    ...toPayload(input, createdById, createdByName),
    updatedAt: serverTimestamp(),
  });
};

export const linkContactToUser = async (contactId: string, linkedUserId: string, linkedByUid: string): Promise<void> => {
  await updateDoc(doc(db, 'contacts', contactId), {
    linkedUserId,
    linkedAt: serverTimestamp(),
    linkedByUid,
    updatedAt: serverTimestamp(),
  });
};

export const unlinkContactFromUser = async (contactId: string): Promise<void> => {
  await updateDoc(doc(db, 'contacts', contactId), {
    linkedUserId: deleteField(),
    linkedAt: deleteField(),
    linkedByUid: deleteField(),
    updatedAt: serverTimestamp(),
  });
};

export const deleteContact = async (contactId: string): Promise<void> => {
  await deleteDoc(doc(db, 'contacts', contactId));
};
