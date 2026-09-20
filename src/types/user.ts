// src/types/user.ts

export type FacultyCode = 
  | 'FENG' | 'FACA' | 'FBE' | 'FCSHD' | 'FCSIT' 
  | 'FEB' | 'FELC' | 'FMHS' | 'FRST' | 'FSSH' | 'FUU';

export type CollegeName = 
  | 'Alamanda' | 'Bunga Raya' | 'Cempaka' | 'Sakura' 
  | 'Taz' | 'Kenanga' | 'Kasturi' | 'Seroja' 
  | 'Roffo' | 'Unijaya' | 'Uni central' | 'Other';

export type MembershipStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

/**
 * Public document stored in users_public/{userId}
 * Safe for any logged-in user to query (e.g. for "Invited By" search).
 */
export interface PublicUserProfile {
  uid: string;
  displayName: string;
  photoURL?: string;
  faculty?: FacultyCode;
  course?: string;
  yearOfStudy?: 1 | 2 | 3 | 4 | 5;
  role: 'student' | 'organizer';
  visionCastingAccepted?: boolean;
  membershipStatus?: MembershipStatus;
  approvedByUid?: string;
  approvedByEmail?: string;
  approvedAt?: any;
  createdAt: any;
}

/**
 * Private document stored in users_private/{userId}
 * Contains sensitive PII and detailed contact information.
 * Accessible ONLY by the user themselves OR Organizers.
 */
export interface PrivateUserProfile {
  uid: string;
  email?: string;
  phone?: string;
  gender?: 'Male' | 'Female';
  race?: string;
  hometown?: string;
  college?: CollegeName;
  invitedByUserId?: string;
  invitedByName?: string; // Denormalized name for display convenience
  updatedAt: any;
  isProfileComplete: boolean;
}

/**
 * Combined view used in local React State when rendering the Profile UI
 */
export interface CompleteUserProfile extends PublicUserProfile, Omit<PrivateUserProfile, 'uid' | 'updatedAt'> {}