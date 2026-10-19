import React, { useRef, useState } from 'react';
import { Camera, Loader2, Trash2 } from 'lucide-react';
import { PhotoLightbox } from './PhotoLightbox';
import { ImageCropModal, type CropArea } from './ImageCropModal';
import {
  ProfilePhotoError,
  removeProfilePhoto,
  uploadProfilePhoto,
  type PhotoUploadProgress,
} from '../services/profilePhotoService';
import { prepareProfileImages, validateProfileImage } from '../utils/imageProcessing';

type PickerSize = 'sm' | 'md';

interface ProfilePhotoPickerProps {
  userId: string;
  /** The framed avatar currently on the profile. */
  photoURL?: string;
  /** The whole picture, opened when the avatar is selected. */
  fullPhotoURL?: string;
  displayName: string;
  /** Called with the new values once the change is saved. */
  onPhotoChanged?: (photoURL: string, fullPhotoURL: string) => void;
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
  fullPhotoURL,
  displayName,
  onPhotoChanged,
  size = 'md',
  changeLabel = 'Change photo',
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [localPhotoURL, setLocalPhotoURL] = useState<string>(photoURL || '');
  const [localFullPhotoURL, setLocalFullPhotoURL] = useState<string>(fullPhotoURL || '');
  const [uploading, setUploading] = useState<boolean>(false);
  const [progress, setProgress] = useState<PhotoUploadProgress>({ stage: 'processing', percent: 0 });
  const [imageFailed, setImageFailed] = useState<boolean>(false);
  const [enlarged, setEnlarged] = useState<boolean>(false);
  /** The image waiting to be framed by the user. */
  const [cropSource, setCropSource] = useState<{ file: File; url: string } | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Follow the stored profile so an update from another device, or a revert, is
  // reflected here too. Adjusting during render keeps this off the effect path.
  const [lastPhotoURLProp, setLastPhotoURLProp] = useState<string | undefined>(photoURL);
  if (photoURL !== lastPhotoURLProp) {
    setLastPhotoURLProp(photoURL);
    setLocalPhotoURL(photoURL || '');
    setImageFailed(false);
  }

  const [lastFullPhotoURLProp, setLastFullPhotoURLProp] = useState<string | undefined>(fullPhotoURL);
  if (fullPhotoURL !== lastFullPhotoURLProp) {
    setLastFullPhotoURLProp(fullPhotoURL);
    setLocalFullPhotoURL(fullPhotoURL || '');
  }

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    // Reset so picking the same file twice in a row still fires a change event.
    event.target.value = '';
    if (!file) return;

    setMessage(null);

    // Reject an unusable file before the user spends time framing it.
    try {
      validateProfileImage(file);
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'That image cannot be used.',
      });
      return;
    }

    setCropSource({ file, url: URL.createObjectURL(file) });
  };

  const handleCropCancel = () => {
    if (cropSource) URL.revokeObjectURL(cropSource.url);
    setCropSource(null);
  };

  const handleCropSave = async (crop: CropArea) => {
    const source = cropSource;
    setCropSource(null);
    if (!source) return;

    setUploading(true);
    setProgress({ stage: 'processing', percent: 0 });

    try {
      const prepared = await prepareProfileImages(source.file, crop);
      URL.revokeObjectURL(source.url);

      const uploaded = await uploadProfilePhoto(
        userId,
        { avatar: prepared.avatar, full: prepared.full },
        localPhotoURL,
        localFullPhotoURL,
        setProgress,
      );
      setLocalPhotoURL(uploaded.photoURL);
      setLocalFullPhotoURL(uploaded.fullPhotoURL);
      setImageFailed(false);
      onPhotoChanged?.(uploaded.photoURL, uploaded.fullPhotoURL);
      setMessage({ type: 'success', text: 'Profile photo updated.' });
    } catch (error) {
      console.error('Profile photo upload failed:', error);
      URL.revokeObjectURL(source.url);
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
      await removeProfilePhoto(userId, localPhotoURL, localFullPhotoURL);
      setLocalPhotoURL('');
      setLocalFullPhotoURL('');
      setImageFailed(false);
      onPhotoChanged?.('', '');
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
            <button
              type="button"
              onClick={() => setEnlarged(true)}
              aria-label={`Enlarge ${displayName}'s profile photo`}
              title="Enlarge photo"
              className="block h-full w-full overflow-hidden rounded-full border border-border shadow-app-sm"
            >
              <img
                src={localPhotoURL}
                alt={`${displayName} profile photo`}
                onError={() => setImageFailed(true)}
                className="h-full w-full object-cover"
              />
            </button>
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
            onClick={(event) => {
              // The camera badge sits on top of the photo, so keep its click
              // from also enlarging the photo underneath.
              event.stopPropagation();
              fileInputRef.current?.click();
            }}
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

      {enlarged && hasPhoto && (
        <PhotoLightbox
          src={localFullPhotoURL || localPhotoURL}
          alt={`${displayName} profile photo`}
          caption={displayName}
          onClose={() => setEnlarged(false)}
        />
      )}

      {cropSource && (
        <ImageCropModal
          imageSrc={cropSource.url}
          imageName={displayName}
          onCancel={handleCropCancel}
          onSave={(crop) => void handleCropSave(crop)}
        />
      )}
    </div>
  );
};