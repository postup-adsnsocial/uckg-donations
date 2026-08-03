import {
  type CanActivate,
  type ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

import type { AuthenticatedRequest } from './auth.types.js';
import { AuthService } from './auth.service.js';
import { readCookie, sessionCookieName } from './cookies.js';

@Injectable()
export class SessionAuthGuard implements CanActivate {
  constructor(@Inject(AuthService) private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = readCookie(request, sessionCookieName);

    if (!token) {
      throw new UnauthorizedException('Authentication is required.');
    }

    const user = await this.authService.authenticate(token);

    if (!user) {
      throw new UnauthorizedException('The session is invalid or expired.');
    }

    request.authUser = user;
    return true;
  }
}
