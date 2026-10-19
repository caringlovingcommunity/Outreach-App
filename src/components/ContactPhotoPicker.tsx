import React, { useRef, useState } from 'react';
import { Camera, Loader2, Trash2 } from 'lucide-react';
import { PhotoLightbox } from './PhotoLightbox';
import { ImageCropModal, type CropArea } from './ImageCropModal';
import type { Gender } from '../types';
import { getDefaultContactAvatar } from '../utils/contactAvatar';
import { processProfileImage, validateProfileImage } from '../utils/imageProcessing';

interface ContactPhotoPickerProps {
  /** Drives which default avatar is shown when there is no photo yet. */
  gender: Gender;
  /** The photo already saved on the contact, if any. */
  photoUrl?: string | null;
  /** Local preview of a photo picked but not uploaded yet. */
  pendingPreviewUrl?: string | null;
  /** Called with the cropped image. The parent stages and uploads it. */
  onPick: (blob: Blob) => void;
  /** Called when the user clears the current photo. */
  onRemove: () => void;
  /** True while the form is saving, so the control cannot be used twice. */
  busy?: boolean;
  /** Name used in the accessible labels. */
  contactName?: string;
}

/**
 * Photo control for a contact.
 *
 * A photo is optional: without one the contact keeps the default avatar for
 * the selected gender. The pick is framed by the user, then staged by the
 * parent and uploaded with the contact, so a new contact — which has no
 * document yet — can still be given a photo before it is saved.
 */
export const ContactPhotoPicker: React.FC<ContactPhotoPickerProps> = ({
  gender,
  photoUrl,
  pendingPreviewUrl,
  onPick,
  onRemove,
  busy = false,
  contactName = 'this contact',
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imageFailed, setImageFailed] = useState(false);
  const [enlarged, setEnlarged] = useState(false);
  /** The image waiting to be framed by the user. */
  const [cropSource, setCropSource] = useState<{ file: File; url: string } | null>(null);
  const [cropError, setCropError] = useState<string | null>(null);

  const displayUrl = pendingPreviewUrl || (imageFailed ? null : photoUrl) || null;
  const hasCustomPhoto = Boolean(pendingPreviewUrl || (photoUrl && !imageFailed));

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    // Reset so picking the same file twice in a row still fires a change event.
    event.target.value = '';
    if (!file) return;

    // Reject an unusable file before the user spends time framing it.
    try {
      validateProfileImage(file);
    } catch (error) {
      setCropError(error instanceof Error ? error.message : 'That image cannot be used.');
      return;
    }

    setCropError(null);
    setImageFailed(false);
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

    try {
      const processed = await processProfileImage(source.file, crop);
      URL.revokeObjectURL(source.url);
      onPick(processed.blob);
    } catch (error) {
      console.error('Could not crop the contact photo:', error);
      URL.revokeObjectURL(source.url);
      setCropError(error instanceof Error ? error.message : 'That image could not be processed.');
    }
  };

  return (
    <div className="flex items-start gap-4">
      <div className="relative h-20 w-20 shrink-0">
        {displayUrl ? (
          <button
            type="button"
            onClick={() => setEnlarged(true)}
            aria-label={`Enlarge ${contactName}'s photo`}
            title="Enlarge photo"
            className="block h-full w-full overflow-hidden rounded-full border border-border"
          >
            <img
              src={displayUrl}
              alt={`${contactName} photo`}
              onError={() => setImageFailed(true)}
              className="h-full w-full object-cover"
            />
          </button>
        ) : (
          <img
            src={getDefaultContactAvatar(gender)}
            alt={`${gender} default avatar`}
            className="h-full w-full rounded-full border border-border bg-primary-soft object-cover"
          />
        )}

        {busy && (
          <div className="absolute inset-0 flex items-center justify-center rounded-full bg-surface/85">
            <Loader2 className="h-6 w-6 animate-spin text-primary" aria-hidden="true" />
          </div>
        )}

        <button
          type="button"
          onClick={(event) => {
            // The camera badge sits on top of the photo, so keep its click from
            // also enlarging the photo underneath.
            event.stopPropagation();
            fileInputRef.current?.click();
          }}
          disabled={busy}
          aria-label={`Upload a photo for ${contactName}`}
          title="Upload a photo"
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
          aria-label={`Upload a photo for ${contactName}`}
        />
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-sm text-muted">
          Add a photo so this contact is easier to recognise. It is optional — without one the default avatar is used.
        </p>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={busy}
            className="app-button-secondary min-h-11 px-4 py-2 text-sm"
          >
            <Camera className="h-4 w-4" aria-hidden="true" />
            {hasCustomPhoto ? 'Replace photo' : 'Upload photo'}
          </button>

          {hasCustomPhoto && (
            <button
              type="button"
              onClick={onRemove}
              disabled={busy}
              className="app-button-text min-h-11 px-3 text-sm"
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
              Remove
            </button>
          )}
        </div>
      </div>

      {cropError && (
        <p className="app-alert-error mt-3" role="alert">
          {cropError}
        </p>
      )}

      {enlarged && displayUrl && (
        <PhotoLightbox
          src={displayUrl}
          alt={`${contactName} photo`}
          caption={contactName}
          onClose={() => setEnlarged(false)}
        />
      )}

      {cropSource && (
        <ImageCropModal
          imageSrc={cropSource.url}
          imageName={contactName}
          onCancel={handleCropCancel}
          onSave={(crop) => void handleCropSave(crop)}
        />
      )}
    </div>
  );
};
