import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '@/infra/prisma/prisma.service';
import { VaultService } from '../vault/vault.service';
import { ForgotPasswordDto, LoginDto, ResetPasswordDto } from './dto/login.dto';
import { JwtService } from '@nestjs/jwt';
import { detectDeviceType } from './helpers/device-detector';
import { generateOTP } from '@/common/helpers/otp.helper';
import { MailService } from '@/infra/mail/mail.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly vault: VaultService,
    private readonly jwt: JwtService,
    private readonly mail: MailService,
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

    if (!user.auth.isActive || !user.isActive || user.isBanned) {
      throw new UnauthorizedException(
        'Login not allowed. Please contact support.',
      );
    }

    await this.prisma.auth.update({
      where: {
        id: user.auth.id,
      },
      data: {
        loginAttempts: 0,
      },
    });

    // Verify password
    const isPasswordValid = await this.vault.comparePassword(
      password,
      user.auth.passwordHash,
      user.auth.passwordHashMethod!,
    );

    if (!isPasswordValid) {
      const auth = await this.prisma.auth.update({
        where: {
          id: user.auth.id,
        },
        data: {
          loginAttempts: {
            increment: 1,
          },
        },
      });

      if (auth.loginAttempts >= 5) {
        await this.prisma.auth.update({
          where: {
            id: user.auth.id,
          },
          data: {
            isActive: false,

            // 1 day letter
            unlockAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
          },
        });
      }

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
        name: this.vault.decrypt(user.name?.encrypted),
        email: this.vault.decrypt(user.email?.encrypted),
        phone: this.vault.decrypt(user.phone?.encrypted),
        dob: this.vault.decrypt(user.dob?.encrypted),
        gender: this.vault.decrypt(user.gender?.encrypted),
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

  async forgotPassword(dto: ForgotPasswordDto) {
    const { email } = dto;

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
      },
    });

    if (!user?.auth) {
      return; // skip
    }

    const otp = generateOTP(6);

    await this.prisma.auth.update({
      where: {
        id: user.auth.id,
      },
      data: {
        otpHash: this.vault.hashPlain(otp),
        // OTP expires in 15 minutes
        otpExp: new Date(Date.now() + 15 * 60 * 1000),
      },
    });

    await this.mail.sendMail({
      email,
      subject: 'Password Reset OTP',
      body: `Your OTP for password reset is: ${otp}. It will expire in 15 minutes.`,
    });
  }

  async resetPassword(dto: ResetPasswordDto) {
    const { email, otp, newPassword } = dto;

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
      },
    });

    if (
      !user?.auth?.otpHash ||
      !user.auth.otpExp ||
      user.auth.otpExp < new Date()
    ) {
      throw new BadRequestException('Invalid email or OTP');
    }

    const isValidOtp = this.vault.comparePlain(otp, user.auth.otpHash);

    if (!isValidOtp) {
      throw new BadRequestException('Invalid email or OTP');
    }

    if (!newPassword) {
      return; // skip - just validate OTP
    }

    const newPasswordHash = await this.vault.hashPassword(newPassword);

    await this.prisma.auth.update({
      where: {
        id: user.auth.id,
      },
      data: {
        ...newPasswordHash,
        otpHash: null,
        otpExp: null,
      },
    });
  }

  async refreshToken(
    refreshToken: string,
    userAgent?: string,
    ipAddress?: string,
  ) {
    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token is required');
    }

    // Hash the provided refresh token to look it up
    const refreshTokenHash = this.vault.hashPlain(refreshToken);

    // Find the device session with this refresh token
    const deviceSession = await this.prisma.deviceSession.findFirst({
      where: {
        refreshTokenHash,
      },
      include: {
        user: {
          include: {
            name: true,
            email: true,
            phone: true,
            gender: true,
            dob: true,

            auth: true,
          },
        },
      },
    });

    if (!deviceSession) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Check if token is expired
    if (deviceSession.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token expired');
    }

    const user = deviceSession.user;

    // Verify user is active
    if (!user.auth?.isActive || !user.isActive || user.isBanned) {
      throw new UnauthorizedException(
        'Login not allowed. Please contact support.',
      );
    }

    // Generate new access token
    const accessToken = this.jwt.sign(
      {},
      {
        subject: user.id + '',
      },
    );

    // Generate new refresh token (rotate)
    const newRefreshToken = this.vault.randomToken(32);
    const newRefreshTokenHash = this.vault.hashPlain(newRefreshToken);

    // Update the device session with new refresh token
    const updatedSession = await this.prisma.deviceSession.update({
      where: {
        id: deviceSession.id,
      },
      data: {
        refreshTokenHash: newRefreshTokenHash,
        lastActiveAt: new Date(),
        userAgent: userAgent || deviceSession.userAgent,
        ipAddress: ipAddress || deviceSession.ipAddress,
      },
    });

    return {
      user: {
        id: user.id,
        isActive: user.isActive,
        isBanned: user.isBanned,
        name: this.vault.decrypt(user.name?.encrypted),
        email: this.vault.decrypt(user.email?.encrypted),
        phone: this.vault.decrypt(user.phone?.encrypted),
        dob: this.vault.decrypt(user.dob?.encrypted),
        gender: this.vault.decrypt(user.gender?.encrypted),
      },
      tokens: {
        accessToken,
        refreshToken: newRefreshToken,
      },
      device: {
        id: updatedSession.id,
        type: updatedSession.deviceType,
      },
    };
  }
}
