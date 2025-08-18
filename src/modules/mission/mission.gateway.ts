import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { UseGuards } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { WsAuthGuard } from '../../guards/ws-auth.guard';
import { MissionService } from './mission.service';

/**
 * Mission WebSocket Gateway
 *
 * 미션 관련 실시간 이벤트를 처리합니다.
 *
 * 주요 이벤트:
 * - mission:new - 새 미션 할당 알림
 * - mission:submit - 미션 제출 알림
 * - mission:reviewed - 미션 평가 완료 알림
 * - mission:expired - 미션 만료 알림
 */
@WebSocketGateway({
  namespace: 'mission',
  cors: {
    origin: '*',
    credentials: true,
  },
})
@UseGuards(WsAuthGuard)
export class MissionGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  constructor(private readonly missionService: MissionService) {}

  /**
   * 클라이언트 연결 처리
   */
  async handleConnection(client: Socket) {
    console.log(`Mission Gateway: Client connected - ${client.id}`);

    // 사용자의 여행 목록에 따라 room에 join
    const userId = client.data?.user?.id;
    if (userId) {
      // 사용자가 속한 여행 room에 자동 join
      client.join(`user:${userId}`);
    }
  }

  /**
   * 클라이언트 연결 해제 처리
   */
  async handleDisconnect(client: Socket) {
    console.log(`Mission Gateway: Client disconnected - ${client.id}`);
  }

  /**
   * 여행 room 참여
   */
  @SubscribeMessage('mission:join-travel')
  async handleJoinTravel(
    @MessageBody() data: { travelId: number },
    @ConnectedSocket() client: Socket,
  ) {
    const travelRoom = `travel:${data.travelId}`;
    client.join(travelRoom);

    // 활성 미션 목록 전송
    const missions = await this.missionService.getActiveMissionsForTravel(
      data.travelId,
    );

    client.emit('mission:active-list', {
      travelId: data.travelId,
      missions,
    });

    return {
      event: 'mission:joined',
      data: {
        travelId: data.travelId,
        missionsCount: missions.length,
      },
    };
  }

  /**
   * 여행 room 나가기
   */
  @SubscribeMessage('mission:leave-travel')
  async handleLeaveTravel(
    @MessageBody() data: { travelId: number },
    @ConnectedSocket() client: Socket,
  ) {
    const travelRoom = `travel:${data.travelId}`;
    client.leave(travelRoom);

    return {
      event: 'mission:left',
      data: { travelId: data.travelId },
    };
  }

  /**
   * 새 미션 할당 알림
   */
  @SubscribeMessage('mission:assign')
  async handleNewMission(
    @MessageBody()
    data: {
      missionId: number;
      travelId: number;
      planetId?: number;
    },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      // 미션 할당
      const assignment = await this.missionService.assignMissionToTravel(
        data.missionId,
        data.travelId,
        data.planetId,
        client.data.user.id,
      );

      // 여행 room의 모든 멤버에게 알림
      const travelRoom = `travel:${data.travelId}`;
      this.server.to(travelRoom).emit('mission:new', {
        missionId: data.missionId,
        travelId: data.travelId,
        planetId: data.planetId,
        assignedAt: assignment.assignedAt,
      });

      return {
        event: 'mission:assigned',
        data: assignment,
      };
    } catch (error) {
      return {
        event: 'error',
        data: {
          message: error.message,
        },
      };
    }
  }

  /**
   * 미션 제출 알림
   */
  @SubscribeMessage('mission:submit')
  async handleMissionSubmission(
    @MessageBody()
    data: {
      missionId: number;
      travelId: number;
      content: any;
    },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      // 미션 제출
      const submission = await this.missionService.submitMission(
        client.data.user.id,
        data.missionId,
        data.travelId,
        data.content,
      );

      // 여행 room의 모든 멤버에게 알림
      const travelRoom = `travel:${data.travelId}`;
      this.server.to(travelRoom).emit('mission:submitted', {
        submissionId: submission.id,
        userId: client.data.user.id,
        missionId: data.missionId,
        submittedAt: submission.submittedAt,
      });

      // 제출자에게 확인 메시지
      return {
        event: 'mission:submission-success',
        data: submission,
      };
    } catch (error) {
      return {
        event: 'error',
        data: {
          message: error.message,
        },
      };
    }
  }

  /**
   * 미션 평가 알림
   */
  @SubscribeMessage('mission:review')
  async handleMissionReview(
    @MessageBody()
    data: {
      submissionId: number;
      approved: boolean;
      comment?: string;
    },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      // 미션 평가
      const submission = await this.missionService.reviewSubmission(
        data.submissionId,
        client.data.user.id,
        data.approved,
        data.comment,
      );

      // 제출자에게 평가 결과 알림
      const userRoom = `user:${submission.userId}`;
      this.server.to(userRoom).emit('mission:reviewed', {
        submissionId: submission.id,
        status: submission.status,
        reviewedBy: submission.reviewedBy,
        reviewComment: submission.reviewComment,
        reviewedAt: submission.reviewedAt,
      });

      return {
        event: 'mission:review-success',
        data: submission,
      };
    } catch (error) {
      return {
        event: 'error',
        data: {
          message: error.message,
        },
      };
    }
  }

  /**
   * 미션 진행 상황 조회
   */
  @SubscribeMessage('mission:progress')
  async handleMissionProgress(
    @MessageBody() data: { missionId: number },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const statistics = await this.missionService.getMissionStatistics(
        data.missionId,
      );

      return {
        event: 'mission:progress-data',
        data: statistics,
      };
    } catch (error) {
      return {
        event: 'error',
        data: {
          message: error.message,
        },
      };
    }
  }

  /**
   * 미션 만료 알림 (서버에서 호출)
   */
  notifyMissionExpired(missionId: number, travelIds: number[]) {
    travelIds.forEach((travelId) => {
      const travelRoom = `travel:${travelId}`;
      this.server.to(travelRoom).emit('mission:expired', {
        missionId,
        expiredAt: new Date(),
      });
    });
  }

  /**
   * 새 미션 생성 알림 (서버에서 호출)
   */
  notifyNewMissionCreated(mission: any, travelIds: number[]) {
    travelIds.forEach((travelId) => {
      const travelRoom = `travel:${travelId}`;
      this.server.to(travelRoom).emit('mission:created', {
        mission,
        travelId,
      });
    });
  }
}
