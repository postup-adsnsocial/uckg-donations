import { UnauthorizedException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';

import { createExecutionContext } from '../testing/execution-context.js';
import { AuthService } from './auth.service.js';
import { SessionAuthGuard } from './session-auth.guard.js';

describe('SessionAuthGuard', () => {
  it('returns 401 when no session cookie is present', async () => {
    const authService = {
      authenticate: vi.fn(),
    } as unknown as AuthService;
    const guard = new SessionAuthGuard(authService);
    const context = createExecutionContext({ headers: {} });

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(authService.authenticate).not.toHaveBeenCalled();
  });

  it('attaches the authenticated administrator to the request', async () => {
    const user = {
      displayName: 'Admin',
      email: 'admin@example.com',
      id: '95ec51b6-c583-4667-bfb3-2a609f56b61d',
      isPlatformAdmin: false,
    };
    const authService = {
      authenticate: vi.fn().mockResolvedValue(user),
    } as unknown as AuthService;
    const guard = new SessionAuthGuard(authService);
    const request = { headers: { cookie: 'uckg_session=opaque-token' } };

    await expect(
      guard.canActivate(createExecutionContext(request)),
    ).resolves.toBe(true);
    expect(request).toHaveProperty('authUser', user);
  });
});
