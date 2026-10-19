import { deleteObject, getDownloadURL, ref, uploadBytesResumable } from 'firebase/storage';
import { doc, updateDoc } from 'firebase/firestore';
import { db, storage } from './firebase';
import { processProfileImage, type ProcessedImage } from '../utils/imageProcessing';

const PHOTO_ROOT = 'contact_photos';
const PHOTO_FILE_PREFIX = 'avatar';
const PHOTO_CONTENT_TYPE = 'image/jpeg';

export type ContactPhotoUploadStage = 'processing' | 'uploading' | 'saving';

export interface ContactPhotoUploadProgress {
  stage: ContactPhotoUploadStage;
  /** 0-100. Meaningful during the uploading stage. */
  percent: number;
}

export class ContactPhotoError extends Error {}

const buildPhotoRef = (contactId: string) => {
  // A timestamp in the filename keeps each upload a distinct object, so a cached
  // URL from a previous photo can never resolve to the wrong image.
  const fileName = `${PHOTO_FILE_PREFIX}_${Date.now()}.jpg`;
  return ref(storage, `${PHOTO_ROOT}/${contactId}/${fileName}`);
};

/**
 * Extracts the Storage path from a download URL so the previous object can be
 * cleaned up. Returns null for URLs not owned by this app, which must never be
 * deleted.
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
 * fail the overall operation, since the contact document is already correct.
 */
const deletePreviousPhotoObject = async (photoURL: string | undefined | null): Promise<void> => {
  const path = parseManagedPhotoPath(photoURL);
  if (!path) return;

  try {
    await deleteObject(ref(storage, path));
  } catch (error) {
    console.warn('Could not remove the previous contact photo object:', error);
  }
};

/**
 * Crops, downscales, and uploads a new contact photo, then points the contact
 * document at it.
 *
 * The Firestore write happens only after the upload succeeds, so a failed upload
 * can never leave the contact pointing at a missing image.
 */
export const uploadContactPhoto = async (
  contactId: string,
  file: File,
  currentPhotoURL: string | undefined | null,
  onProgress?: (progress: ContactPhotoUploadProgress) => void,
): Promise<string> => {
  if (!contactId) {
    throw new ContactPhotoError('This contact cannot be given a photo yet.');
  }

  onProgress?.({ stage: 'processing', percent: 0 });

  let processed: ProcessedImage;
  try {
    processed = await processProfileImage(file);
  } catch (error) {
    throw new ContactPhotoError(
      error instanceof Error ? error.message : 'That image could not be processed.',
    );
  }

  try {
    onProgress?.({ stage: 'uploading', percent: 0 });

    const photoRef = buildPhotoRef(contactId);
    const uploadTask = uploadBytesResumable(photoRef, processed.blob, {
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
      await updateDoc(doc(db, 'contacts', contactId), { photoUrl: downloadURL });
    } catch (error) {
      console.error('Contact photo uploaded but the contact could not be updated:', error);
      // Roll back the orphaned upload so storage is not left holding an unused object.
      await deletePreviousPhotoObject(downloadURL);
      throw new ContactPhotoError('The photo was uploaded but could not be saved. Please try again.');
    }

    await deletePreviousPhotoObject(currentPhotoURL);

    return downloadURL;
  } catch (error) {
    if (error instanceof ContactPhotoError) throw error;

    const code = (error as { code?: string })?.code;
    if (code === 'storage/unauthorized') {
      throw new ContactPhotoError('You do not have permission to change this photo.');
    }
    if (code === 'storage/retry-limit-exceeded') {
      throw new ContactPhotoError('The upload was interrupted. Please try again.');
    }
    throw new ContactPhotoError('The photo could not be uploaded. Please try again.');
  }
};

/**
 * Clears the contact photo. The document is cleared first so the UI falls back
 * to the default avatar immediately, and the stored object is removed afterwards.
 */
export const removeContactPhoto = async (
  contactId: string,
  currentPhotoURL: string | undefined | null,
): Promise<void> => {
  if (!contactId) {
    throw new ContactPhotoError('This contact cannot be given a photo yet.');
  }

  try {
    await updateDoc(doc(db, 'contacts', contactId), { photoUrl: null });
  } catch (error) {
    console.error('Could not clear the contact photo:', error);
    throw new ContactPhotoError('The photo could not be removed. Please try again.');
  }

  await deletePreviousPhotoObject(currentPhotoURL);
};
