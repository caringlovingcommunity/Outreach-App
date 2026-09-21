import { collection, getDocs, limit, onSnapshot, orderBy, query, where } from 'firebase/firestore';
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

const buildLinkedTeamFriends = (
  profiles: PublicUserProfile[],
  publicProfiles: PublicUserProfile[],
  contacts: Contact[],
  privateProfiles: PrivateUserProfile[],
): LinkedTeamFriend[] => {
  const privateProfileMap = new Map(privateProfiles.map((profile) => [profile.uid, profile]));
  const publicProfileMap = new Map(publicProfiles.map((profile) => [profile.uid, profile]));
  const contactsByUser = contacts.reduce<Record<string, Contact[]>>((groups, contact) => {
    if (contact.linkedUserId) groups[contact.linkedUserId] = [...(groups[contact.linkedUserId] || []), contact];
    return groups;
  }, {});
  const linkedProfileIds = new Set(Object.keys(contactsByUser));
  const profilesForLookup = [
    ...profiles,
    ...publicProfiles.filter((profile) => linkedProfileIds.has(profile.uid) && profile.membershipStatus === 'FILTERED'),
  ];

  return profilesForLookup.map((profile) => ({
    ...profile,
    isFiltered: profile.membershipStatus === 'FILTERED',
    college: privateProfileMap.get(profile.uid)?.college,
    invitedByName: privateProfileMap.get(profile.uid)?.invitedByName,
    linkedByNames: [...new Set((contactsByUser[profile.uid] || [])
      .map((contact) => contact.linkedByUid)
      .filter(Boolean)
      .map((uid) => publicProfileMap.get(uid!)?.displayName || uid!))],
    linkedContacts: contactsByUser[profile.uid] || [],
  }));
};

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
  return buildLinkedTeamFriends(
    profiles,
    publicSnapshot.docs.map((profile) => profile.data() as PublicUserProfile),
    contactsSnapshot.docs.map((contact) => ({ id: contact.id, ...contact.data() }) as Contact),
    privateSnapshot?.docs.map((profile) => profile.data() as PrivateUserProfile) || [],
  );
};

export const subscribeToTeamFriendsWithContacts = (
  includePrivateProfiles: boolean,
  onChange: (profiles: LinkedTeamFriend[]) => void,
  onError: (error: Error) => void,
) => {
  const profilesQuery = query(
    collection(db, 'users_public'),
    where('role', 'in', ['student', 'organizer']),
    orderBy('displayName', 'asc'),
    limit(100),
  );
  const publicProfilesQuery = collection(db, 'users_public');
  const contactsQuery = collection(db, 'contacts');
  const privateProfilesQuery = collection(db, 'users_private');
  let profiles: PublicUserProfile[] = [];
  let publicProfiles: PublicUserProfile[] = [];
  let contacts: Contact[] = [];
  let privateProfiles: PrivateUserProfile[] = [];

  const emit = () => onChange(buildLinkedTeamFriends(profiles, publicProfiles, contacts, privateProfiles));
  const unsubscribeProfiles = onSnapshot(profilesQuery, (snapshot) => {
    profiles = snapshot.docs.map((profile) => profile.data() as PublicUserProfile);
    emit();
  }, onError);
  const unsubscribePublicProfiles = onSnapshot(publicProfilesQuery, (snapshot) => {
    publicProfiles = snapshot.docs.map((profile) => profile.data() as PublicUserProfile);
    emit();
  }, onError);
  const unsubscribeContacts = onSnapshot(contactsQuery, (snapshot) => {
    contacts = snapshot.docs.map((contact) => ({ id: contact.id, ...contact.data() }) as Contact);
    emit();
  }, onError);
  const unsubscribePrivateProfiles = includePrivateProfiles
    ? onSnapshot(privateProfilesQuery, (snapshot) => {
      privateProfiles = snapshot.docs.map((profile) => profile.data() as PrivateUserProfile);
      emit();
    }, onError)
    : () => undefined;

  return () => {
    unsubscribeProfiles();
    unsubscribePublicProfiles();
    unsubscribeContacts();
    unsubscribePrivateProfiles();
  };
};
