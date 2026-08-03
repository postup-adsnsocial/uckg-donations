export type PlatformRole =
  | 'platform_admin'
  | 'church_admin'
  | 'financial_operator'
  | 'auditor';

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
