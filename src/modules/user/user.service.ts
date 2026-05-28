import { Injectable } from '@nestjs/common';
import { CreateUserDto } from './dto/createUser.dto';
import { PrismaService } from '@/infra/prisma/prisma.service';
import { VaultService } from '../vault/vault.service';
import { generateOTP } from '@/common/helpers/otp.helper';
import { MailService } from '@/infra/mail/mail.service';

@Injectable()
export class UserService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly vault: VaultService,
    private readonly mail: MailService,
  ) {}

  async createUser(dto: CreateUserDto) {
    const { email, password, dob, gender, name, phone } = dto;

    const otp = generateOTP(6);

    const user = await this.prisma.user.create({
      data: {
        auth: {
          create: {
            ...(await this.vault.hashPassword(password)),
            otpHash: this.vault.hashPlain(otp),
            otpExp: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes from now
          },
        },
        ...(name && {
          name: {
            create: this.vault.createVault(name, 'user.name'),
          },
        }),
        ...(email && {
          email: {
            create: this.vault.createVault(email, 'user.email'),
          },
        }),
        ...(phone && {
          phone: {
            create: this.vault.createVault(phone, 'user.phone'),
          },
        }),
        ...(dob && {
          dob: {
            create: this.vault.createVault(dob.toISOString(), 'user.dob'),
          },
        }),
        ...(gender && {
          gender: {
            connectOrCreate: {
              where: {
                hash: this.vault.hashPlain(gender),
              },
              create: this.vault.createVault(gender, 'user.gender'),
            },
          },
        }),
      },
    });

    await this.mail.sendMail(
      {
        email,
        subject: 'Verify your email',
        body: `Your OTP is ${otp}`,
      },
      {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: { count: 100 },
        removeOnFail: { count: 50, age: 24 * 60 * 60 },
      },
    );

    return user;
  }
}
