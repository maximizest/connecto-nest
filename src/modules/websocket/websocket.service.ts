import { Injectable, Logger } from '@nestjs/common';
import { User } from '../user/user.entity';

/**
 * WebSocket Service
 *
 * WebSocket 관련 비즈니스 로직 처리
 */
@Injectable()
export class WebSocketService {
  private readonly logger = new Logger(WebSocketService.name);

  /**
   * 사용자 온라인 상태 업데이트
   */
  async updateUserOnlineStatus(
    userId: number,
    isOnline: boolean,
  ): Promise<void> {
    try {
      await User.update(userId, {
        updatedAt: new Date(),
      });

      this.logger.log(
        `User online status updated: userId=${userId}, isOnline=${isOnline}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to update user online status: ${error.message}`,
        error.stack,
      );
    }
  }
}
