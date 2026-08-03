import type { ChurchRole } from './index.js';

export type ChurchPermission =
  | 'audit:read'
  | 'church:read'
  | 'finance:write'
  | 'membership:manage';

const rolePermissions: Record<ChurchRole, readonly ChurchPermission[]> = {
  auditor: ['audit:read', 'church:read'],
  church_admin: [
    'audit:read',
    'church:read',
    'finance:write',
    'membership:manage',
  ],
  financial_operator: ['church:read', 'finance:write'],
};

export interface TenantPolicyContext {
  isPlatformAdmin: boolean;
  role: ChurchRole | null;
}

export function hasPermission(
  context: TenantPolicyContext,
  permission: ChurchPermission,
): boolean {
  if (context.isPlatformAdmin) {
    return true;
  }

  return context.role
    ? rolePermissions[context.role].includes(permission)
    : false;
}
