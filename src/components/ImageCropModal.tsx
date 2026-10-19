import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Cropper, { type Area } from 'react-easy-crop';
import 'react-easy-crop/react-easy-crop.css';
import { Minus, Plus, X } from 'lucide-react';

export interface CropArea {
  /** Rectangle in the source image's own pixels. */
  x: number;
  y: number;
  width: number;
  height: number;
}

interface ImageCropModalProps {
  /** Object URL of the image to crop. */
  imageSrc: string;
  /** Name of the person the photo belongs to, used in labels. */
  imageName: string;
  onCancel: () => void;
  /** Called with the chosen rectangle when the crop is confirmed. */
  onSave: (crop: CropArea) => void;
}

const MIN_ZOOM = 1;
const MAX_ZOOM = 3;

/**
 * Lets the user frame their own photo before it is uploaded.
 *
 * The crop is a square, matching how every avatar is displayed, and the
 * rectangle is reported in the source image's own pixels so the exact region
 * can be cut out at full resolution.
 */
export const ImageCropModal: React.FC<ImageCropModalProps> = ({
  imageSrc,
  imageName,
  onCancel,
  onSave,
}) => {
  const areaRef = useRef<HTMLDivElement>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(MIN_ZOOM);
  const [cropSize, setCropSize] = useState({ width: 0, height: 0 });
  const [croppedArea, setCroppedArea] = useState<CropArea | null>(null);

  // The crop window is sized to the space available, so it stays comfortable
  // on a phone and does not dwarf the image on a desktop.
  useEffect(() => {
    const element = areaRef.current;
    if (!element) return undefined;

    const update = () => {
      const { width, height } = element.getBoundingClientRect();
      if (!width || !height) return;
      const edge = Math.max(120, Math.min(width, height) * 0.78);
      setCropSize({ width: edge, height: edge });
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onCancel();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onCancel]);

  const adjustZoom = useCallback((delta: number) => {
    setZoom((current) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Number((current + delta).toFixed(2)))));
  }, []);

  const handleSave = () => {
    if (!croppedArea) return;
    onSave(croppedArea);
  };

  return createPortal(
    <div className="app-modal-backdrop items-center justify-center p-0 sm:p-4">
      <div
        className="flex h-full w-full max-w-3xl flex-col bg-surface sm:h-[92vh] sm:max-h-[92vh] sm:rounded-app-lg sm:shadow-app-lg"
        role="dialog"
        aria-modal="true"
        aria-label={`Crop photo for ${imageName}`}
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="text-base font-bold text-text">Crop photo</h2>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Cancel cropping"
            className="app-icon-button size-9"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div ref={areaRef} className="relative min-h-64 flex-1 bg-text/90">
          {cropSize.width > 0 && (
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              aspect={1}
              cropShape="round"
              showGrid
              minZoom={MIN_ZOOM}
              maxZoom={MAX_ZOOM}
              cropSize={cropSize}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={(_area: Area, areaPixels: Area) => {
                setCroppedArea({
                  x: areaPixels.x,
                  y: areaPixels.y,
                  width: areaPixels.width,
                  height: areaPixels.height,
                });
              }}
              style={{ containerStyle: { position: 'absolute', inset: 0 } }}
            />
          )}
        </div>

        <div className="space-y-3 border-t border-border px-4 py-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => adjustZoom(-0.1)}
              disabled={zoom <= MIN_ZOOM}
              aria-label="Zoom out"
              className="app-icon-button size-9 shrink-0 border border-border disabled:opacity-50"
            >
              <Minus className="h-4 w-4" aria-hidden="true" />
            </button>
            <input
              type="range"
              min={MIN_ZOOM}
              max={MAX_ZOOM}
              step={0.01}
              value={zoom}
              onChange={(event) => setZoom(Number(event.target.value))}
              aria-label="Zoom"
              className="h-2 flex-1 cursor-pointer appearance-none rounded-full bg-surface-muted accent-primary"
            />
            <button
              type="button"
              onClick={() => adjustZoom(0.1)}
              disabled={zoom >= MAX_ZOOM}
              aria-label="Zoom in"
              className="app-icon-button size-9 shrink-0 border border-border disabled:opacity-50"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          <p className="text-xs text-muted">
            Drag to reposition and pinch or use the slider to zoom.
          </p>

          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <button type="button" onClick={onCancel} className="app-button-secondary">
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={!croppedArea}
              className="app-button-primary"
            >
              Save photo
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
};
