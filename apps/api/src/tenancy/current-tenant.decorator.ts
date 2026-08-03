import { createParamDecorator, type ExecutionContext } from '@nestjs/common';

import type {
  AuthenticatedRequest,
  TenantContext,
} from '../auth/auth.types.js';

export const CurrentTenant = createParamDecorator(
  (_data: unknown, context: ExecutionContext): TenantContext | undefined =>
    context.switchToHttp().getRequest<AuthenticatedRequest>().tenant,
);
