import { IsNumber, IsOptional, IsString } from 'class-validator';

/**
 * 모든 메시지 읽음 표시 DTO
 */
export class MarkAllReadDto {
  @IsNumber()
  planetId: number;

  @IsOptional()
  @IsString()
  deviceType?: string;

  @IsOptional()
  @IsString()
  sessionId?: string;
}