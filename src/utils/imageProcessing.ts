/**
 * Client-side image preparation for profile photos.
 *
 * Photos are uploaded from phones, where camera captures are frequently 3-8 MB.
 * Every avatar in the app renders at 128px or smaller, so uploading the original
 * file wastes bandwidth and storage for no visible benefit.
 *
 * This module center-crops to a square and downsizes to a fixed edge, producing a
 * small JPEG that any avatar slot can render sharply.
 */

const TARGET_EDGE_PX = 512;
const MAX_UPLOAD_BYTES = 2 * 1024 * 1024;
const JPEG_QUALITY = 0.85;
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_INPUT_BYTES = 15 * 1024 * 1024;

export interface ProcessedImage {
  /** Downsized square JPEG ready for upload. */
  blob: Blob;
  width: number;
  height: number;
  sizeBytes: number;
}

export class ImageProcessingError extends Error {}

interface DecodedImage {
  source: CanvasImageSource;
  width: number;
  height: number;
  /** Frees decoder-owned memory when the source holds any. */
  release?: () => void;
}

/**
 * Validates a picked file before doing any decoding work, so obviously wrong
 * input fails fast with a message the user can act on.
 */
export const validateProfileImage = (file: File): void => {
  if (!ACCEPTED_TYPES.includes(file.type)) {
    throw new ImageProcessingError('Choose a JPG, PNG, or WebP image.');
  }

  if (file.size > MAX_INPUT_BYTES) {
    throw new ImageProcessingError('That image is too large. Choose one under 15 MB.');
  }
};

/**
 * Decodes an image into something drawable. Prefers createImageBitmap and falls
 * back to an <img> element for browsers without it.
 */
const decodeImage = async (file: Blob): Promise<DecodedImage> => {
  if (typeof createImageBitmap === 'function') {
    try {
      const bitmap = await createImageBitmap(file);
      return {
        source: bitmap,
        width: bitmap.width,
        height: bitmap.height,
        release: () => bitmap.close(),
      };
    } catch (error) {
      console.warn('createImageBitmap failed, falling back to <img> decoding:', error);
    }
  }

  const objectUrl = URL.createObjectURL(file);
  try {
    return await new Promise<DecodedImage>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve({
        source: image,
        width: image.naturalWidth,
        height: image.naturalHeight,
      });
      image.onerror = () => reject(new ImageProcessingError('That image could not be read.'));
      image.src = objectUrl;
    });
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
};

const canvasToBlob = (canvas: HTMLCanvasElement): Promise<Blob> =>
  new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new ImageProcessingError('That image could not be processed.'));
          return;
        }
        resolve(blob);
      },
      'image/jpeg',
      JPEG_QUALITY,
    );
  });

/**
 * Center-crops to a square, downscales to 512px, and returns a JPEG blob.
 * Images smaller than the target are left at their original size rather than
 * upscaled, so a small image is not turned blurry.
 */
export const processProfileImage = async (file: File): Promise<ProcessedImage> => {
  validateProfileImage(file);

  const decoded = await decodeImage(file);
  const sourceWidth = decoded.width;
  const sourceHeight = decoded.height;

  if (!sourceWidth || !sourceHeight) {
    throw new ImageProcessingError('That image could not be read.');
  }

  const squareEdge = Math.min(sourceWidth, sourceHeight);
  const cropX = Math.floor((sourceWidth - squareEdge) / 2);
  const cropY = Math.floor((sourceHeight - squareEdge) / 2);
  const outputEdge = Math.min(squareEdge, TARGET_EDGE_PX);

  const canvas = document.createElement('canvas');
  canvas.width = outputEdge;
  canvas.height = outputEdge;

  try {
    const context = canvas.getContext('2d');
    if (!context) {
      throw new ImageProcessingError('Your browser could not process the image.');
    }

    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = 'high';
    context.drawImage(decoded.source, cropX, cropY, squareEdge, squareEdge, 0, 0, outputEdge, outputEdge);
  } finally {
    decoded.release?.();
  }

  const blob = await canvasToBlob(canvas);

  // The processed JPEG should never exceed the rule limit, but guard anyway so a
  // surprising source image fails here rather than as a rejected upload.
  if (blob.size > MAX_UPLOAD_BYTES) {
    throw new ImageProcessingError('That image is too detailed to upload. Try a smaller photo.');
  }

  return {
    blob,
    width: outputEdge,
    height: outputEdge,
    sizeBytes: blob.size,
  };
};