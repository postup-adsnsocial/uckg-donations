import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { churchIdSchema } from '@uckg/contracts';

import type { AuthenticatedRequest } from '../auth/auth.types.js';
import { TenantService } from './tenant.service.js';

@Injectable()
export class TenantGuard implements CanActivate {
  constructor(
    @Inject(TenantService) private readonly tenantService: TenantService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

    if (!request.authUser) {
      throw new UnauthorizedException(
        'Authentication is required before resolving a tenant.',
      );
    }

    const header = request.headers['x-church-id'];
    const parsedChurchId = churchIdSchema.safeParse(
      Array.isArray(header) ? header[0] : header,
    );

    if (!parsedChurchId.success) {
      throw new ForbiddenException(
        'A valid x-church-id tenant header is required.',
      );
    }

    const tenant = await this.tenantService.resolve(
      request.authUser,
      parsedChurchId.data,
    );

    if (!tenant) {
      throw new ForbiddenException(
        'The authenticated user cannot access this church.',
      );
    }

    request.tenant = tenant;
    return true;
  }
}
