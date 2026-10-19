/**
 * Client-side image preparation for profile and contact photos.
 *
 * Photos are uploaded from phones, where camera captures are frequently 3-8 MB.
 * Two versions are prepared from one pick:
 *
 * - the full picture, downscaled but never cropped, so it can be opened and
 *   looked at properly;
 * - the avatar, the square region the user framed, used everywhere a small
 *   circular image is shown.
 *
 * Both are small JPEGs, so uploading them costs little and every avatar slot
 * still renders sharply.
 */

/** A rectangle in the source image's own pixels. */
export interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

const AVATAR_EDGE_PX = 512;
const FULL_MAX_EDGE_PX = 1600;
const MAX_UPLOAD_BYTES = 2 * 1024 * 1024;
const JPEG_QUALITY = 0.85;
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_INPUT_BYTES = 15 * 1024 * 1024;

export interface PreparedImages {
  /** The framed square used for the avatar. */
  avatar: Blob;
  /** The whole picture, downscaled. */
  full: Blob;
  avatarSize: number;
  fullSize: number;
  fullWidth: number;
  fullHeight: number;
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

/** Draws a region of the source into a canvas of the given size. */
const drawRegion = (
  source: CanvasImageSource,
  region: { x: number; y: number; width: number; height: number },
  outputWidth: number,
  outputHeight: number,
): HTMLCanvasElement => {
  const canvas = document.createElement('canvas');
  canvas.width = outputWidth;
  canvas.height = outputHeight;

  const context = canvas.getContext('2d');
  if (!context) {
    throw new ImageProcessingError('Your browser could not process the image.');
  }

  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';
  context.drawImage(
    source,
    region.x,
    region.y,
    region.width,
    region.height,
    0,
    0,
    outputWidth,
    outputHeight,
  );

  return canvas;
};

/**
 * Prepares both versions of a picked picture.
 *
 * The avatar is the square the user framed, cut out at a fixed edge. The full
 * picture keeps its whole frame and aspect ratio, only downscaled, so it can be
 * opened and looked at properly.
 *
 * Without a crop the avatar is center-cropped to a square, which is the
 * fallback for a picture that was never framed by the user.
 */
export const prepareProfileImages = async (file: File, crop?: CropArea): Promise<PreparedImages> => {
  validateProfileImage(file);

  const decoded = await decodeImage(file);
  const sourceWidth = decoded.width;
  const sourceHeight = decoded.height;

  if (!sourceWidth || !sourceHeight) {
    throw new ImageProcessingError('That image could not be read.');
  }

  // Clamp the crop to the image, so a rounded rectangle can never ask for
  // pixels that are not there.
  const region = crop
    ? {
        x: Math.max(0, Math.min(crop.x, sourceWidth - 1)),
        y: Math.max(0, Math.min(crop.y, sourceHeight - 1)),
        width: Math.max(1, Math.min(crop.width, sourceWidth - Math.max(0, Math.min(crop.x, sourceWidth - 1)))),
        height: Math.max(1, Math.min(crop.height, sourceHeight - Math.max(0, Math.min(crop.y, sourceHeight - 1)))),
      }
    : (() => {
        const edge = Math.min(sourceWidth, sourceHeight);
        return {
          x: Math.floor((sourceWidth - edge) / 2),
          y: Math.floor((sourceHeight - edge) / 2),
          width: edge,
          height: edge,
        };
      })();

  const avatarEdge = Math.max(1, Math.min(Math.round(region.width), AVATAR_EDGE_PX));

  // The full picture is only ever scaled down, never up.
  const fullScale = Math.min(1, FULL_MAX_EDGE_PX / Math.max(sourceWidth, sourceHeight));
  const fullWidth = Math.max(1, Math.round(sourceWidth * fullScale));
  const fullHeight = Math.max(1, Math.round(sourceHeight * fullScale));

  try {
    const avatarCanvas = drawRegion(decoded.source, region, avatarEdge, avatarEdge);
    const fullCanvas = drawRegion(
      decoded.source,
      { x: 0, y: 0, width: sourceWidth, height: sourceHeight },
      fullWidth,
      fullHeight,
    );

    const [avatar, full] = await Promise.all([
      canvasToBlob(avatarCanvas),
      canvasToBlob(fullCanvas),
    ]);

    // The processed JPEGs should never exceed the rule limit, but guard anyway
    // so a surprising source image fails here rather than as a rejected upload.
    for (const blob of [avatar, full]) {
      if (blob.size > MAX_UPLOAD_BYTES) {
        throw new ImageProcessingError('That image is too detailed to upload. Try a smaller photo.');
      }
    }

    return {
      avatar,
      full,
      avatarSize: avatar.size,
      fullSize: full.size,
      fullWidth,
      fullHeight,
    };
  } finally {
    decoded.release?.();
  }
};