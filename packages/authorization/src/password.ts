import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';

const algorithm = 'scrypt';
const cost = 16_384;
const blockSize = 8;
const parallelization = 1;
const keyLength = 64;
const maxMemory = 64 * 1024 * 1024;

function deriveKey(password: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(
      password,
      salt,
      keyLength,
      { N: cost, maxmem: maxMemory, p: parallelization, r: blockSize },
      (error, derivedKey) => {
        if (error) {
          reject(error);
          return;
        }

        resolve(derivedKey);
      },
    );
  });
}

export async function hashPassword(password: string): Promise<string> {
  if (password.length < 6 || password.length > 128) {
    throw new Error('Password must contain between 6 and 128 characters.');
  }

  const salt = randomBytes(16);
  const derivedKey = await deriveKey(password, salt);

  return [
    algorithm,
    cost,
    blockSize,
    parallelization,
    salt.toString('base64url'),
    derivedKey.toString('base64url'),
  ].join('$');
}

export async function verifyPassword(
  password: string,
  encodedHash: string,
): Promise<boolean> {
  const [
    storedAlgorithm,
    storedCost,
    storedBlockSize,
    storedParallelization,
    salt,
    key,
  ] = encodedHash.split('$');

  if (
    storedAlgorithm !== algorithm ||
    Number(storedCost) !== cost ||
    Number(storedBlockSize) !== blockSize ||
    Number(storedParallelization) !== parallelization ||
    !salt ||
    !key
  ) {
    return false;
  }

  const expectedKey = Buffer.from(key, 'base64url');
  const actualKey = await deriveKey(password, Buffer.from(salt, 'base64url'));

  return (
    expectedKey.length === actualKey.length &&
    timingSafeEqual(expectedKey, actualKey)
  );
}
