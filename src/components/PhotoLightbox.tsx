import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

interface PhotoLightboxProps {
  src: string;
  /** Describes the person or photo. Used as the accessible name. */
  alt: string;
  /** Optional line shown under the image, e.g. the person's name. */
  caption?: string;
  onClose: () => void;
}

/**
 * Enlarged view of a photo.
 *
 * The image is shown as large as the viewport allows without cropping, so the
 * whole picture can be inspected. Escape and a click on the backdrop close it.
 */
export const PhotoLightbox: React.FC<PhotoLightboxProps> = ({ src, alt, caption, onClose }) => {
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // Escape closes, and focus stays inside the dialog while it is open.
  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== 'Tab') return;

      const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      if (!focusable || focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;

      if (event.shiftKey && (active === first || active === closeButtonRef.current)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    closeButtonRef.current?.focus();

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      previouslyFocused?.focus?.();
    };
  }, [onClose]);

  return createPortal(
    <div
      className="app-modal-backdrop items-center justify-center bg-black/75 p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        ref={dialogRef}
        className="flex max-h-full w-full max-w-3xl flex-col items-center gap-3"
        role="dialog"
        aria-modal="true"
        aria-label={alt}
        onClick={(event) => event.stopPropagation()}
      >
        <img
          src={src}
          alt={alt}
          className="max-h-[78vh] w-auto max-w-full rounded-app-lg object-contain shadow-app-lg"
        />
        {caption && (
          <p className="text-sm font-medium text-white/90">{caption}</p>
        )}
        <button
          ref={closeButtonRef}
          type="button"
          onClick={onClose}
          aria-label="Close image"
          className="app-icon-button bg-white/95 text-text shadow-app-md hover:bg-white"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
    </div>,
    document.body,
  );
};
