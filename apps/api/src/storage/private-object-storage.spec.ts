import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { PrivateObjectStorage } from './private-object-storage.js';

describe('PrivateObjectStorage signed downloads', () => {
  const previousUrl = process.env.SUPABASE_URL;
  const previousKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  beforeEach(() => {
    process.env.SUPABASE_URL = 'https://storage.example.com';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key';
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    if (previousUrl === undefined) delete process.env.SUPABASE_URL;
    else process.env.SUPABASE_URL = previousUrl;
    if (previousKey === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    else process.env.SUPABASE_SERVICE_ROLE_KEY = previousKey;
  });

  it('creates a short-lived URL so large private files bypass the Function body', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          signedURL: '/object/sign/envelopes/file.jpg?token=secret',
        }),
        { headers: { 'Content-Type': 'application/json' }, status: 200 },
      ),
    );
    vi.stubGlobal('fetch', fetchMock);
    const storage = new PrivateObjectStorage();

    await expect(
      storage.createSignedDownloadUrl(
        'envelopes',
        'church one/file #1.jpg',
        120,
      ),
    ).resolves.toBe(
      'https://storage.example.com/storage/v1/object/sign/envelopes/file.jpg?token=secret',
    );
    expect(fetchMock).toHaveBeenCalledWith(
      'https://storage.example.com/storage/v1/object/sign/envelopes/church%20one/file%20%231.jpg',
      expect.objectContaining({
        body: JSON.stringify({ expiresIn: 120 }),
        method: 'POST',
      }),
    );
  });

  it('keeps a signed path that already includes the Storage API prefix', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            signedURL:
              '/storage/v1/object/sign/envelopes/file.jpg?token=secret',
          }),
          { headers: { 'Content-Type': 'application/json' }, status: 200 },
        ),
      ),
    );

    await expect(
      new PrivateObjectStorage().createSignedDownloadUrl(
        'envelopes',
        'church/file.jpg',
      ),
    ).resolves.toBe(
      'https://storage.example.com/storage/v1/object/sign/envelopes/file.jpg?token=secret',
    );
  });

  it('keeps the local filesystem fallback when Supabase is not configured', async () => {
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;

    await expect(
      new PrivateObjectStorage().createSignedDownloadUrl(
        'envelopes',
        'church/file.jpg',
      ),
    ).resolves.toBeNull();
  });
});
