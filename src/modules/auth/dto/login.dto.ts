import { sharedDtoSchema as _ } from '@/common/dto/sharedDtoSchema';
import { PushProvider } from '@prisma/client';
import { createZodDto } from 'nestjs-zod';
import z from 'zod';

export const LoginSchema = z.object({
  email: _.email({
    trustCheck: true,
  }),
  password: _.password({ level: 'medium' }),

  // for push notification
  pushToken: z.string().trim().max(512, 'Push token is too long').optional(),
  pushProvider: z.enum(PushProvider).optional(),
});

export class LoginDto extends createZodDto(LoginSchema) {}

export const ForgotPasswordSchema = z.object({
  email: _.email({
    trustCheck: true,
  }),
});

export class ForgotPasswordDto extends createZodDto(ForgotPasswordSchema) {}

export const ResetPasswordSchema = z.object({
  email: _.email({
    trustCheck: true,
  }),
  otp: _.otp(6),
  newPassword: _.password({ level: 'medium' }).optional(), // optional for check otp valid or not
});

export class ResetPasswordDto extends createZodDto(ResetPasswordSchema) {}

export const RefreshTokenSchema = z.object({
  refreshToken: z.string().trim().min(1, 'Refresh token is required'),
});

export class RefreshTokenDto extends createZodDto(RefreshTokenSchema) {}
