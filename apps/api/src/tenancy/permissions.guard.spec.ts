import { ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { describe, expect, it, vi } from 'vitest';

import { createExecutionContext } from '../testing/execution-context.js';
import { PermissionsGuard } from './permissions.guard.js';

describe('PermissionsGuard', () => {
  it('returns 403 when the tenant role lacks a required permission', () => {
    const reflector = {
      getAllAndOverride: vi.fn().mockReturnValue(['membership:manage']),
    } as unknown as Reflector;
    const guard = new PermissionsGuard(reflector);
    const context = createExecutionContext({
      authUser: { isPlatformAdmin: false },
      tenant: { role: 'auditor' },
    });

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('allows a church administrator with the required permission', () => {
    const reflector = {
      getAllAndOverride: vi.fn().mockReturnValue(['membership:manage']),
    } as unknown as Reflector;
    const guard = new PermissionsGuard(reflector);
    const context = createExecutionContext({
      authUser: { isPlatformAdmin: false },
      tenant: { role: 'church_admin' },
    });

    expect(guard.canActivate(context)).toBe(true);
  });
});
