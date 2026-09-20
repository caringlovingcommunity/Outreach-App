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
import type { Contact, ContactInput } from '../types';
import type { PrivateUserProfile, PublicUserProfile } from '../types/user';

const contactsCollection = collection(db, 'contacts');

export interface ContactAccountMatch {
  uid: string;
  displayName: string;
  photoURL: string;
}

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

const getContactLinkMetadata = async (contactId: string): Promise<Pick<Contact, 'linkedUserId' | 'linkedAt' | 'linkedByUid'>> => {
  const snapshot = await getDoc(doc(db, 'contacts', contactId));
  if (!snapshot.exists()) return {};
  const data = snapshot.data() as Contact;
  return {
    ...(data.linkedUserId ? { linkedUserId: data.linkedUserId } : {}),
    ...(data.linkedAt ? { linkedAt: data.linkedAt } : {}),
    ...(data.linkedByUid ? { linkedByUid: data.linkedByUid } : {}),
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
    ...(await getContactLinkMetadata(contactId)),
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

const normalizePhone = (value?: string): string => (value || '').replace(/[^0-9+]/g, '');

export const findContactAccountMatch = async (contact: Contact): Promise<ContactAccountMatch | null> => {
  const phoneNumber = normalizePhone(contact.phoneNumber);
  if (!phoneNumber) return null;
  const privateSnapshot = await getDocs(collection(db, 'users_private'));
  const match = privateSnapshot.docs
    .map((profile) => ({ id: profile.id, data: profile.data() as PrivateUserProfile }))
    .find((profile) => profile.id !== contact.createdById && normalizePhone(profile.data.phone) === phoneNumber);
  if (!match) return null;
  const publicSnapshot = await getDoc(doc(db, 'users_public', match.id));
  if (!publicSnapshot.exists()) return null;
  const publicProfile = publicSnapshot.data() as PublicUserProfile;
  if (publicProfile.role !== 'student' || publicProfile.membershipStatus !== 'APPROVED') return null;
  return { uid: match.id, displayName: publicProfile.displayName || 'Registered student', photoURL: publicProfile.photoURL || '' };
};

export const deleteContact = async (contactId: string): Promise<void> => {
  await deleteDoc(doc(db, 'contacts', contactId));
};
