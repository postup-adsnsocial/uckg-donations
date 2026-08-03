import { createParamDecorator, type ExecutionContext } from '@nestjs/common';

import type { AuthenticatedAdmin, AuthenticatedRequest } from './auth.types.js';

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthenticatedAdmin | undefined =>
    context.switchToHttp().getRequest<AuthenticatedRequest>().authUser,
);
