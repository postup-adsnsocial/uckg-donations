import type { ChurchRole } from '@uckg/authorization';
import type { Request } from 'express';

export interface AuthenticatedAdmin {
  readonly displayName: string;
  readonly email: string;
  readonly id: string;
  readonly isPlatformAdmin: boolean;
}

export interface TenantContext {
  readonly church: {
    readonly id: string;
    readonly locale: string;
    readonly name: string;
    readonly slug: string;
    readonly timezone: string;
  };
  readonly role: ChurchRole | null;
}

export interface AuthenticatedRequest extends Request {
  authUser?: AuthenticatedAdmin;
  tenant?: TenantContext;
}
