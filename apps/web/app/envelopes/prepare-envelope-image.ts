export const ENVELOPE_IMAGE_UPLOAD_MAX_BYTES = 3_000_000;

const ENVELOPE_IMAGE_MAX_EDGE = 2_000;
const JPEG_QUALITY_STEPS = [0.86, 0.76, 0.66, 0.56] as const;
const supportedImageTypes = new Set(['image/jpeg', 'image/png']);

function canvasToJpeg(canvas: HTMLCanvasElement, quality: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error('The image could not be optimized.'));
      },
      'image/jpeg',
      quality,
    );
  });
}

export async function prepareEnvelopeImage(file: File): Promise<File> {
  if (!supportedImageTypes.has(file.type)) {
    throw new Error('Only JPEG and PNG envelope images are supported.');
  }

  if (file.size <= ENVELOPE_IMAGE_UPLOAD_MAX_BYTES) return file;

  const objectUrl = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const loadedImage = new Image();
      loadedImage.onload = () => resolve(loadedImage);
      loadedImage.onerror = () =>
        reject(new Error('The image could not be read.'));
      loadedImage.src = objectUrl;
    });
    const initialScale = Math.min(
      1,
      ENVELOPE_IMAGE_MAX_EDGE /
        Math.max(image.naturalWidth, image.naturalHeight),
    );
    const initialWidth = Math.max(
      1,
      Math.round(image.naturalWidth * initialScale),
    );
    const initialHeight = Math.max(
      1,
      Math.round(image.naturalHeight * initialScale),
    );

    for (const [index, quality] of JPEG_QUALITY_STEPS.entries()) {
      const dimensionScale = 0.86 ** index;
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(initialWidth * dimensionScale));
      canvas.height = Math.max(1, Math.round(initialHeight * dimensionScale));
      const context = canvas.getContext('2d');
      if (!context) throw new Error('The image could not be optimized.');
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      const blob = await canvasToJpeg(canvas, quality);

      if (blob.size <= ENVELOPE_IMAGE_UPLOAD_MAX_BYTES) {
        const baseName = file.name.replace(/\.[^.]+$/, '') || 'envelope';
        return new File([blob], `${baseName}.jpg`, {
          lastModified: file.lastModified,
          type: 'image/jpeg',
        });
      }
    }

    throw new Error('The optimized image is still too large.');
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}
