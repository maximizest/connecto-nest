import { IsString } from 'class-validator';

/**
 * 룸 입장 DTO
 */
export class JoinRoomDto {
  @IsString()
  roomId: string;
}
