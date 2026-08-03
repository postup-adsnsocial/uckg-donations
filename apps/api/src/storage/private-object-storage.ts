import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import { Injectable } from '@nestjs/common';

@Injectable()
export class PrivateObjectStorage {
  private readonly supabaseUrl = process.env.SUPABASE_URL?.replace(/\/$/, '');
  private readonly serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  async upload(
    bucket: string,
    key: string,
    buffer: Buffer,
    contentType: string,
  ) {
    if (this.supabaseUrl && this.serviceKey) {
      const response = await fetch(
        `${this.supabaseUrl}/storage/v1/object/${bucket}/${this.path(key)}`,
        {
          body: new Uint8Array(buffer),
          headers: {
            apikey: this.serviceKey,
            Authorization: `Bearer ${this.serviceKey}`,
            'Content-Type': contentType,
            'x-upsert': 'true',
          },
          method: 'POST',
        },
      );
      if (!response.ok)
        throw new Error(`Private storage upload failed (${response.status}).`);
      return;
    }

    const target = resolve('.data', bucket, key);
    await mkdir(resolve(target, '..'), { recursive: true });
    await writeFile(target, buffer, { flag: 'wx' });
  }

  async download(bucket: string, key: string) {
    if (this.supabaseUrl && this.serviceKey) {
      const response = await fetch(
        `${this.supabaseUrl}/storage/v1/object/${bucket}/${this.path(key)}`,
        {
          headers: {
            apikey: this.serviceKey,
            Authorization: `Bearer ${this.serviceKey}`,
          },
        },
      );
      if (!response.ok)
        throw new Error(
          `Private storage download failed (${response.status}).`,
        );
      return Buffer.from(await response.arrayBuffer());
    }
    return readFile(resolve('.data', bucket, key));
  }

  async remove(bucket: string, key: string) {
    if (this.supabaseUrl && this.serviceKey) {
      await fetch(
        `${this.supabaseUrl}/storage/v1/object/${bucket}/${this.path(key)}`,
        {
          headers: {
            apikey: this.serviceKey,
            Authorization: `Bearer ${this.serviceKey}`,
          },
          method: 'DELETE',
        },
      );
      return;
    }
    await unlink(resolve('.data', bucket, key)).catch(() => undefined);
  }

  private path(key: string) {
    return key.split('/').map(encodeURIComponent).join('/');
  }
}
