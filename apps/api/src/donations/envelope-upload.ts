import type { EnvelopeUpload } from './donations.service.js';

const jpegSignature = Buffer.from([0xff, 0xd8, 0xff]);
const pngSignature = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
]);

export function isSupportedEnvelopeImage(file: EnvelopeUpload): boolean {
  if (file.size !== file.buffer.byteLength || file.size <= 0) return false;

  if (file.mimetype === 'image/jpeg') {
    return file.buffer.subarray(0, jpegSignature.length).equals(jpegSignature);
  }

  if (file.mimetype === 'image/png') {
    return file.buffer.subarray(0, pngSignature.length).equals(pngSignature);
  }

  return false;
}
