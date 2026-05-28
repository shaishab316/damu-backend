import { sharedDtoSchema as _ } from '@/common/dto/sharedDtoSchema';
import z from 'zod';

export const CreateUserSchema = z.object({
  name: _.name({ field: 'Name' }).optional(),
  email: _.email({
    trustCheck: true,
  }),
  password: _.password({ level: 'medium' }),
  phone: _.phoneNumber().optional(),
  dob: _.date({
    path: 'dob',
    age: {
      min: 16,
    },
    removeTime: true,
  }).optional(),
});
