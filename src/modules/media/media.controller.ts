import {
  Controller,
  Post,
  UseInterceptors,
  HttpCode,
  HttpStatus,
  Logger,
  BadRequestException,
  UploadedFiles,
} from '@nestjs/common';
import { MediaService } from './media.service';
import { createFileUploadInterceptor } from '@/infra/upload/interceptors/file-upload.interceptor';

// ─── Upload Interceptors ──────────────────────────────────────────────────────

const ImageUploadInterceptor = createFileUploadInterceptor({
  fields: [
    {
      name: 'images',
      maxCount: 10,
      maxFileSize: 10 * 1024 * 1024, // 10 MB
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
    },
  ],
});

const VideoUploadInterceptor = createFileUploadInterceptor({
  fields: [
    {
      name: 'video',
      maxCount: 1,
      maxFileSize: 100 * 1024 * 1024, // 100 MB
      allowedMimeTypes: ['video/mp4', 'video/webm', 'video/quicktime'],
    },
  ],
});

@Controller('media')
export class MediaController {
  private readonly logger = new Logger(MediaController.name);

  constructor(private readonly mediaService: MediaService) {}

  @Post('upload/images')
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(ImageUploadInterceptor)
  async uploadImages(
    @UploadedFiles() files: { images?: Express.Multer.File[] },
  ) {
    if (!files?.images || files.images.length === 0) {
      throw new BadRequestException('No image files provided');
    }

    this.logger.log(`📸 Uploading ${files.images.length} image(s)...`);

    const images = await this.mediaService.uploadImages(files.images);

    return {
      images,
      count: images.length,
    };
  }

  @Post('upload/video')
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(VideoUploadInterceptor)
  async uploadVideo(@UploadedFiles() files: { video?: Express.Multer.File[] }) {
    if (!files?.video || files.video.length === 0) {
      throw new BadRequestException('No video file provided');
    }

    this.logger.log(`🎥 Uploading video...`);

    const video = await this.mediaService.uploadVideo(files.video[0]);

    return {
      video,
    };
  }
}
