import type { ChurchRole } from '@uckg/authorization';
import type { Request } from 'express';

export interface AuthenticatedAdmin {
  displayName: string;
  email: string;
  id: string;
  isPlatformAdmin: boolean;
}

export interface TenantContext {
  church: {
    id: string;
    locale: string;
    name: string;
    slug: string;
    timezone: string;
  };
  role: ChurchRole | null;
}

export interface AuthenticatedRequest extends Request {
  authUser?: AuthenticatedAdmin;
  tenant?: TenantContext;
}
