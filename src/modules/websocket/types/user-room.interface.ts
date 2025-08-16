import { AuthenticatedSocket } from './authenticated-socket.interface';

/**
 * 사용자 룸 정보
 */
export interface UserRoom {
  userId: number;
  rooms: Set<string>;
  socket: AuthenticatedSocket;
}
