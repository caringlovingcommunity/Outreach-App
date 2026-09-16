import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  getDoc,
  limit,
  orderBy 
} from 'firebase/firestore';
import { db } from '../services/firebase';
import type { PublicUserProfile, PrivateUserProfile } from '../types/user';

export interface StudentListItem extends PublicUserProfile {
  // We combine public and private data when an organizer views details
  privateDetails?: PrivateUserProfile;
}

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