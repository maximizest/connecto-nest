import { IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';

/**
 * 메시지 전송 DTO
 */
export class SendMessageDto {
  @IsNumber()
  planetId: number;

  @IsEnum(['TEXT', 'IMAGE', 'VIDEO', 'FILE'])
  type: 'TEXT' | 'IMAGE' | 'VIDEO' | 'FILE';

  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsString()
  fileUrl?: string;

  @IsOptional()
  @IsString()
  fileName?: string;

  @IsOptional()
  @IsNumber()
  fileSize?: number;
}
