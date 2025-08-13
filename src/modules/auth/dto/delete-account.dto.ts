import { IsBoolean, IsOptional, IsString } from 'class-validator';

/**
 * 계정 삭제 확인 DTO
 */
export class DeleteAccountDto {
  @IsOptional()
  @IsString()
  confirmationText?: string; // 사용자가 입력한 확인 텍스트 (예: "DELETE")

  @IsOptional()
  @IsBoolean()
  deleteAllData?: boolean; // 모든 데이터 완전 삭제 여부 (기본: true)

  @IsOptional()
  @IsString()
  reason?: string; // 탈퇴 사유 (선택적)
}

/**
 * 계정 삭제 결과 DTO
 */
export class DeleteAccountResultDto {
  @IsBoolean()
  success: boolean;

  @IsString()
  message: string;

  deletedData: {
    personalData: {
      user: boolean;
      profile: boolean;
      notifications: number;
      readReceipts: number;
    };
    anonymizedData: {
      messages: number;
      travelUsers: number;
      planetUsers: number;
      fileUploads: number;
      videoProcessings: number;
      streamingSessions: number;
    };
    totalImpactedRecords: number;
  };
}
