import { Body, Controller, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { ApiResponse } from '@/common/types/api-response';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('/login')
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
      message: 'Login successful',
      data: result,
    };
  }
}
