import { describe, expect, it } from 'vitest';

import type { EnvelopeUpload } from './donations.service.js';
import { isSupportedEnvelopeImage } from './envelope-upload.js';

function upload(mimetype: string, bytes: readonly number[]): EnvelopeUpload {
  const buffer = Buffer.from(bytes);
  return {
    buffer,
    mimetype,
    originalname: 'envelope',
    size: buffer.byteLength,
  };
}

describe('isSupportedEnvelopeImage', () => {
  it('accepts JPEG and PNG signatures that match the declared MIME type', () => {
    expect(
      isSupportedEnvelopeImage(upload('image/jpeg', [0xff, 0xd8, 0xff, 0xe0])),
    ).toBe(true);
    expect(
      isSupportedEnvelopeImage(
        upload('image/png', [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      ),
    ).toBe(true);
  });

  it('rejects spoofed MIME types and unsupported content', () => {
    expect(
      isSupportedEnvelopeImage(upload('image/png', [0xff, 0xd8, 0xff, 0xe0])),
    ).toBe(false);
    expect(
      isSupportedEnvelopeImage(
        upload('image/jpeg', [...Buffer.from('<script>alert(1)</script>')]),
      ),
    ).toBe(false);
    expect(
      isSupportedEnvelopeImage(upload('image/gif', [0x47, 0x49, 0x46, 0x38])),
    ).toBe(false);
  });

  it('rejects inconsistent multipart size metadata', () => {
    const file = upload('image/jpeg', [0xff, 0xd8, 0xff, 0xe0]);
    expect(isSupportedEnvelopeImage({ ...file, size: file.size + 1 })).toBe(
      false,
    );
  });
});
