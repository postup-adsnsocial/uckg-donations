import type { Request } from 'express';

export const sessionCookieName = 'uckg_session';

export function readCookie(request: Request, name: string): string | undefined {
  const cookieHeader = request.headers.cookie;

  if (!cookieHeader) {
    return undefined;
  }

  for (const cookie of cookieHeader.split(';')) {
    const separator = cookie.indexOf('=');

    if (separator === -1) {
      continue;
    }

    const cookieName = cookie.slice(0, separator).trim();

    if (cookieName === name) {
      return decodeURIComponent(cookie.slice(separator + 1).trim());
    }
  }

  return undefined;
}
