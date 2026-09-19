import { collection, getDocs, limit, orderBy, query, where } from 'firebase/firestore';
import { db } from '../services/firebase';
import type { PublicUserProfile } from '../types/user';

export const getTeamFriends = async (): Promise<PublicUserProfile[]> => {
  const friendsQuery = query(
    collection(db, 'users_public'),
    where('role', '==', 'student'),
    orderBy('displayName', 'asc'),
    limit(100),
  );

  const snapshot = await getDocs(friendsQuery);
  return snapshot.docs.map((profile) => profile.data() as PublicUserProfile);
};
