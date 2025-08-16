import { IsString } from 'class-validator';

/**
 * 룸 퇴장 DTO
 */
export class LeaveRoomDto {
  @IsString()
  roomId: string;
}
