import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '@/infra/prisma/prisma.service';
import { VaultService } from '../vault/vault.service';
import { LoginDto } from './dto/login.dto';
import { JwtService } from '@nestjs/jwt';
import { detectDeviceType } from './helpers/device-detector';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly vault: VaultService,
    private readonly jwt: JwtService,
  ) {}

  async login(dto: LoginDto, userAgent?: string, ipAddress?: string) {
    const { email, password, pushToken, pushProvider } = dto;

    // Find user by email
    const user = await this.prisma.user.findFirst({
      where: {
        email: {
          is: {
            hash: this.vault.hashPlain(email),
          },
        },
      },
      include: {
        auth: true,
        email: true,
        gender: true,
        name: true,
        phone: true,
        dob: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.auth) {
      throw new BadRequestException('User auth not found');
    }

    if (!user.auth.passwordHash) {
      throw new BadRequestException('User password not set');
    }

    // Verify password
    const isPasswordValid = await this.vault.comparePassword(
      password,
      user.auth.passwordHash,
      user.auth.passwordHashMethod!,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Generate access token
    const accessToken = this.jwt.sign(
      {},
      {
        subject: user.id + '',
      },
    );

    // Generate refresh token
    const refreshToken = this.vault.randomToken(32);
    const refreshTokenHash = this.vault.hashPlain(refreshToken);

    // Detect device type (use provided or auto-detect from userAgent)
    const detectedDeviceType = detectDeviceType(userAgent);

    // Calculate refresh token expiration (700 days) // Todo: remove 700 days
    const expiresAt = new Date(Date.now() + 700 * 24 * 60 * 60 * 1000);

    // Create device session
    const deviceSession = await this.prisma.deviceSession.create({
      data: {
        userId: user.id,
        refreshTokenHash,
        deviceType: detectedDeviceType,
        userAgent,
        ipAddress,
        pushToken,
        pushProvider: pushProvider,
        expiresAt,
      },
    });

    return {
      user: {
        id: user.id,
        isActive: user.isActive,
        isBanned: user.isBanned,
        name: user.name?.encrypted
          ? this.vault.decrypt(user.name.encrypted)
          : null,
        email: user.email?.encrypted
          ? this.vault.decrypt(user.email.encrypted)
          : null,
        phone: user.phone?.encrypted
          ? this.vault.decrypt(user.phone.encrypted)
          : null,
        dob: user.dob?.encrypted
          ? this.vault.decrypt(user.dob.encrypted)
          : null,
        gender: user.gender?.encrypted
          ? this.vault.decrypt(user.gender.encrypted)
          : null,
      },
      tokens: {
        accessToken,
        refreshToken,
      },
      device: {
        id: deviceSession.id,
        type: deviceSession.deviceType,
      },
    };
  }
}
