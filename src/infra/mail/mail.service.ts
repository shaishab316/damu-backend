import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { JobsOptions, Queue } from 'bullmq';
import { MAIL_JOBS, MAIL_QUEUE } from './mail.constants';
import { SendMailData } from './mail.interface';

@Injectable()
export class MailService {
  constructor(@InjectQueue(MAIL_QUEUE) private readonly queue: Queue) {}

  async sendMail(data: SendMailData, options: JobsOptions = {}): Promise<void> {
    await this.queue.add(MAIL_JOBS.SEND, data, options);
  }
}
