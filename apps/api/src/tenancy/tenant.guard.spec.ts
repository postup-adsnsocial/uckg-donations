import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';

import { createExecutionContext } from '../testing/execution-context.js';
import { TenantGuard } from './tenant.guard.js';
import { TenantService } from './tenant.service.js';

const churchA = '96c95452-2e1c-43db-b1a1-a079db0a911e';
const churchB = 'dd7bd046-7c82-4b38-a2ec-5ee4496b6357';

describe('TenantGuard', () => {
  it('returns 401 when authentication has not run first', async () => {
    const service = { resolve: vi.fn() } as unknown as TenantService;
    const guard = new TenantGuard(service);

    await expect(
      guard.canActivate(
        createExecutionContext({ headers: { 'x-church-id': churchA } }),
      ),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('returns 403 when a user from church A requests church B', async () => {
    const service = {
      resolve: vi.fn().mockResolvedValue(null),
    } as unknown as TenantService;
    const guard = new TenantGuard(service);
    const user = {
      displayName: 'Church A Admin',
      email: 'admin-a@example.com',
      id: 'fb666d92-b192-443f-930a-e21e93f5a3bc',
      isPlatformAdmin: false,
    };

    await expect(
      guard.canActivate(
        createExecutionContext({
          authUser: user,
          headers: { 'x-church-id': churchB },
        }),
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(service.resolve).toHaveBeenCalledWith(user, churchB);
  });

  it('attaches an authorized tenant context to the request', async () => {
    const tenant = {
      church: {
        id: churchA,
        locale: 'pt-BR',
        name: 'Church A',
        slug: 'church-a',
        timezone: 'America/Sao_Paulo',
      },
      role: 'church_admin' as const,
    };
    const service = {
      resolve: vi.fn().mockResolvedValue(tenant),
    } as unknown as TenantService;
    const guard = new TenantGuard(service);
    const request = {
      authUser: {
        displayName: 'Church A Admin',
        email: 'admin-a@example.com',
        id: 'fb666d92-b192-443f-930a-e21e93f5a3bc',
        isPlatformAdmin: false,
      },
      headers: { 'x-church-id': churchA },
    };

    await expect(
      guard.canActivate(createExecutionContext(request)),
    ).resolves.toBe(true);
    expect(request).toHaveProperty('tenant', tenant);
  });
});
