import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import {
  validate as configValidate,
  type Env,
} from './common/config/app.config';
import { getThrottlerConfig } from './common/config/throttler.config';
import { PrismaModule } from './infra/prisma/prisma.module';
import { UploadModule } from './infra/upload/upload.module';
import { RedisModule } from './infra/redis/redis.module';
import { BullModule } from '@nestjs/bullmq';
import { BullBoardModule } from '@bull-board/nestjs';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';
import { LoggerMiddleware } from './common/middlewares';
import { WinstonModule } from 'nest-winston';
import * as winston from 'winston';
import LokiTransport from 'winston-loki';
import { CustomThrottlerGuard } from './common/guards/throttler.guard';
import { APP_GUARD } from '@nestjs/core';
import { MailModule } from './infra/mail/mail.module';
import { MAIL_QUEUE } from './infra/mail/mail.constants';
import { SocketModule } from './infra/socket/socket.module';
import { JwtModule } from '@nestjs/jwt';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: configValidate,
    }),
    ThrottlerModule.forRoot(getThrottlerConfig()),
    WinstonModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => ({
        transports: [
          new winston.transports.Console({
            format: winston.format.combine(
              winston.format.timestamp(),
              winston.format.colorize(),
              winston.format.simple(),
            ),
          }),
          new LokiTransport({
            host: config.get('LOKI_URL', { infer: true }),
            ...(config.get('LOKI_USER', { infer: true }) && {
              basicAuth: `${config.get('LOKI_USER', { infer: true })}:${config.get('LOKI_PASSWORD', { infer: true })}`,
            }),
            labels: { job: 'nestjs', app: 'damu' },
          }),
        ],
      }),
    }),
    JwtModule.registerAsync({
      global: true,
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => ({
        secret: config.get('JWT_SECRET', { infer: true }),
        signOptions: {
          expiresIn: config.get('JWT_EXPIRES_IN', { infer: true }), // e.g '7d'
        },
      }),
    }),
    SocketModule,
    PrismaModule,
    UploadModule,
    RedisModule,
    MailModule,
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => ({
        connection: {
          url: config.get('REDIS_URL', { infer: true }),
        },
      }),
    }),
    BullBoardModule.forRoot({
      route: '/queues',
      adapter: ExpressAdapter,
    }),
    BullBoardModule.forFeature({
      name: MAIL_QUEUE,
      adapter: BullMQAdapter,
    }),
    SocketModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: CustomThrottlerGuard }],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LoggerMiddleware).forRoutes('*path');
  }
}
