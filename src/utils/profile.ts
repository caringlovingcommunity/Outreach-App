export interface ProfileCompletenessSource {
  displayName?: string;
  faculty?: string;
  course?: string;
  yearOfStudy?: number;
  phone?: string;
  college?: string;
}

export const isProfileComplete = (profile: ProfileCompletenessSource | null | undefined): boolean => Boolean(
  profile?.displayName &&
  profile.faculty &&
  profile.course &&
  profile.yearOfStudy &&
  profile.phone &&
  profile.college
);
