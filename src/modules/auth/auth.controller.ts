import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { AuthService } from './auth.service';
import {
  ForgotPasswordDto,
  LoginDto,
  ResetPasswordDto,
  RefreshTokenDto,
} from './dto/login.dto';
import { ApiResponse } from '@/common/types/api-response';
import { AuthThrottle } from '@/common/decorators';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @AuthThrottle()
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
  ): Promise<ApiResponse> {
    const userAgent = req.get('user-agent');
    const ipAddress =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0] ||
      req.socket.remoteAddress;

    const result = await this.authService.login(dto, userAgent, ipAddress);

    return {
      message: `Welcome  back ${result.user.name || 'user'}!`,
      data: result,
    };
  }

  @Post('forgot-password')
  @AuthThrottle()
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    await this.authService.forgotPassword(dto);

    return {
      message:
        'If an account with that email exists, a password reset OTP has been sent.',
    };
  }

  @Post('reset-password')
  @AuthThrottle()
  async resetPassword(@Body() dto: ResetPasswordDto) {
    await this.authService.resetPassword(dto);

    return {
      message: dto.newPassword ? 'Password reset successfully' : 'OTP is valid',
    };
  }

  @Post('refresh')
  @AuthThrottle()
  async refresh(
    @Body() dto: RefreshTokenDto,
    @Req() req: Request,
  ): Promise<ApiResponse> {
    const userAgent = req.get('user-agent');
    const ipAddress =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0] ||
      req.socket.remoteAddress;

    const result = await this.authService.refreshToken(
      dto.refreshToken,
      userAgent,
      ipAddress,
    );

    return {
      message: 'Token refreshed successfully',
      data: result,
    };
  }
}
