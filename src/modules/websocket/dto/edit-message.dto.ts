import { IsNumber, IsString } from 'class-validator';

/**
 * 메시지 편집 DTO
 */
export class EditMessageDto {
  @IsNumber()
  messageId: number;

  @IsString()
  content: string;
}