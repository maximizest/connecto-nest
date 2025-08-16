import { IsNumber } from 'class-validator';

/**
 * 메시지 삭제 DTO
 */
export class DeleteMessageDto {
  @IsNumber()
  messageId: number;
}
