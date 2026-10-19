import { deleteObject, getDownloadURL, ref, uploadBytesResumable } from 'firebase/storage';
import { doc, updateDoc } from 'firebase/firestore';
import { db, storage } from './firebase';

const PHOTO_ROOT = 'profile_photos';
const PHOTO_FILE_PREFIX = 'avatar';
const PHOTO_CONTENT_TYPE = 'image/jpeg';
const MAX_UPLOAD_BYTES = 2 * 1024 * 1024;

export type PhotoUploadStage = 'processing' | 'uploading' | 'saving';

export interface PhotoUploadProgress {
  stage: PhotoUploadStage;
  /** 0-100. Meaningful during the uploading stage. */
  percent: number;
}

export class ProfilePhotoError extends Error {}

const buildPhotoRef = (userId: string) => {
  // A timestamp in the filename keeps each upload a distinct object, so a cached
  // URL from a previous photo can never resolve to the wrong image.
  const fileName = `${PHOTO_FILE_PREFIX}_${Date.now()}.jpg`;
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

/**
 * Uploads a prepared profile photo and points the public profile document at it.
 *
 * The image is cropped and downsized by the caller, so the upload only carries
 * a small JPEG. The Firestore write happens only after the upload succeeds, so
 * a failed upload can never leave the profile pointing at a missing image.
 */
export const uploadProfilePhoto = async (
  userId: string,
  blob: Blob,
  currentPhotoURL: string | undefined | null,
  onProgress?: (progress: PhotoUploadProgress) => void,
): Promise<string> => {
  if (!userId) {
    throw new ProfilePhotoError('You must be signed in to change your photo.');
  }

  if (blob.size > MAX_UPLOAD_BYTES) {
    throw new ProfilePhotoError('That image is too detailed to upload. Try a smaller photo.');
  }

  try {
    onProgress?.({ stage: 'uploading', percent: 0 });

    const photoRef = buildPhotoRef(userId);
    const uploadTask = uploadBytesResumable(photoRef, blob, {
      contentType: PHOTO_CONTENT_TYPE,
      cacheControl: 'private, max-age=0, no-store',
    });

    const downloadURL = await new Promise<string>((resolve, reject) => {
      uploadTask.on(
        'state_changed',
        (snapshot) => {
          const percent = snapshot.totalBytes > 0
            ? Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100)
            : 0;
          onProgress?.({ stage: 'uploading', percent });
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

    onProgress?.({ stage: 'saving', percent: 100 });

    try {
      await updateDoc(doc(db, 'users_public', userId), { photoURL: downloadURL });
    } catch (error) {
      console.error('Photo uploaded but the profile could not be updated:', error);
      // Roll back the orphaned upload so storage is not left holding an unused object.
      await deletePreviousPhotoObject(downloadURL);
      throw new ProfilePhotoError('Your photo was uploaded but could not be saved. Please try again.');
    }

    await deletePreviousPhotoObject(currentPhotoURL);

    return downloadURL;
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
 * initials immediately, and the stored object is removed afterwards.
 */
export const removeProfilePhoto = async (
  userId: string,
  currentPhotoURL: string | undefined | null,
): Promise<void> => {
  if (!userId) {
    throw new ProfilePhotoError('You must be signed in to change your photo.');
  }

  try {
    await updateDoc(doc(db, 'users_public', userId), { photoURL: '' });
  } catch (error) {
    console.error('Could not clear the profile photo:', error);
    throw new ProfilePhotoError('Your photo could not be removed. Please try again.');
  }

  await deletePreviousPhotoObject(currentPhotoURL);
};