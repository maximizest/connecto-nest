import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Admin } from '../../admin/admin.entity';
import { FileUpload } from '../../file-upload/file-upload.entity';
import { Message } from '../../message/message.entity';
import { Notification } from '../../notification/notification.entity';
import { PlanetUser } from '../../planet-user/planet-user.entity';
import { Profile } from '../../profile/profile.entity';
import { MessageReadReceipt } from '../../read-receipt/read-receipt.entity';
import { TravelUser } from '../../travel-user/travel-user.entity';
import { VideoProcessing } from '../../video-processing/video-processing.entity';
import { User } from '../user.entity';

/**
 * 사용자 하드 삭제 서비스
 *
 * 한국 개인정보보호법 준수를 위한 완전 삭제 + 서비스 데이터 익명화 처리
 *
 * 처리 과정:
 * 1. 개인정보 완전 삭제 (User, Profile, Admin, Notification, ReadReceipt)
 * 2. 서비스 데이터 익명화 (Message, TravelUser, PlanetUser, FileUpload, etc)
 * 3. 트랜잭션 처리로 원자성 보장
 */
@Injectable()
export class UserDeletionService {
  private readonly logger = new Logger(UserDeletionService.name);

  constructor(
    private readonly dataSource: DataSource,

    // 개인정보 entities (하드 삭제)
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,

    @InjectRepository(Profile)
    private readonly profileRepository: Repository<Profile>,

    @InjectRepository(Admin)
    private readonly adminRepository: Repository<Admin>,

    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,

    @InjectRepository(MessageReadReceipt)
    private readonly readReceiptRepository: Repository<MessageReadReceipt>,

    // 서비스 데이터 entities (익명화)
    @InjectRepository(Message)
    private readonly messageRepository: Repository<Message>,

    @InjectRepository(TravelUser)
    private readonly travelUserRepository: Repository<TravelUser>,

    @InjectRepository(PlanetUser)
    private readonly planetUserRepository: Repository<PlanetUser>,

    @InjectRepository(FileUpload)
    private readonly fileUploadRepository: Repository<FileUpload>,

    @InjectRepository(VideoProcessing)
    private readonly videoProcessingRepository: Repository<VideoProcessing>,
  ) {}

  /**
   * 사용자 완전 삭제 (개보법 준수)
   *
   * @param userId 삭제할 사용자 ID
   * @returns 삭제 결과 통계
   */
  async deleteUserCompletely(userId: number): Promise<{
    success: boolean;
    deletedPersonalData: {
      user: boolean;
      profile: boolean;
      notifications: number;
      readReceipts: number;
    };
    anonymizedServiceData: {
      messages: number;
      travelUsers: number;
      planetUsers: number;
      fileUploads: number;
      videoProcessings: number;
    };
    error?: string;
  }> {
    this.logger.log(`🔥 Starting hard deletion for User ID: ${userId}`);

    return await this.dataSource.transaction(async (manager) => {
      try {
        const result = {
          success: false,
          deletedPersonalData: {
            user: false,
            profile: false,
            notifications: 0,
            readReceipts: 0,
          },
          anonymizedServiceData: {
            messages: 0,
            travelUsers: 0,
            planetUsers: 0,
            fileUploads: 0,
            videoProcessings: 0,
          },
        };

        // 1. 사용자 존재 확인
        const user = await manager.findOne(User, { where: { id: userId } });
        if (!user) {
          throw new Error(`User with ID ${userId} not found`);
        }

        this.logger.log(`📋 User found: ${user.name} (${user.email})`);

        // 2. 서비스 데이터 익명화
        this.logger.log('🔄 Starting service data anonymization...');

        // 2-1. 메시지 익명화
        const anonymizedMessages = await manager.update(
          Message,
          { senderId: userId },
          {
            senderId: undefined,
            isFromDeletedUser: true,
            deletedUserType: 'user',
          },
        );
        result.anonymizedServiceData.messages =
          anonymizedMessages.affected || 0;

        // 2-2. TravelUser 익명화
        const anonymizedTravelUsers = await manager.update(
          TravelUser,
          { userId: userId },
          {
            userId: undefined,
            isDeletedUser: true,
          },
        );
        result.anonymizedServiceData.travelUsers =
          anonymizedTravelUsers.affected || 0;

        // 2-3. PlanetUser 익명화
        const anonymizedPlanetUsers = await manager.update(
          PlanetUser,
          { userId: userId },
          {
            userId: undefined,
            isDeletedUser: true,
          },
        );
        result.anonymizedServiceData.planetUsers =
          anonymizedPlanetUsers.affected || 0;

        // 2-4. FileUpload 익명화
        const anonymizedFileUploads = await manager.update(
          FileUpload,
          { userId: userId },
          {
            userId: undefined,
            isFromDeletedUser: true,
          },
        );
        result.anonymizedServiceData.fileUploads =
          anonymizedFileUploads.affected || 0;

        // 2-5. VideoProcessing 익명화
        const anonymizedVideoProcessings = await manager.update(
          VideoProcessing,
          { userId: userId },
          {
            userId: undefined,
            isFromDeletedUser: true,
          },
        );
        result.anonymizedServiceData.videoProcessings =
          anonymizedVideoProcessings.affected || 0;

        this.logger.log('✅ Service data anonymization completed');

        // 3. 개인정보 완전 삭제
        this.logger.log('🗑️  Starting personal data deletion...');

        // 3-1. 알림 삭제
        const deletedNotifications = await manager.delete(Notification, {
          userId: userId,
        });
        result.deletedPersonalData.notifications =
          deletedNotifications.affected || 0;

        // 3-2. 읽음 영수증 삭제
        const deletedReadReceipts = await manager.delete(MessageReadReceipt, {
          userId: userId,
        });
        result.deletedPersonalData.readReceipts =
          deletedReadReceipts.affected || 0;

        // 3-3. 프로필 삭제
        const deletedProfile = await manager.delete(Profile, {
          userId: userId,
        });
        result.deletedPersonalData.profile = (deletedProfile.affected || 0) > 0;

        // 3-4. 사용자 삭제
        const deletedUser = await manager.delete(User, { id: userId });
        result.deletedPersonalData.user = (deletedUser.affected || 0) > 0;

        this.logger.log('✅ Personal data deletion completed');

        result.success = true;

        // 4. 결과 로깅
        this.logger.log('📊 Deletion Summary:');
        this.logger.log(`   Personal Data Deleted:`);
        this.logger.log(`   - User: ${result.deletedPersonalData.user}`);
        this.logger.log(`   - Profile: ${result.deletedPersonalData.profile}`);
        this.logger.log(
          `   - Notifications: ${result.deletedPersonalData.notifications}`,
        );
        this.logger.log(
          `   - Read Receipts: ${result.deletedPersonalData.readReceipts}`,
        );
        this.logger.log(`   Service Data Anonymized:`);
        this.logger.log(
          `   - Messages: ${result.anonymizedServiceData.messages}`,
        );
        this.logger.log(
          `   - Travel Users: ${result.anonymizedServiceData.travelUsers}`,
        );
        this.logger.log(
          `   - Planet Users: ${result.anonymizedServiceData.planetUsers}`,
        );
        this.logger.log(
          `   - File Uploads: ${result.anonymizedServiceData.fileUploads}`,
        );
        this.logger.log(
          `   - Video Processings: ${result.anonymizedServiceData.videoProcessings}`,
        );

        this.logger.log(
          `🎉 User ${userId} completely deleted and data anonymized!`,
        );

        return result;
      } catch (error) {
        this.logger.error(`❌ Failed to delete user ${userId}:`, error.stack);
        throw error; // 트랜잭션 롤백 위해 에러 재발생
      }
    });
  }

  /**
   * 관리자 완전 삭제 (개보법 준수)
   *
   * @param adminId 삭제할 관리자 ID
   * @returns 삭제 결과 통계
   */
  async deleteAdminCompletely(adminId: number): Promise<{
    success: boolean;
    deletedPersonalData: {
      admin: boolean;
    };
    anonymizedServiceData: {
      messages: number;
    };
    error?: string;
  }> {
    this.logger.log(`🔥 Starting hard deletion for Admin ID: ${adminId}`);

    return await this.dataSource.transaction(async (manager) => {
      try {
        const result = {
          success: false,
          deletedPersonalData: {
            admin: false,
          },
          anonymizedServiceData: {
            messages: 0,
          },
        };

        // 1. 관리자 존재 확인
        const admin = await manager.findOne(Admin, { where: { id: adminId } });
        if (!admin) {
          throw new Error(`Admin with ID ${adminId} not found`);
        }

        this.logger.log(`📋 Admin found: ${admin.name} (${admin.email})`);

        // 2. 서비스 데이터 익명화 (관리자가 작성한 메시지)
        this.logger.log('🔄 Starting service data anonymization...');

        // Admin은 직접적으로 메시지를 작성하지 않지만,
        // 향후 관리자가 메시지를 작성할 수 있는 경우를 대비
        const anonymizedMessages = await manager.update(
          Message,
          { senderId: adminId },
          {
            senderId: undefined,
            isFromDeletedUser: true,
            deletedUserType: 'admin',
          },
        );
        result.anonymizedServiceData.messages =
          anonymizedMessages.affected || 0;

        this.logger.log('✅ Service data anonymization completed');

        // 3. 개인정보 완전 삭제
        this.logger.log('🗑️  Starting personal data deletion...');

        // 3-1. 관리자 삭제
        const deletedAdmin = await manager.delete(Admin, { id: adminId });
        result.deletedPersonalData.admin = (deletedAdmin.affected || 0) > 0;

        this.logger.log('✅ Personal data deletion completed');

        result.success = true;

        // 4. 결과 로깅
        this.logger.log('📊 Deletion Summary:');
        this.logger.log(`   Personal Data Deleted:`);
        this.logger.log(`   - Admin: ${result.deletedPersonalData.admin}`);
        this.logger.log(`   Service Data Anonymized:`);
        this.logger.log(
          `   - Messages: ${result.anonymizedServiceData.messages}`,
        );

        this.logger.log(
          `🎉 Admin ${adminId} completely deleted and data anonymized!`,
        );

        return result;
      } catch (error) {
        this.logger.error(`❌ Failed to delete admin ${adminId}:`, error.stack);
        throw error; // 트랜잭션 롤백 위해 에러 재발생
      }
    });
  }

  /**
   * 삭제 전 영향도 분석
   *
   * @param userId 사용자 ID
   * @returns 삭제될 데이터 통계
   */
  async analyzeDeletionImpact(userId: number): Promise<{
    personalDataCount: {
      user: boolean;
      profile: boolean;
      notifications: number;
      readReceipts: number;
    };
    serviceDataCount: {
      messages: number;
      travelUsers: number;
      planetUsers: number;
      fileUploads: number;
      videoProcessings: number;
    };
    totalImpactedRecords: number;
  }> {
    this.logger.log(`📊 Analyzing deletion impact for User ID: ${userId}`);

    // 사용자 존재 확인
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new Error(`User with ID ${userId} not found`);
    }

    // 프로필 확인
    const profile = await this.profileRepository.findOne({
      where: { userId: userId },
    });

    // 각 엔티티별 레코드 수 확인
    const [
      notificationsCount,
      readReceiptsCount,
      messagesCount,
      travelUsersCount,
      planetUsersCount,
      fileUploadsCount,
      videoProcessingsCount,
    ] = await Promise.all([
      this.notificationRepository.count({ where: { userId: userId } }),
      this.readReceiptRepository.count({ where: { userId: userId } }),
      this.messageRepository.count({ where: { senderId: userId } }),
      this.travelUserRepository.count({ where: { userId: userId } }),
      this.planetUserRepository.count({ where: { userId: userId } }),
      this.fileUploadRepository.count({ where: { userId: userId } }),
      this.videoProcessingRepository.count({ where: { userId: userId } }),
    ]);

    const result = {
      personalDataCount: {
        user: true,
        profile: !!profile,
        notifications: notificationsCount,
        readReceipts: readReceiptsCount,
      },
      serviceDataCount: {
        messages: messagesCount,
        travelUsers: travelUsersCount,
        planetUsers: planetUsersCount,
        fileUploads: fileUploadsCount,
        videoProcessings: videoProcessingsCount,
      },
      totalImpactedRecords: 0,
    };

    // 전체 영향받는 레코드 수 계산
    result.totalImpactedRecords =
      1 + // user
      (profile ? 1 : 0) + // profile
      notificationsCount +
      readReceiptsCount +
      messagesCount +
      travelUsersCount +
      planetUsersCount +
      fileUploadsCount +
      videoProcessingsCount;

    this.logger.log(`📋 Impact Analysis Result:`);
    this.logger.log(
      `   Total Impacted Records: ${result.totalImpactedRecords}`,
    );
    this.logger.log(`   Personal Data (will be deleted):`);
    this.logger.log(`   - User: 1`);
    this.logger.log(`   - Profile: ${profile ? 1 : 0}`);
    this.logger.log(`   - Notifications: ${notificationsCount}`);
    this.logger.log(`   - Read Receipts: ${readReceiptsCount}`);
    this.logger.log(`   Service Data (will be anonymized):`);
    this.logger.log(`   - Messages: ${messagesCount}`);
    this.logger.log(`   - Travel Users: ${travelUsersCount}`);
    this.logger.log(`   - Planet Users: ${planetUsersCount}`);
    this.logger.log(`   - File Uploads: ${fileUploadsCount}`);
    this.logger.log(`   - Video Processings: ${videoProcessingsCount}`);

    return result;
  }

  /**
   * 시스템 사용자 생성 상태 확인
   */
  async checkSystemUsersExist(): Promise<{
    deletedUser: boolean;
    deletedAdmin: boolean;
  }> {
    const deletedUser = await this.userRepository.findOne({
      where: { id: -1 },
    });

    const deletedAdmin = await this.adminRepository.findOne({
      where: { id: -2 },
    });

    return {
      deletedUser: !!deletedUser,
      deletedAdmin: !!deletedAdmin,
    };
  }

  /**
   * 개보법 준수 검증
   * 삭제 후 개인정보가 완전히 제거되었는지 확인
   */
  async validateDeletionCompliance(userId: number): Promise<{
    compliant: boolean;
    remainingPersonalData: string[];
    issues: string[];
  }> {
    this.logger.log(`🔍 Validating deletion compliance for User ID: ${userId}`);

    const issues: string[] = [];
    const remainingPersonalData: string[] = [];

    // 개인정보 테이블에서 사용자 데이터 확인
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (user) {
      remainingPersonalData.push('User record still exists');
    }

    const profile = await this.profileRepository.findOne({
      where: { userId: userId },
    });
    if (profile) {
      remainingPersonalData.push('Profile record still exists');
    }

    const notifications = await this.notificationRepository.count({
      where: { userId: userId },
    });
    if (notifications > 0) {
      remainingPersonalData.push(`${notifications} Notification records`);
    }

    const readReceipts = await this.readReceiptRepository.count({
      where: { userId: userId },
    });
    if (readReceipts > 0) {
      remainingPersonalData.push(`${readReceipts} ReadReceipt records`);
    }

    // 서비스 데이터에서 비익명화된 데이터 확인
    const nonAnonymizedMessages = await this.messageRepository.count({
      where: { senderId: userId, isFromDeletedUser: false },
    });
    if (nonAnonymizedMessages > 0) {
      issues.push(`${nonAnonymizedMessages} Messages not anonymized`);
    }

    const nonAnonymizedTravelUsers = await this.travelUserRepository.count({
      where: { userId: userId, isDeletedUser: false },
    });
    if (nonAnonymizedTravelUsers > 0) {
      issues.push(`${nonAnonymizedTravelUsers} TravelUsers not anonymized`);
    }

    const nonAnonymizedPlanetUsers = await this.planetUserRepository.count({
      where: { userId: userId, isDeletedUser: false },
    });
    if (nonAnonymizedPlanetUsers > 0) {
      issues.push(`${nonAnonymizedPlanetUsers} PlanetUsers not anonymized`);
    }

    const compliant = remainingPersonalData.length === 0 && issues.length === 0;

    this.logger.log(`🔍 Compliance Check Result: ${compliant ? '✅' : '❌'}`);
    if (!compliant) {
      this.logger.warn(`⚠️  Remaining Personal Data: ${remainingPersonalData}`);
      this.logger.warn(`⚠️  Anonymization Issues: ${issues}`);
    }

    return {
      compliant,
      remainingPersonalData,
      issues,
    };
  }
}
