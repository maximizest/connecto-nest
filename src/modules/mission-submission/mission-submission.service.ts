import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CrudService } from '@foryourdev/nestjs-crud';
import { MissionSubmission } from './mission-submission.entity';
import { SubmissionStatus } from '../mission/enums/submission-status.enum';

@Injectable()
export class MissionSubmissionService extends CrudService<MissionSubmission> {
  public readonly repository: Repository<MissionSubmission>;
  constructor(
    @InjectRepository(MissionSubmission)
    repository: Repository<MissionSubmission>,
  ) {
    super(repository);
    this.repository = repository;
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
    // 중복 제출 체크
    const existingSubmission = await this.repository.findOne({
      where: {
        userId,
        missionId,
        travelId,
      },
    });

    if (existingSubmission) {
      throw new BadRequestException('이미 제출된 미션입니다.');
    }

    const submission = this.repository.create({
      userId,
      missionId,
      travelId,
      content: submissionData,
      status: SubmissionStatus.SUBMITTED,
      submittedAt: new Date(),
    });

    return await this.repository.save(submission);
  }

  /**
   * 미션 제출물 검토
   */
  async reviewSubmission(
    submissionId: number,
    status: SubmissionStatus,
    reviewComment?: string,
  ): Promise<MissionSubmission> {
    const submission = await this.repository.findOne({
      where: { id: submissionId },
    });

    if (!submission) {
      throw new NotFoundException('제출물을 찾을 수 없습니다.');
    }

    submission.status = status;
    submission.reviewComment = reviewComment;
    submission.reviewedAt = new Date();

    return await this.repository.save(submission);
  }

  /**
   * 사용자의 미션 제출 현황 조회
   */
  async getUserSubmissions(
    userId: number,
    travelId?: number,
  ): Promise<MissionSubmission[]> {
    const whereCondition: any = { userId };
    if (travelId) {
      whereCondition.travelId = travelId;
    }

    return await this.repository.find({
      where: whereCondition,
      relations: ['mission', 'travel'],
      order: { submittedAt: 'DESC' },
    });
  }

  /**
   * 미션별 제출 현황 조회
   */
  async getMissionSubmissions(
    missionId: number,
    travelId?: number,
  ): Promise<MissionSubmission[]> {
    const whereCondition: any = { missionId };
    if (travelId) {
      whereCondition.travelId = travelId;
    }

    return await this.repository.find({
      where: whereCondition,
      relations: ['user', 'travel'],
      order: { submittedAt: 'DESC' },
    });
  }

  /**
   * 제출물 삭제 (사용자 본인만)
   */
  async deleteSubmission(submissionId: number, userId: number): Promise<void> {
    const submission = await this.repository.findOne({
      where: { id: submissionId, userId },
    });

    if (!submission) {
      throw new NotFoundException('제출물을 찾을 수 없습니다.');
    }

    if (submission.status === SubmissionStatus.APPROVED) {
      throw new BadRequestException('승인된 제출물은 삭제할 수 없습니다.');
    }

    await this.repository.delete(submissionId);
  }
}
