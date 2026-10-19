import React, { useRef, useState } from 'react';
import { Camera, Loader2, Trash2 } from 'lucide-react';
import {
  ProfilePhotoError,
  removeProfilePhoto,
  uploadProfilePhoto,
  type PhotoUploadProgress,
} from '../services/profilePhotoService';

type PickerSize = 'sm' | 'md';

interface ProfilePhotoPickerProps {
  userId: string;
  photoURL?: string;
  displayName: string;
  /** Called with the new value ('' when removed) once the change is saved. */
  onPhotoChanged?: (photoURL: string) => void;
  size?: PickerSize;
  /** Label for the action, e.g. "Change photo" or "Update for this student". */
  changeLabel?: string;
}

const AVATAR_DIMENSIONS: Record<PickerSize, { avatar: string; ring: string; initial: string }> = {
  sm: { avatar: 'h-12 w-12', ring: 'h-6 w-6', initial: 'text-base' },
  md: { avatar: 'h-24 w-24', ring: 'h-8 w-8', initial: 'text-3xl' },
};

const PROGRESS_LABELS: Record<PhotoUploadProgress['stage'], string> = {
  processing: 'Preparing image...',
  uploading: 'Uploading...',
  saving: 'Saving...',
};

export const ProfilePhotoPicker: React.FC<ProfilePhotoPickerProps> = ({
  userId,
  photoURL,
  displayName,
  onPhotoChanged,
  size = 'md',
  changeLabel = 'Change photo',
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [localPhotoURL, setLocalPhotoURL] = useState<string>(photoURL || '');
  const [uploading, setUploading] = useState<boolean>(false);
  const [progress, setProgress] = useState<PhotoUploadProgress>({ stage: 'processing', percent: 0 });
  const [imageFailed, setImageFailed] = useState<boolean>(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Follow the stored profile so an update from another device, or a revert, is
  // reflected here too. Adjusting during render keeps this off the effect path.
  const [lastPhotoURLProp, setLastPhotoURLProp] = useState<string | undefined>(photoURL);
  if (photoURL !== lastPhotoURLProp) {
    setLastPhotoURLProp(photoURL);
    setLocalPhotoURL(photoURL || '');
    setImageFailed(false);
  }

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    // Reset so picking the same file twice in a row still fires a change event.
    event.target.value = '';
    if (!file) return;

    setMessage(null);
    setUploading(true);
    setProgress({ stage: 'processing', percent: 0 });

    try {
      const newPhotoURL = await uploadProfilePhoto(userId, file, localPhotoURL, setProgress);
      setLocalPhotoURL(newPhotoURL);
      setImageFailed(false);
      onPhotoChanged?.(newPhotoURL);
      setMessage({ type: 'success', text: 'Profile photo updated.' });
    } catch (error) {
      console.error('Profile photo upload failed:', error);
      setMessage({
        type: 'error',
        text: error instanceof ProfilePhotoError ? error.message : 'Your photo could not be uploaded. Please try again.',
      });
    } finally {
      setUploading(false);
      setProgress({ stage: 'processing', percent: 0 });
    }
  };

  const handleRemove = async () => {
    setMessage(null);
    setUploading(true);

    try {
      await removeProfilePhoto(userId, localPhotoURL);
      setLocalPhotoURL('');
      setImageFailed(false);
      onPhotoChanged?.('');
      setMessage({ type: 'success', text: 'Profile photo removed.' });
    } catch (error) {
      console.error('Profile photo removal failed:', error);
      setMessage({
        type: 'error',
        text: error instanceof ProfilePhotoError ? error.message : 'Your photo could not be removed. Please try again.',
      });
    } finally {
      setUploading(false);
    }
  };

  const dimensions = AVATAR_DIMENSIONS[size];
  const hasPhoto = Boolean(localPhotoURL) && !imageFailed;
  const initial = displayName.charAt(0).toUpperCase() || 'U';

  return (
    <div>
      <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
        <div className={`relative shrink-0 ${dimensions.avatar}`}>
          {hasPhoto ? (
            <img
              src={localPhotoURL}
              alt={`${displayName} profile photo`}
              onError={() => setImageFailed(true)}
              className={`h-full w-full rounded-full border border-border object-cover shadow-app-sm`}
            />
          ) : (
            <div
              className={`flex h-full w-full items-center justify-center rounded-full border border-border bg-primary-soft font-bold text-primary`}
            >
              <span className={dimensions.initial}>{initial}</span>
            </div>
          )}

          {uploading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center rounded-full bg-surface/85 text-center">
              <Loader2 className={`${dimensions.ring} animate-spin text-primary`} aria-hidden="true" />
            </div>
          )}

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            aria-label={`${changeLabel} for ${displayName}`}
            title={changeLabel}
            className="app-icon-button absolute -bottom-1 -right-1 size-9 border-2 border-white bg-primary text-white shadow-app-sm hover:bg-primary-hover disabled:opacity-60"
          >
            <Camera className="h-4 w-4" aria-hidden="true" />
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleFileChange}
            className="sr-only"
            aria-label={`${changeLabel} for ${displayName}`}
          />
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-sm text-muted">
            Use a clear, front-facing photo. JPG, PNG, or WebP up to 15 MB. The photo is cropped to a square and resized automatically.
          </p>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="app-button-secondary min-h-11 px-4 py-2 text-sm"
            >
              <Camera className="h-4 w-4" aria-hidden="true" />
              {changeLabel}
            </button>

            {localPhotoURL && (
              <button
                type="button"
                onClick={handleRemove}
                disabled={uploading}
                className="app-button-text min-h-11 px-3 text-sm"
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
                Remove
              </button>
            )}

            {uploading && (
              <span className="text-xs font-medium text-muted" role="status">
                {PROGRESS_LABELS[progress.stage]}
                {progress.stage === 'uploading' && progress.percent > 0 ? ` ${progress.percent}%` : ''}
              </span>
            )}
          </div>
        </div>
      </div>

      {message && (
        <div
          className={`mt-4 ${message.type === 'success' ? 'app-alert-success' : 'app-alert-error'}`}
          role={message.type === 'error' ? 'alert' : 'status'}
        >
          {message.text}
        </div>
      )}
    </div>
  );
};