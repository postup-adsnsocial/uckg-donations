import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Inject,
  Patch,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import {
  changePasswordRequestSchema,
  loginRequestSchema,
  updateProfileRequestSchema,
} from '@uckg/contracts';
import type { Request, Response } from 'express';

import { AuthService } from './auth.service.js';
import type { AuthenticatedAdmin } from './auth.types.js';
import { readCookie, sessionCookieName } from './cookies.js';
import { CurrentUser } from './current-user.decorator.js';
import { LoginAttemptLimiter } from './login-attempt-limiter.js';
import { SessionAuthGuard } from './session-auth.guard.js';
import {
  IdentityRoute,
  PublicRoute,
} from '../tenancy/route-policy.decorator.js';

@Controller('auth')
export class AuthController {
  constructor(
    @Inject(AuthService) private readonly authService: AuthService,
    @Inject(LoginAttemptLimiter)
    private readonly loginAttemptLimiter: LoginAttemptLimiter,
  ) {}

  @Post('login')
  @PublicRoute()
  async login(
    @Body() body: unknown,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const parsed = loginRequestSchema.safeParse(body);

    if (!parsed.success) {
      throw new BadRequestException('A valid email and password are required.');
    }

    const source = request.ip || request.socket.remoteAddress || 'unknown';
    this.loginAttemptLimiter.assertAllowed(source, parsed.data.email);

    let result: Awaited<ReturnType<AuthService['login']>>;
    try {
      result = await this.authService.login(
        parsed.data.email,
        parsed.data.password,
      );
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        this.loginAttemptLimiter.recordFailure(source, parsed.data.email);
      }
      throw error;
    }
    this.loginAttemptLimiter.recordSuccess(parsed.data.email);

    response.cookie(sessionCookieName, result.token, {
      expires: result.expiresAt,
      httpOnly: true,
      path: '/',
      sameSite: 'strict',
      secure: process.env.NODE_ENV === 'production',
    });

    return { user: result.user };
  }

  @Post('logout')
  @IdentityRoute()
  @UseGuards(SessionAuthGuard)
  async logout(
    @CurrentUser() _user: AuthenticatedAdmin,
    @Res({ passthrough: true }) response: Response,
  ) {
    const token = readCookie(response.req, sessionCookieName);

    if (token) {
      await this.authService.logout(token);
    }

    response.clearCookie(sessionCookieName, {
      httpOnly: true,
      path: '/',
      sameSite: 'strict',
      secure: process.env.NODE_ENV === 'production',
    });

    return { success: true };
  }

  @Get('me')
  @IdentityRoute()
  @UseGuards(SessionAuthGuard)
  async me(@CurrentUser() user: AuthenticatedAdmin) {
    return {
      memberships: await this.authService.listMemberships(user.id),
      user,
    };
  }

  @Patch('me')
  @IdentityRoute()
  @UseGuards(SessionAuthGuard)
  updateProfile(
    @CurrentUser() user: AuthenticatedAdmin,
    @Body() body: unknown,
  ) {
    const parsed = updateProfileRequestSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException('Valid profile data is required.');
    }
    return this.authService.updateProfile(user.id, parsed.data);
  }

  @Patch('me/password')
  @IdentityRoute()
  @UseGuards(SessionAuthGuard)
  async changePassword(
    @CurrentUser() user: AuthenticatedAdmin,
    @Body() body: unknown,
    @Res({ passthrough: true }) response: Response,
  ) {
    const parsed = changePasswordRequestSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException('Valid password data is required.');
    }

    await this.authService.changePassword(user.id, parsed.data);
    response.clearCookie(sessionCookieName, {
      httpOnly: true,
      path: '/',
      sameSite: 'strict',
      secure: process.env.NODE_ENV === 'production',
    });
    return { loginRequired: true };
  }
}
