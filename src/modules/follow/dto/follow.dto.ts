import { createZodDto } from 'nestjs-zod';
import z from 'zod';

export const CreateFollowSchema = z.object({
  followingId: z
    .number('Following ID must be a number')
    .int('Following ID must be an integer')
    .positive('Following ID must be positive'),
});

export class CreateFollowDto extends createZodDto(CreateFollowSchema) {}

export const UnfollowSchema = z.object({
  followingId: z
    .number('Following ID must be a number')
    .int('Following ID must be an integer')
    .positive('Following ID must be positive'),
});

export class UnfollowDto extends createZodDto(UnfollowSchema) {}

export const BlockUserSchema = z.object({
  followingId: z
    .number('User ID must be a number')
    .int('User ID must be an integer')
    .positive('User ID must be positive'),
});

export class BlockUserDto extends createZodDto(BlockUserSchema) {}

export const QueryGetFollowersSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export class QueryGetFollowersDto extends createZodDto(
  QueryGetFollowersSchema,
) {}
