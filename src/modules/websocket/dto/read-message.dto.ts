import { IsNumber } from 'class-validator';

/**
 * 메시지 읽음 처리 DTO
 */
export class ReadMessageDto {
  @IsNumber()
  planetId: number;

  @IsNumber()
  messageId: number;
}