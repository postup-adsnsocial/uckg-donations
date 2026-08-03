export * from './password.js';
export * from './policy.js';
export * from './session-token.js';

export type ChurchRole = 'church_admin' | 'financial_operator' | 'auditor';
export type PlatformRole = 'platform_admin' | ChurchRole;

export interface AuthorizationContext {
  churchId: string;
  roles: readonly PlatformRole[];
  userId: string;
}

export function belongsToChurch(
  context: AuthorizationContext,
  churchId: string,
): boolean {
  return context.churchId === churchId;
}
