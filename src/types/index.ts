export type UserRole = 'student' | 'organizer';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  role: UserRole;
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
