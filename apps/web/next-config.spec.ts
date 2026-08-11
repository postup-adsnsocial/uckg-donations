import { describe, expect, it } from 'vitest';

import nextConfig from './next.config';

describe('web security headers', () => {
  it('protects every response and hides the framework header', async () => {
    expect(nextConfig.poweredByHeader).toBe(false);
    expect(nextConfig.headers).toBeTypeOf('function');

    const routes = await nextConfig.headers!();
    const headers = Object.fromEntries(
      routes[0]?.headers.map(({ key, value }) => [key, value]) ?? [],
    );

    expect(routes[0]?.source).toBe('/(.*)');
    expect(headers['Content-Security-Policy']).toContain(
      "frame-ancestors 'none'",
    );
    expect(headers['Content-Security-Policy']).toContain("object-src 'none'");
    expect(headers['X-Frame-Options']).toBe('DENY');
    expect(headers['X-Content-Type-Options']).toBe('nosniff');
    expect(headers['Referrer-Policy']).toBe('strict-origin-when-cross-origin');
    expect(headers['Permissions-Policy']).toContain('camera=()');
  });

  it('does not relax browser protections on any route', async () => {
    const routes = await nextConfig.headers!();

    expect(routes).toHaveLength(1);
    expect(routes[0]?.source).toBe('/(.*)');
    expect(
      routes[0]?.headers.some(
        ({ key, value }) =>
          key === 'Access-Control-Allow-Origin' && value === '*',
      ),
    ).toBe(false);
  });
});
