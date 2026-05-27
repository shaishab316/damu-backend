import { SetMetadata } from '@nestjs/common';
// import { UserRole } from '@prisma/client';

type UserRole = any; // Todo: fix it

export const ROLES_KEY = 'roles';
export const Roles = (...roles: UserRole[]) =>
  SetMetadata<typeof ROLES_KEY, UserRole[]>(ROLES_KEY, roles);
