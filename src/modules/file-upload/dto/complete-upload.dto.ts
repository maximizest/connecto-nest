import { IsNumber, IsString } from 'class-validator';

/**
 * 업로드 완료 DTO
 */
export class CompleteUploadDto {
  @IsNumber()
  uploadId: number;

  @IsString()
  storageKey: string;
}