import { IsArray, IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';

/**
 * 여러 메시지 읽음 표시 DTO
 */
export class MarkMultipleReadDto {
  @IsArray()
  @IsNumber({}, { each: true })
  messageIds: number[];

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