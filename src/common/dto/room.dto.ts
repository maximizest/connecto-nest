import { IsString } from 'class-validator';

/**
 * 공통 Room DTO
 *
 * WebSocket room 관련 작업에서 사용되는 공통 DTO
 */
export class RoomDto {
  @IsString()
  roomId: string;
}

export class JoinRoomDto extends RoomDto {}
export class LeaveRoomDto extends RoomDto {}
