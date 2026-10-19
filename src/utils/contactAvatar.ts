import type { Gender } from '../types';

/**
 * Default avatars for contacts without a photo. They are bundled in `public/`
 * and mirror the male/female placeholder the contact list has always used.
 */
export const DEFAULT_CONTACT_AVATARS: Record<Gender, string> = {
  male: '/Avatar%20-%20Male%20_1.png',
  female: '/Avatar%20-%20Female%20_1.png',
};

export const getDefaultContactAvatar = (gender: Gender | undefined): string =>
  (gender && DEFAULT_CONTACT_AVATARS[gender]) || DEFAULT_CONTACT_AVATARS.male;
