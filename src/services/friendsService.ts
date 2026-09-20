import { collection, getDocs, limit, orderBy, query, where } from 'firebase/firestore';
import { db } from '../services/firebase';
import type { PublicUserProfile } from '../types/user';
import type { Contact } from '../types';

export interface LinkedTeamFriend extends PublicUserProfile {
  linkedContacts: Contact[];
}

export const getTeamFriends = async (): Promise<PublicUserProfile[]> => {
  const friendsQuery = query(
    collection(db, 'users_public'),
    where('role', '==', 'student'),
    orderBy('displayName', 'asc'),
    limit(100),
  );

  const snapshot = await getDocs(friendsQuery);
  return snapshot.docs
    .map((profile) => profile.data() as PublicUserProfile)
    .filter((profile) => profile.membershipStatus !== 'FILTERED');
};

export const getTeamFriendsWithContacts = async (): Promise<LinkedTeamFriend[]> => {
  const [profiles, contactsSnapshot] = await Promise.all([
    getTeamFriends(),
    getDocs(collection(db, 'contacts')),
  ]);
  const contactsByUser = contactsSnapshot.docs.reduce<Record<string, Contact[]>>((groups, contactDoc) => {
    const contact = { id: contactDoc.id, ...contactDoc.data() } as Contact;
    if (contact.linkedUserId) groups[contact.linkedUserId] = [...(groups[contact.linkedUserId] || []), contact];
    return groups;
  }, {});
  return profiles.map((profile) => ({
    ...profile,
    linkedContacts: contactsByUser[profile.uid] || [],
  }));
};
