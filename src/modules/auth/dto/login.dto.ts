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
