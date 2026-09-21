import { collection, getDocs, limit, orderBy, query, where } from 'firebase/firestore';
import { db } from '../services/firebase';
import type { PrivateUserProfile, PublicUserProfile } from '../types/user';
import type { Contact } from '../types';

export interface LinkedTeamFriend extends PublicUserProfile {
  linkedContacts: Contact[];
  college?: PrivateUserProfile['college'];
  invitedByName?: string;
  linkedByNames: string[];
  isFiltered?: boolean;
}

export const getTeamFriends = async (): Promise<PublicUserProfile[]> => {
  const friendsQuery = query(
    collection(db, 'users_public'),
    where('role', 'in', ['student', 'organizer']),
    orderBy('displayName', 'asc'),
    limit(100),
  );

  const snapshot = await getDocs(friendsQuery);
  return snapshot.docs
    .map((profile) => profile.data() as PublicUserProfile)
    .filter((profile) => profile.membershipStatus !== 'FILTERED');
};

export const getTeamFriendsWithContacts = async (includePrivateProfiles = true): Promise<LinkedTeamFriend[]> => {
  const [profiles, publicSnapshot, contactsSnapshot, privateSnapshot] = await Promise.all([
    getTeamFriends(),
    getDocs(collection(db, 'users_public')),
    getDocs(collection(db, 'contacts')),
    includePrivateProfiles ? getDocs(collection(db, 'users_private')) : Promise.resolve(null),
  ]);
  const privateProfiles = new Map(privateSnapshot?.docs.map((profile) => [profile.id, profile.data() as PrivateUserProfile]));
  const publicProfiles = new Map(publicSnapshot.docs.map((profile) => [profile.id, profile.data() as PublicUserProfile]));
  const contactsByUser = contactsSnapshot.docs.reduce<Record<string, Contact[]>>((groups, contactDoc) => {
    const contact = { id: contactDoc.id, ...contactDoc.data() } as Contact;
    if (contact.linkedUserId) groups[contact.linkedUserId] = [...(groups[contact.linkedUserId] || []), contact];
    return groups;
  }, {});
  const linkedProfileIds = new Set(Object.keys(contactsByUser));
  const profilesForLookup = [
    ...profiles,
    ...[...publicProfiles.values()].filter((profile) => linkedProfileIds.has(profile.uid) && profile.membershipStatus === 'FILTERED'),
  ];

  return profilesForLookup.map((profile) => ({
    ...profile,
    isFiltered: profile.membershipStatus === 'FILTERED',
    college: privateProfiles.get(profile.uid)?.college,
    invitedByName: privateProfiles.get(profile.uid)?.invitedByName,
    linkedByNames: [...new Set((contactsByUser[profile.uid] || [])
      .map((contact) => contact.linkedByUid)
      .filter(Boolean)
      .map((uid) => publicProfiles.get(uid!)?.displayName || uid!))],
    linkedContacts: contactsByUser[profile.uid] || [],
  }));
};
