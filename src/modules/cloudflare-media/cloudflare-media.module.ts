import { Module } from '@nestjs/common';
import { CloudflareMediaService } from './cloudflare-media.service';

@Module({
  providers: [CloudflareMediaService],
  exports: [CloudflareMediaService],
})
export class CloudflareMediaModule {}