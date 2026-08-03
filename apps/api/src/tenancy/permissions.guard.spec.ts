import { ForbiddenException } from '@nestjs/common';
import { GUARDS_METADATA } from '@nestjs/common/constants.js';
import { Reflector } from '@nestjs/core';
import { describe, expect, it, vi } from 'vitest';

import { createExecutionContext } from '../testing/execution-context.js';
import { SessionAuthGuard } from '../auth/session-auth.guard.js';
import { DomainRoute } from './domain-route.decorator.js';
import { PermissionsGuard } from './permissions.guard.js';
import { requiredPermissionsKey } from './permissions.decorator.js';
import {
  routePolicyMetadataKeys,
  RoutePolicyGuard,
} from './route-policy.guard.js';
import { TenantGuard } from './tenant.guard.js';

describe('PermissionsGuard', () => {
  it.each([undefined, []])(
    'returns 403 when required permission metadata is %s',
    (permissions) => {
      const reflector = {
        getAllAndOverride: vi.fn().mockReturnValue(permissions),
      } as unknown as Reflector;
      const guard = new PermissionsGuard(reflector);
      const context = createExecutionContext({
        authUser: { isPlatformAdmin: true },
        tenant: { role: 'church_admin' },
      });

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    },
  );

  it('returns 403 for permission metadata outside the known permission set', () => {
    const reflector = {
      getAllAndOverride: vi.fn().mockReturnValue(['unknown:permission']),
    } as unknown as Reflector;
    const guard = new PermissionsGuard(reflector);
    const context = createExecutionContext({
      authUser: { isPlatformAdmin: true },
      tenant: { role: 'church_admin' },
    });

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

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

describe('RoutePolicyGuard', () => {
  it('returns 403 for an unclassified handler', () => {
    const reflector = {
      getAllAndOverride: vi.fn().mockReturnValue(undefined),
    } as unknown as Reflector;

    expect(() =>
      new RoutePolicyGuard(reflector).canActivate(createExecutionContext({})),
    ).toThrow(ForbiddenException);
  });

  it('returns 403 for a multiply classified handler', () => {
    const reflector = {
      getAllAndOverride: vi.fn((key: unknown) =>
        key === routePolicyMetadataKeys.public ||
        key === routePolicyMetadataKeys.domain
          ? true
          : undefined,
      ),
    } as unknown as Reflector;

    expect(() =>
      new RoutePolicyGuard(reflector).canActivate(createExecutionContext({})),
    ).toThrow(ForbiddenException);
  });
});

describe('DomainRoute', () => {
  it('sets a domain classification, permissions, and the locked guard order', () => {
    class TestController {
      handler() {}
    }
    const descriptor = Object.getOwnPropertyDescriptor(
      TestController.prototype,
      'handler',
    );

    DomainRoute('church:read', 'membership:manage')(
      TestController.prototype,
      'handler',
      descriptor!,
    );

    expect(
      Reflect.getMetadata(
        routePolicyMetadataKeys.domain,
        TestController.prototype.handler,
      ),
    ).toBe(true);
    expect(
      Reflect.getMetadata(
        requiredPermissionsKey,
        TestController.prototype.handler,
      ),
    ).toEqual(['church:read', 'membership:manage']);
    expect(
      Reflect.getMetadata(GUARDS_METADATA, TestController.prototype.handler),
    ).toEqual([SessionAuthGuard, TenantGuard, PermissionsGuard]);
  });

  it('requires a first permission at compile time', () => {
    const compileOnly = process.env.NODE_ENV === 'compile-only';
    if (compileOnly) {
      // @ts-expect-error Domain routes must always declare a permission.
      DomainRoute();
    }

    expect(true).toBe(true);
  });
});
