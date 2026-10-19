import { deleteObject, getDownloadURL, ref, uploadBytesResumable } from 'firebase/storage';
import { doc, updateDoc } from 'firebase/firestore';
import { db, storage } from './firebase';

const PHOTO_ROOT = 'contact_photos';
const AVATAR_FILE_PREFIX = 'avatar';
const FULL_FILE_PREFIX = 'photo';
const PHOTO_CONTENT_TYPE = 'image/jpeg';
const MAX_UPLOAD_BYTES = 2 * 1024 * 1024;

export type ContactPhotoUploadStage = 'processing' | 'uploading' | 'saving';

export interface ContactPhotoUploadProgress {
  stage: ContactPhotoUploadStage;
  /** 0-100. Meaningful during the uploading stage. */
  percent: number;
}

/** The two versions of a photo: the framed avatar and the whole picture. */
export interface ContactPhotoImages {
  avatar: Blob;
  full: Blob;
}

export interface UploadedContactPhoto {
  /** The avatar URL, stored on `photoUrl`. */
  photoUrl: string;
  /** The whole-picture URL, stored on `fullPhotoUrl`. */
  fullPhotoUrl: string;
}

export class ContactPhotoError extends Error {}

const buildPhotoRef = (contactId: string, prefix: string) => {
  // A timestamp in the filename keeps each upload a distinct object, so a cached
  // URL from a previous photo can never resolve to the wrong image.
  const fileName = `${prefix}_${Date.now()}.jpg`;
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
 * Uploads a contact photo and points the contact document at it.
 *
 * Two objects are stored: the framed avatar, used everywhere a small circular
 * image is shown, and the whole picture, opened when the avatar is selected.
 * The Firestore write happens only after both uploads succeed, so a failed
 * upload can never leave the contact pointing at a missing image.
 */
export const uploadContactPhoto = async (
  contactId: string,
  images: ContactPhotoImages,
  currentPhotoURL: string | undefined | null,
  currentFullPhotoURL: string | undefined | null,
  onProgress?: (progress: ContactPhotoUploadProgress) => void,
): Promise<UploadedContactPhoto> => {
  if (!contactId) {
    throw new ContactPhotoError('This contact cannot be given a photo yet.');
  }

  for (const blob of [images.avatar, images.full]) {
    if (blob.size > MAX_UPLOAD_BYTES) {
      throw new ContactPhotoError('That image is too detailed to upload. Try a smaller photo.');
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
      uploadBlob(buildPhotoRef(contactId, AVATAR_FILE_PREFIX), images.avatar, (percent) => {
        percents.avatar = percent;
        report();
      }),
      uploadBlob(buildPhotoRef(contactId, FULL_FILE_PREFIX), images.full, (percent) => {
        percents.full = percent;
        report();
      }),
    ]);

    onProgress?.({ stage: 'saving', percent: 100 });

    try {
      await updateDoc(doc(db, 'contacts', contactId), {
        photoUrl: avatarURL,
        fullPhotoUrl: fullURL,
      });
    } catch (error) {
      console.error('Contact photo uploaded but the contact could not be updated:', error);
      // Roll back the orphaned uploads so storage is not left holding unused objects.
      await deletePreviousPhotoObject(avatarURL);
      await deletePreviousPhotoObject(fullURL);
      throw new ContactPhotoError('The photo was uploaded but could not be saved. Please try again.');
    }

    await deletePreviousPhotoObject(currentPhotoURL);
    await deletePreviousPhotoObject(currentFullPhotoURL);

    return { photoUrl: avatarURL, fullPhotoUrl: fullURL };
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
 * to the default avatar immediately, and the stored objects are removed afterwards.
 */
export const removeContactPhoto = async (
  contactId: string,
  currentPhotoURL: string | undefined | null,
  currentFullPhotoURL: string | undefined | null,
): Promise<void> => {
  if (!contactId) {
    throw new ContactPhotoError('This contact cannot be given a photo yet.');
  }

  try {
    await updateDoc(doc(db, 'contacts', contactId), {
      photoUrl: null,
      fullPhotoUrl: null,
    });
  } catch (error) {
    console.error('Could not clear the contact photo:', error);
    throw new ContactPhotoError('The photo could not be removed. Please try again.');
  }

  await deletePreviousPhotoObject(currentPhotoURL);
  await deletePreviousPhotoObject(currentFullPhotoURL);
};
