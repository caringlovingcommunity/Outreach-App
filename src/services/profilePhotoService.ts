import { deleteObject, getDownloadURL, ref, uploadBytesResumable } from 'firebase/storage';
import { doc, updateDoc } from 'firebase/firestore';
import { db, storage } from './firebase';

const PHOTO_ROOT = 'profile_photos';
const AVATAR_FILE_PREFIX = 'avatar';
const FULL_FILE_PREFIX = 'photo';
const PHOTO_CONTENT_TYPE = 'image/jpeg';
const MAX_UPLOAD_BYTES = 2 * 1024 * 1024;

export type PhotoUploadStage = 'processing' | 'uploading' | 'saving';

export interface PhotoUploadProgress {
  stage: PhotoUploadStage;
  /** 0-100. Meaningful during the uploading stage. */
  percent: number;
}

/** The two versions of a photo: the framed avatar and the whole picture. */
export interface PhotoImages {
  avatar: Blob;
  full: Blob;
}

export interface UploadedPhoto {
  /** The avatar URL, stored on `photoURL`. */
  photoURL: string;
  /** The whole-picture URL, stored on `fullPhotoURL`. */
  fullPhotoURL: string;
}

export class ProfilePhotoError extends Error {}

const buildPhotoRef = (userId: string, prefix: string) => {
  // A timestamp in the filename keeps each upload a distinct object, so a cached
  // URL from a previous photo can never resolve to the wrong image.
  const fileName = `${prefix}_${Date.now()}.jpg`;
  return ref(storage, `${PHOTO_ROOT}/${userId}/${fileName}`);
};

/**
 * Extracts the Storage path from a download URL so the previous object can be
 * cleaned up. Returns null for URLs not owned by this app (for example the
 * Google account photo seeded at sign-in, which we must never delete).
 */
const parseManagedPhotoPath = (photoURL: string | undefined | null): string | null => {
  if (!photoURL || !photoURL.includes(PHOTO_ROOT)) return null;

  try {
    // Both storage.googleapis.com and firebasestorage.googleapis.com encode the
    // object path in /o/<encoded path>.
    const encodedPath = photoURL.split('/o/')[1]?.split('?')[0];
    if (!encodedPath) return null;
    const decodedPath = decodeURIComponent(encodedPath);
    return decodedPath.startsWith(`${PHOTO_ROOT}/`) ? decodedPath : null;
  } catch {
    return null;
  }
};

/**
 * Best-effort cleanup of the object a photoURL points at. A failure here must not
 * fail the overall operation, since the profile document is already correct.
 */
const deletePreviousPhotoObject = async (photoURL: string | undefined | null): Promise<void> => {
  const path = parseManagedPhotoPath(photoURL);
  if (!path) return;

  try {
    await deleteObject(ref(storage, path));
  } catch (error) {
    console.warn('Could not remove the previous profile photo object:', error);
  }
};

/** Uploads one blob and resolves to its download URL. */
const uploadBlob = (
  target: ReturnType<typeof buildPhotoRef>,
  blob: Blob,
  onPercent?: (percent: number) => void,
): Promise<string> => {
  const uploadTask = uploadBytesResumable(target, blob, {
    contentType: PHOTO_CONTENT_TYPE,
    cacheControl: 'private, max-age=0, no-store',
  });

  return new Promise<string>((resolve, reject) => {
    uploadTask.on(
      'state_changed',
      (snapshot) => {
        const percent = snapshot.totalBytes > 0
          ? Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100)
          : 0;
        onPercent?.(percent);
      },
      reject,
      async () => {
        try {
          resolve(await getDownloadURL(uploadTask.snapshot.ref));
        } catch (error) {
          reject(error);
        }
      },
    );
  });
};

/**
 * Uploads a profile photo and points the public profile document at it.
 *
 * Two objects are stored: the framed avatar, used everywhere a small circular
 * image is shown, and the whole picture, opened when the avatar is selected.
 * The Firestore write happens only after both uploads succeed, so a failed
 * upload can never leave the profile pointing at a missing image.
 */
export const uploadProfilePhoto = async (
  userId: string,
  images: PhotoImages,
  currentPhotoURL: string | undefined | null,
  currentFullPhotoURL: string | undefined | null,
  onProgress?: (progress: PhotoUploadProgress) => void,
): Promise<UploadedPhoto> => {
  if (!userId) {
    throw new ProfilePhotoError('You must be signed in to change your photo.');
  }

  for (const blob of [images.avatar, images.full]) {
    if (blob.size > MAX_UPLOAD_BYTES) {
      throw new ProfilePhotoError('That image is too detailed to upload. Try a smaller photo.');
    }
  }

  try {
    onProgress?.({ stage: 'uploading', percent: 0 });

    // Report the average of the two uploads so one number describes the pair.
    const percents: Record<string, number> = { avatar: 0, full: 0 };
    const report = () => {
      const average = Math.round((percents.avatar + percents.full) / 2);
      onProgress?.({ stage: 'uploading', percent: average });
    };

    const [avatarURL, fullURL] = await Promise.all([
      uploadBlob(buildPhotoRef(userId, AVATAR_FILE_PREFIX), images.avatar, (percent) => {
        percents.avatar = percent;
        report();
      }),
      uploadBlob(buildPhotoRef(userId, FULL_FILE_PREFIX), images.full, (percent) => {
        percents.full = percent;
        report();
      }),
    ]);

    onProgress?.({ stage: 'saving', percent: 100 });

    try {
      await updateDoc(doc(db, 'users_public', userId), {
        photoURL: avatarURL,
        fullPhotoURL: fullURL,
      });
    } catch (error) {
      console.error('Photo uploaded but the profile could not be updated:', error);
      // Roll back the orphaned uploads so storage is not left holding unused objects.
      await deletePreviousPhotoObject(avatarURL);
      await deletePreviousPhotoObject(fullURL);
      throw new ProfilePhotoError('Your photo was uploaded but could not be saved. Please try again.');
    }

    await deletePreviousPhotoObject(currentPhotoURL);
    await deletePreviousPhotoObject(currentFullPhotoURL);

    return { photoURL: avatarURL, fullPhotoURL: fullURL };
  } catch (error) {
    if (error instanceof ProfilePhotoError) throw error;

    const code = (error as { code?: string })?.code;
    if (code === 'storage/unauthorized') {
      throw new ProfilePhotoError('You do not have permission to change this photo.');
    }
    if (code === 'storage/retry-limit-exceeded') {
      throw new ProfilePhotoError('The upload was interrupted. Please try again.');
    }
    throw new ProfilePhotoError('Your photo could not be uploaded. Please try again.');
  }
};

/**
 * Clears the profile photo. The document is cleared first so the UI falls back to
 * initials immediately, and the stored objects are removed afterwards.
 */
export const removeProfilePhoto = async (
  userId: string,
  currentPhotoURL: string | undefined | null,
  currentFullPhotoURL: string | undefined | null,
): Promise<void> => {
  if (!userId) {
    throw new ProfilePhotoError('You must be signed in to change your photo.');
  }

  try {
    await updateDoc(doc(db, 'users_public', userId), {
      photoURL: '',
      fullPhotoURL: '',
    });
  } catch (error) {
    console.error('Could not clear the profile photo:', error);
    throw new ProfilePhotoError('Your photo could not be removed. Please try again.');
  }

  await deletePreviousPhotoObject(currentPhotoURL);
  await deletePreviousPhotoObject(currentFullPhotoURL);
};
