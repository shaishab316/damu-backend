// import { User } from '@prisma/client';

type User = any; // Todo: fix it

export type SafeUser = Omit<User, 'passwordHash'>;
