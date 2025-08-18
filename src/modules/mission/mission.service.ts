import { CrudService } from '@foryourdev/nestjs-crud';
import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, QueryRunner } from 'typeorm';
import { Mission } from './mission.entity';
import { MissionTravel } from './mission-travel.entity';
import { MissionSubmission } from './mission-submission.entity';
import { MissionType } from './enums/mission-type.enum';
import { MissionTarget } from './enums/mission-target.enum';
import { SubmissionStatus } from './enums/submission-status.enum';

/**
 * Mission 서비스
 *
 * @foryourdev/nestjs-crud의 CrudService를 상속받아
 * 표준 CRUD 작업(index, show, create, update, destroy)을 제공합니다.
 *
 * 추가적으로 미션 할당, 제출, 평가 등의 비즈니스 로직을 처리합니다.
 */
@Injectable()
export class MissionService extends CrudService<Mission> {
  public readonly repository: Repository<Mission>;

  constructor(
    @InjectRepository(Mission)
    repository: Repository<Mission>,
    @InjectRepository(MissionTravel)
    private missionTravelRepository: Repository<MissionTravel>,
    @InjectRepository(MissionSubmission)
    private missionSubmissionRepository: Repository<MissionSubmission>,
  ) {
    super(repository);
    this.repository = repository;
  }

  /**
   * 미션을 여행에 할당
   */
  async assignMissionToTravel(
    missionId: number,
    travelId: number,
    planetId?: number,
    assignedBy?: number,
  ): Promise<MissionTravel> {
    // 미션 존재 여부 확인
    const mission = await this.repository.findOne({
      where: { id: missionId },
    });

    if (!mission) {
      throw new NotFoundException('미션을 찾을 수 없습니다.');
    }

    // 미션 활성 상태 확인
    if (!mission.isActive) {
      throw new BadRequestException('비활성화된 미션입니다.');
    }

    // 중복 할당 확인
    const existingAssignment = await this.missionTravelRepository.findOne({
      where: {
        missionId,
        travelId,
      },
    });

    if (existingAssignment) {
      throw new BadRequestException('이미 할당된 미션입니다.');
    }

    // 미션 할당
    const missionTravel = this.missionTravelRepository.create({
      missionId,
      travelId,
      planetId,
      assignedBy,
      isActive: true,
    });

    return await this.missionTravelRepository.save(missionTravel);
  }

  /**
   * 미션 제출
   */
  async submitMission(
    userId: number,
    missionId: number,
    travelId: number,
    submissionData: any,
  ): Promise<MissionSubmission> {
    // 미션 및 할당 정보 확인
    const missionTravel = await this.missionTravelRepository.findOne({
      where: {
        missionId,
        travelId,
      },
      relations: ['mission'],
    });

    if (!missionTravel) {
      throw new NotFoundException('할당되지 않은 미션입니다.');
    }

    if (!missionTravel.isActive) {
      throw new BadRequestException('비활성화된 미션입니다.');
    }

    const mission = missionTravel.mission;

    // 미션 기간 확인
    if (!mission.canParticipate()) {
      throw new BadRequestException('미션 참여 기간이 아닙니다.');
    }

    // 제출 횟수 확인
    if (!missionTravel.canSubmit(mission.maxSubmissions)) {
      throw new BadRequestException('제출 횟수를 초과했습니다.');
    }

    // 재제출 가능 여부 확인
    if (!mission.allowResubmission) {
      const existingSubmission = await this.missionSubmissionRepository.findOne(
        {
          where: {
            userId,
            missionId,
            travelId,
          },
        },
      );

      if (existingSubmission) {
        throw new BadRequestException('이미 제출한 미션입니다.');
      }
    }

    // 미션 타입별 검증
    if (mission.type === MissionType.BALANCE_GAME) {
      this.validateBalanceGameSubmission(mission, submissionData);
    } else if (
      mission.type === MissionType.IMAGE ||
      mission.type === MissionType.VIDEO
    ) {
      this.validateMediaSubmission(submissionData);
    }

    // 제출 생성
    const submission = this.missionSubmissionRepository.create({
      missionId,
      userId,
      travelId,
      submissionType: mission.type,
      content: submissionData,
      status: SubmissionStatus.PENDING,
    });

    const savedSubmission =
      await this.missionSubmissionRepository.save(submission);

    // 제출 횟수 증가
    missionTravel.incrementSubmissionCount();
    await this.missionTravelRepository.save(missionTravel);

    return savedSubmission;
  }

  /**
   * 미션 제출 평가
   */
  async reviewSubmission(
    submissionId: number,
    reviewerId: number,
    approved: boolean,
    comment?: string,
  ): Promise<MissionSubmission> {
    const submission = await this.missionSubmissionRepository.findOne({
      where: { id: submissionId },
    });

    if (!submission) {
      throw new NotFoundException('제출을 찾을 수 없습니다.');
    }

    if (!submission.isPending()) {
      throw new BadRequestException('이미 평가된 제출입니다.');
    }

    if (approved) {
      submission.approve(reviewerId, comment);
    } else {
      submission.reject(reviewerId, comment);
    }

    return await this.missionSubmissionRepository.save(submission);
  }

  /**
   * 여행의 활성 미션 조회
   */
  async getActiveMissionsForTravel(travelId: number): Promise<Mission[]> {
    const missionTravels = await this.missionTravelRepository.find({
      where: {
        travelId,
        isActive: true,
      },
      relations: ['mission'],
    });

    return missionTravels
      .map((mt) => mt.mission)
      .filter((mission) => mission.isOngoing());
  }

  /**
   * 사용자의 미션 제출 내역 조회
   */
  async getUserSubmissions(
    userId: number,
    travelId?: number,
  ): Promise<MissionSubmission[]> {
    const where: any = { userId };
    if (travelId) {
      where.travelId = travelId;
    }

    return await this.missionSubmissionRepository.find({
      where,
      relations: ['mission'],
      order: {
        submittedAt: 'DESC',
      },
    });
  }

  /**
   * 미션별 제출 통계
   */
  async getMissionStatistics(missionId: number): Promise<{
    totalSubmissions: number;
    completedSubmissions: number;
    pendingSubmissions: number;
    rejectedSubmissions: number;
    uniqueUsers: number;
  }> {
    const submissions = await this.missionSubmissionRepository.find({
      where: { missionId },
    });

    const uniqueUsers = new Set(submissions.map((s) => s.userId)).size;

    return {
      totalSubmissions: submissions.length,
      completedSubmissions: submissions.filter((s) => s.isCompleted()).length,
      pendingSubmissions: submissions.filter((s) => s.isPending()).length,
      rejectedSubmissions: submissions.filter((s) => s.isRejected()).length,
      uniqueUsers,
    };
  }

  /**
   * 밸런스 게임 제출 검증
   */
  private validateBalanceGameSubmission(
    mission: Mission,
    submissionData: any,
  ): void {
    const questions = mission.metadata?.questions;
    if (!questions || !Array.isArray(questions)) {
      throw new BadRequestException('미션 질문 정보가 없습니다.');
    }

    const answers = submissionData.answers;
    if (!answers || !Array.isArray(answers)) {
      throw new BadRequestException('답변 정보가 필요합니다.');
    }

    if (questions.length !== answers.length) {
      throw new BadRequestException('모든 질문에 답변해야 합니다.');
    }

    for (const answer of answers) {
      if (!['A', 'B'].includes(answer.answer)) {
        throw new BadRequestException('답변은 A 또는 B여야 합니다.');
      }
    }
  }

  /**
   * 미디어 제출 검증
   */
  private validateMediaSubmission(submissionData: any): void {
    if (!submissionData.fileUrl) {
      throw new BadRequestException('파일 URL이 필요합니다.');
    }
  }

  /**
   * 미션 비활성화
   */
  async deactivateMission(missionId: number): Promise<Mission> {
    const mission = await this.repository.findOne({
      where: { id: missionId },
    });

    if (!mission) {
      throw new NotFoundException('미션을 찾을 수 없습니다.');
    }

    mission.isActive = false;

    // 관련 미션 할당도 비활성화
    await this.missionTravelRepository.update(
      { missionId },
      { isActive: false },
    );

    return await this.repository.save(mission);
  }

  /**
   * 만료된 미션 자동 비활성화
   */
  async deactivateExpiredMissions(): Promise<number> {
    const expiredMissions = await this.repository
      .createQueryBuilder('mission')
      .where('mission.isActive = true')
      .andWhere('mission.endAt < :now', { now: new Date() })
      .getMany();

    for (const mission of expiredMissions) {
      await this.deactivateMission(mission.id);
    }

    return expiredMissions.length;
  }
}
