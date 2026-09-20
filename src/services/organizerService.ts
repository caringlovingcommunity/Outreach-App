import { 
  collection, 
  onSnapshot,
  query, 
  where, 
  getDocs, 
  doc, 
  getDoc,
  updateDoc,
  writeBatch,
  serverTimestamp,
  deleteField,
  limit,
  orderBy 
} from 'firebase/firestore';
import { db } from '../services/firebase';
import type { PublicUserProfile, PrivateUserProfile } from '../types/user';

export interface StudentListItem extends PublicUserProfile {
  // We combine public and private data when an organizer views details
  privateDetails?: PrivateUserProfile;
}

export interface ApprovalMember extends PublicUserProfile {
  email: string;
}

const pendingQueries = [
  query(collection(db, 'users_public'), where('membershipStatus', '==', 'PENDING')),
  query(collection(db, 'users_public'), where('visionCastingAccepted', '==', false)),
];

const hydrateApprovalMembers = async (profiles: PublicUserProfile[]): Promise<ApprovalMember[]> => {
  const privateSnapshot = await getDocs(collection(db, 'users_private'));
  const emails = new Map(privateSnapshot.docs.map((privateDoc) => [privateDoc.id, privateDoc.data().email || '']));
  return profiles.map((profile) => ({ ...profile, email: emails.get(profile.uid) || '' }));
};

const subscribeToApprovalQueries = (
  queries: typeof pendingQueries,
  onChange: (members: ApprovalMember[]) => void,
  onError: (error: Error) => void,
  includeRejected = false,
) => {
  const snapshots = queries.map(() => new Map<string, PublicUserProfile>());
  let pendingLoads = queries.length;

  const emit = async () => {
    const profiles = [...new Map(snapshots.flatMap((snapshot) => [...snapshot.entries()])).values()]
      .filter((profile) => includeRejected || !['REJECTED', 'FILTERED'].includes(profile.membershipStatus || ''));
    try {
      onChange(await hydrateApprovalMembers(profiles));
    } catch (error) {
      onError(error instanceof Error ? error : new Error('Unable to load member email addresses.'));
    }
  };

  const unsubscribes = queries.map((approvalQuery, index) => onSnapshot(
    approvalQuery,
    (snapshot) => {
      snapshots[index] = new Map(snapshot.docs.map((approvalDoc) => [approvalDoc.id, approvalDoc.data() as PublicUserProfile]));
      pendingLoads -= 1;
      if (pendingLoads <= 0) void emit();
    },
    (error) => onError(error),
  ));

  return () => unsubscribes.forEach((unsubscribe) => unsubscribe());
};

export const subscribeToPendingMembers = (
  onChange: (members: ApprovalMember[]) => void,
  onError: (error: Error) => void,
) => subscribeToApprovalQueries(pendingQueries, onChange, onError);

export const subscribeToApprovedMembers = (
  onChange: (members: ApprovalMember[]) => void,
  onError: (error: Error) => void,
) => subscribeToApprovalQueries([
  query(collection(db, 'users_public'), where('membershipStatus', '==', 'APPROVED')),
], onChange, onError);

export const subscribeToRejectedMembers = (
  onChange: (members: ApprovalMember[]) => void,
  onError: (error: Error) => void,
) => subscribeToApprovalQueries([
  query(collection(db, 'users_public'), where('membershipStatus', '==', 'REJECTED')),
], onChange, onError, true);

export const subscribeToFilteredMembers = (
  onChange: (members: ApprovalMember[]) => void,
  onError: (error: Error) => void,
) => subscribeToApprovalQueries([
  query(collection(db, 'users_public'), where('membershipStatus', '==', 'FILTERED')),
], onChange, onError, true);

export const approveMember = async (memberUid: string, approvedByUid: string, approvedByEmail: string): Promise<void> => {
  const memberRef = doc(db, 'users_public', memberUid);
  const batch = writeBatch(db);
  batch.update(memberRef, {
    visionCastingAccepted: true,
    membershipStatus: 'APPROVED',
    approvedByUid,
    approvedByEmail,
    approvedAt: serverTimestamp(),
  });
  await batch.commit();
};

export const rejectMember = async (memberUid: string): Promise<void> => {
  const memberRef = doc(db, 'users_public', memberUid);
  const batch = writeBatch(db);
  batch.update(memberRef, {
    visionCastingAccepted: false,
    membershipStatus: 'REJECTED',
  });
  await batch.commit();
};

export const filterMember = async (memberUid: string): Promise<void> => {
  const memberRef = doc(db, 'users_public', memberUid);
  await updateDoc(memberRef, {
    visionCastingAccepted: false,
    membershipStatus: 'FILTERED',
  });
};

export const resetMemberToPending = async (memberUid: string): Promise<void> => {
  const memberRef = doc(db, 'users_public', memberUid);
  const batch = writeBatch(db);
  batch.update(memberRef, {
    visionCastingAccepted: false,
    membershipStatus: 'PENDING',
    approvedByUid: deleteField(),
    approvedByEmail: deleteField(),
    approvedAt: deleteField(),
  });
  await batch.commit();
};

export const updateMemberRole = async (memberUid: string, role: 'student' | 'organizer'): Promise<void> => {
  const memberRef = doc(db, 'users_public', memberUid);
  const batch = writeBatch(db);
  batch.update(memberRef, { role });
  await batch.commit();
};

/**
 * Fetches public profiles for all registered students.
 */
export const getAllStudents = async (): Promise<PublicUserProfile[]> => {
  try {
    const q = query(
      collection(db, 'users_public'),
      where('role', '==', 'student'),
      orderBy('displayName', 'asc'),
      limit(100)
    );

    const snapshot = await getDocs(q);
    const students: PublicUserProfile[] = [];

    snapshot.forEach((docSnap) => {
      students.push(docSnap.data() as PublicUserProfile);
    });

    return students;
  } catch (error) {
    console.error('Error fetching students list:', error);
    throw new Error('Failed to load student directory.');
  }
};

/**
 * Fetches full profile (Public + Private) for a specific student.
 * Only callable by authenticated organizers.
 */
export const getStudentFullDetail = async (studentId: string): Promise<StudentListItem | null> => {
  try {
    const publicRef = doc(db, 'users_public', studentId);
    const privateRef = doc(db, 'users_private', studentId);

    const [publicSnap, privateSnap] = await Promise.all([
      getDoc(publicRef),
      getDoc(privateRef),
    ]);

    if (!publicSnap.exists()) {
      return null;
    }

    const publicData = publicSnap.data() as PublicUserProfile;
    const privateData = privateSnap.exists() ? (privateSnap.data() as PrivateUserProfile) : undefined;

    return {
      ...publicData,
      privateDetails: privateData,
    };
  } catch (error) {
    console.error(`Error fetching detail for student ${studentId}:`, error);
    throw new Error('Failed to load student contact details. Ensure you have Organizer permissions.');
  }
};