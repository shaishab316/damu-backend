import { sharedDtoSchema as _ } from '@/common/dto/sharedDtoSchema';
import { createZodDto } from 'nestjs-zod';
import z from 'zod';

export const LoginSchema = z.object({
  email: _.email({
    trustCheck: true,
  }),
  password: _.password({ level: 'medium' }),
});

export class LoginDto extends createZodDto(LoginSchema) {}
