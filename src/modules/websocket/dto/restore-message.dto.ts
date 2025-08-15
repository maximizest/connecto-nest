import { IsNumber } from 'class-validator';

/**
 * 메시지 복원 DTO
 */
export class RestoreMessageDto {
  @IsNumber()
  messageId: number;
}