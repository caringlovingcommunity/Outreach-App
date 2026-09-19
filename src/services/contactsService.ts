import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import { db } from './firebase';
import type { Contact, ContactInput } from '../types';

const contactsCollection = collection(db, 'contacts');

const cleanOptional = (value?: string): string | undefined => {
  const trimmed = value?.trim();
  return trimmed || undefined;
};

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
      : { jof1_1: false, jof1_2: false, jof1_3: false },
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
  const snapshot = await getDocs(query(
    contactsCollection,
    where('createdById', '==', userId),
    orderBy('createdAt', 'desc'),
  ));
  return snapshot.docs.map(mapContact);
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

export const deleteContact = async (contactId: string): Promise<void> => {
  await deleteDoc(doc(db, 'contacts', contactId));
};
