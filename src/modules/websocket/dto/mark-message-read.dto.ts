import { IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';

/**
 * 메시지 읽음 표시 DTO
 */
export class MarkMessageReadDto {
  @IsNumber()
  messageId: number;

  @IsOptional()
  @IsString()
  deviceType?: string;

  @IsOptional()
  @IsEnum(['auto', 'manual', 'scroll'])
  readSource?: 'auto' | 'manual' | 'scroll';

  @IsOptional()
  @IsString()
  sessionId?: string;
}
