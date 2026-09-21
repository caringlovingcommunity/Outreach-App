export type UserRole = 'student' | 'organizer' | 'admin';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  role: UserRole;
  visionCastingAccepted?: boolean;
  membershipStatus?: 'PENDING' | 'APPROVED' | 'REJECTED' | 'FILTERED';
  approvedByUid?: string;
  approvedByEmail?: string;
  approvedAt?: any;
  createdAt: any;
}

export interface Semester {
  semesterId: string;
  name: string;
  isActive: boolean;
  startDate?: any;
  endDate?: any;
}

export interface Availability {
  userId: string;
  semesterId: string;
  slots: string[];
  updatedAt: any;
}

export type Gender = 'male' | 'female';
export type GospelStatus = 'not_started' | 'gospel_conversation' | 'gospel_presentation';
export type ResponseStatus = 'pray_receive_christ' | 'already_christian' | 'not_ready' | 'say_yes_follow_up';
export const JOURNEY_OF_FAITH_STEPS = ['vision_cast', 'jof1_1', 'jof1_2', 'jof1_3', 'jof1_4', 'jof1_5', 'jof1_6', 'jof1_7', 'jof1_8'] as const;
export type JourneyOfFaithStep = typeof JOURNEY_OF_FAITH_STEPS[number];

export interface FollowUpProgress {
  vision_cast: boolean;
  jof1_1: boolean;
  jof1_2: boolean;
  jof1_3: boolean;
  jof1_4: boolean;
  jof1_5: boolean;
  jof1_6: boolean;
  jof1_7: boolean;
  jof1_8: boolean;
}

export interface Contact {
  id: string;
  createdById: string;
  createdByName: string;
  name: string;
  phoneNumber?: string;
  gender: Gender;
  photoUrl?: string | null;
  gospelStatus: GospelStatus;
  responseStatuses: ResponseStatus[];
  followUpProgress: FollowUpProgress;
  remarks?: string;
  linkedUserId?: string;
  linkedAt?: any;
  linkedByUid?: string;
  createdAt: any;
  updatedAt: any;
}

export type ContactInput = Omit<Contact, 'id' | 'createdById' | 'createdByName' | 'createdAt' | 'updatedAt' | 'photoUrl'>;
