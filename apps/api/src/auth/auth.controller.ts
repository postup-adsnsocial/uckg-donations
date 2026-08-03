import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Inject,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import { loginRequestSchema } from '@uckg/contracts';
import type { Response } from 'express';

import { AuthService } from './auth.service.js';
import type { AuthenticatedAdmin } from './auth.types.js';
import { readCookie, sessionCookieName } from './cookies.js';
import { CurrentUser } from './current-user.decorator.js';
import { SessionAuthGuard } from './session-auth.guard.js';

@Controller('auth')
export class AuthController {
  constructor(@Inject(AuthService) private readonly authService: AuthService) {}

  @Post('login')
  async login(
    @Body() body: unknown,
    @Res({ passthrough: true }) response: Response,
  ) {
    const parsed = loginRequestSchema.safeParse(body);

    if (!parsed.success) {
      throw new BadRequestException('A valid email and password are required.');
    }

    const result = await this.authService.login(
      parsed.data.email,
      parsed.data.password,
    );

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
  @UseGuards(SessionAuthGuard)
  async me(@CurrentUser() user: AuthenticatedAdmin) {
    return {
      memberships: await this.authService.listMemberships(user.id),
      user,
    };
  }
}
