import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  ENVELOPE_IMAGE_UPLOAD_MAX_BYTES,
  prepareEnvelopeImage,
} from './prepare-envelope-image';

describe('prepareEnvelopeImage', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('keeps a supported image that is already below the safe upload size', async () => {
    const file = new File(['small-image'], 'envelope.png', {
      type: 'image/png',
    });

    await expect(prepareEnvelopeImage(file)).resolves.toBe(file);
  });

  it('converts a large image to a JPEG below the Vercel-safe size', async () => {
    const file = new File(
      [new Uint8Array(ENVELOPE_IMAGE_UPLOAD_MAX_BYTES + 1)],
      'large-envelope.png',
      { type: 'image/png' },
    );
    const drawImage = vi.fn();
    const toBlob = vi.fn((callback: BlobCallback, type?: string) =>
      callback(
        new Blob([new Uint8Array(2_000_000)], {
          type: type ?? 'image/jpeg',
        }),
      ),
    );
    const canvas = {
      getContext: vi.fn(() => ({ drawImage })),
      height: 0,
      toBlob,
      width: 0,
    } as unknown as HTMLCanvasElement;
    class LoadedImage {
      naturalHeight = 3_000;
      naturalWidth = 4_000;
      onerror: OnErrorEventHandler | null = null;
      onload: (() => void) | null = null;

      set src(_value: string) {
        queueMicrotask(() => this.onload?.());
      }
    }
    const createObjectURL = vi.fn(() => 'blob:large-envelope');
    const revokeObjectURL = vi.fn();
    vi.stubGlobal('Image', LoadedImage);
    vi.stubGlobal('document', { createElement: vi.fn(() => canvas) });
    vi.stubGlobal('URL', { createObjectURL, revokeObjectURL });

    const optimized = await prepareEnvelopeImage(file);

    expect(optimized.name).toBe('large-envelope.jpg');
    expect(optimized.type).toBe('image/jpeg');
    expect(optimized.size).toBeLessThanOrEqual(ENVELOPE_IMAGE_UPLOAD_MAX_BYTES);
    expect(canvas.width).toBe(2_000);
    expect(canvas.height).toBe(1_500);
    expect(drawImage).toHaveBeenCalledOnce();
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:large-envelope');
  });

  it('rejects files that are not JPEG or PNG images', async () => {
    const file = new File(['not-an-image'], 'envelope.pdf', {
      type: 'application/pdf',
    });

    await expect(prepareEnvelopeImage(file)).rejects.toThrow(
      'Only JPEG and PNG',
    );
  });
});
