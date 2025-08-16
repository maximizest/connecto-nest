import { Socket } from 'socket.io';
import { User } from '../../user/user.entity';

/**
 * 인증된 소켓 인터페이스
 */
export interface AuthenticatedSocket extends Socket {
  user: User;
  userId: number;
  authenticated: boolean;
}
