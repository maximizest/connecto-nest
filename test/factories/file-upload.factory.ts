import { Factory } from 'fishery';
import { FileUpload } from '../../src/modules/file-upload/file-upload.entity';
import { FileUploadStatus } from '../../src/modules/file-upload/enums/file-upload-status.enum';
import { FileUploadType } from '../../src/modules/file-upload/enums/file-upload-type.enum';

/**
 * FileUpload Factory - Fishery를 사용한 파일 업로드 테스트 데이터 생성
 */
export const FileUploadFactory = Factory.define<FileUpload>(({ sequence, params }) => {
  const fileUpload = new FileUpload();

  // 기본 정보
  fileUpload.id = sequence;
  fileUpload.userId = params.userId || sequence;
  
  // 파일 정보
  fileUpload.originalFileName = `test-file-${sequence}.jpg`;
  fileUpload.storageKey = `uploads/test/${sequence}/test-file-${sequence}.jpg`;
  fileUpload.mimeType = 'image/jpeg';
  fileUpload.fileSize = 1024 * 1024 * 2; // 2MB
  
  // 업로드 정보
  fileUpload.uploadType = FileUploadType.IMAGE;
  fileUpload.status = FileUploadStatus.COMPLETED;
  
  // 추가 정보
  fileUpload.folder = 'test';
  fileUpload.publicUrl = `https://cdn.example.com/uploads/test/${sequence}/test-file-${sequence}.jpg`;
  fileUpload.metadata = {
    width: 1920,
    height: 1080,
    format: 'jpeg',
  };

  // 타임스탬프
  fileUpload.createdAt = new Date();
  fileUpload.updatedAt = new Date();

  return fileUpload;
});

/**
 * 비디오 파일 업로드 Factory
 */
export const VideoFileUploadFactory = FileUploadFactory.params({
  originalFileName: 'test-video.mp4',
  mimeType: 'video/mp4',
  uploadType: FileUploadType.VIDEO,
  fileSize: 1024 * 1024 * 50, // 50MB
  metadata: {
    duration: 120, // 2 minutes
    width: 1920,
    height: 1080,
    bitrate: 5000000,
  },
});

/**
 * 문서 파일 업로드 Factory
 */
export const DocumentFileUploadFactory = FileUploadFactory.params({
  originalFileName: 'test-document.pdf',
  mimeType: 'application/pdf',
  uploadType: FileUploadType.DOCUMENT,
  fileSize: 1024 * 1024 * 5, // 5MB
  metadata: {
    pages: 10,
  },
});

/**
 * 실패한 업로드 Factory
 */
export const FailedFileUploadFactory = FileUploadFactory.params({
  status: FileUploadStatus.FAILED,
  publicUrl: undefined,
});