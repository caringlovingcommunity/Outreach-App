import { doc, writeBatch, serverTimestamp, getDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import type { PublicUserProfile, PrivateUserProfile, FacultyCode, CollegeName } from '../types/user';

export interface UpdateProfileInput {
  // Public fields
  displayName: string;
  faculty?: FacultyCode;
  course?: string;
  yearOfStudy?: 1 | 2 | 3 | 4 | 5;
  photoURL?: string;

  // Private PII fields
  phone?: string;
  gender?: 'Male' | 'Female';
  race?: string;
  hometown?: string;
  college?: CollegeName;
  invitedByUserId?: string;
  invitedByName?: string;
}

/**
 * Sanitizes input object by removing keys with `undefined` values,
 * preventing Firestore SDK runtime exceptions.
 */
const sanitizePayload = <T extends Record<string, any>>(obj: T): Partial<T> => {
  const sanitized: Record<string, any> = {};
  Object.keys(obj).forEach((key) => {
    if (obj[key] !== undefined) {
      sanitized[key] = obj[key];
    }
  });
  return sanitized as Partial<T>;
};

/**
 * Atomically updates both users_public and users_private documents.
 */
export const updateUserProfile = async (
  userId: string,
  input: UpdateProfileInput
): Promise<void> => {
  if (!userId) {
    throw new Error('User ID is required to update profile.');
  }

  const publicRef = doc(db, 'users_public', userId);
  const privateRef = doc(db, 'users_private', userId);

  // 1. Separate inputs into Public vs Private payloads
  const publicData: Partial<PublicUserProfile> = sanitizePayload({
    displayName: input.displayName.trim(),
    faculty: input.faculty,
    course: input.course?.trim(),
    yearOfStudy: input.yearOfStudy,
    photoURL: input.photoURL,
  });

  const privateData: Partial<PrivateUserProfile> = sanitizePayload({
    phone: input.phone?.trim(),
    gender: input.gender,
    race: input.race?.trim(),
    hometown: input.hometown?.trim(),
    college: input.college,
    invitedByUserId: input.invitedByUserId,
    invitedByName: input.invitedByName?.trim(),
    updatedAt: serverTimestamp(),
  });

  // 2. Initialize Firestore Batch Write
  const batch = writeBatch(db);

  // Use { merge: true } so missing legacy documents are created safely
  batch.set(publicRef, publicData, { merge: true });
  batch.set(privateRef, privateData, { merge: true });

  // 3. Commit Atomic Write
  try {
    await batch.commit();
  } catch (error) {
    console.error('Failed to commit profile batch update:', error);
    throw new Error('Failed to save profile changes. Please check your internet connection and try again.');
  }
};

/**
 * Helper function to fetch full combined user profile (Public + Private) for current user.
 */
export const getCompleteUserProfile = async (userId: string) => {
  const publicRef = doc(db, 'users_public', userId);
  const privateRef = doc(db, 'users_private', userId);

  const [publicSnap, privateSnap] = await Promise.all([
    getDoc(publicRef),
    getDoc(privateRef),
  ]);

  if (!publicSnap.exists()) {
    return null;
  }

  return {
    ...publicSnap.data(),
    ...(privateSnap.exists() ? privateSnap.data() : {}),
  };
};