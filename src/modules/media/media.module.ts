import { Module } from '@nestjs/common';
import { MediaController } from './media.controller';
import { MediaService } from './media.service';
import { UploadModule } from '@/infra/upload/upload.module';
import { PrismaModule } from '@/infra/prisma/prisma.module';

@Module({
  imports: [UploadModule, PrismaModule],
  controllers: [MediaController],
  providers: [MediaService],
  exports: [MediaService],
})
export class MediaModule {}
