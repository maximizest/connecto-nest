import { BeforeCreate, BeforeUpdate, Crud } from '@foryourdev/nestjs-crud';
import {
  Body,
  Controller,
  Delete,
  FileTypeValidator,
  Get,
  Logger,
  MaxFileSizeValidator,
  NotFoundException,
  Param,
  ParseFilePipe,
  Post,
  Put,
  Query,
  Request,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { STORAGE_SETTINGS } from '../../../../config/storage.config';
import { AuthGuard } from '../../../../guards/auth.guard';
import { StorageService } from '../../../storage/storage.service';
import { User } from '../../../user/user.entity';
import { FileUpload, FileUploadType } from '../../file-upload.entity';
import { FileUploadService } from '../../file-upload.service';

interface ChunkUploadDto {
  uploadId: string;
  partNumber: number;
  chunk: Buffer;
}

interface CompleteUploadDto {
  uploadId: string;
  parts: { partNumber: number; etag: string }[];
}

/**
 * File Upload API Controller (v1)
 *
 * 대용량 파일 업로드를 위한 API를 제공합니다.
 * - 기본 CRUD 작업 (index, show, create, update, destroy)
 * - 파일 업로드 관련 커스텀 엔드포인트
 * - 청크 기반 대용량 파일 업로드 (최대 500MB)
 */
@Controller({ path: 'files', version: '1' })
@Crud({
  entity: FileUpload,
  allowedFilters: [
    'userId',
    'status',
    'uploadType',
    'folder',
    'mimeType',
    'createdAt',
  ],
  allowedParams: [
    'originalFileName',
    'storageKey',
    'mimeType',
    'fileSize',
    'uploadType',
    'folder',
    'metadata',
  ],
  allowedIncludes: ['user'],
  only: ['index', 'show', 'create', 'update', 'destroy'],
  routes: {
    index: {
      allowedFilters: [
        'userId',
        'status',
        'uploadType',
        'folder',
        'mimeType',
        'createdAt',
        'completedAt',
      ],
    },
    show: {
      allowedIncludes: ['user'],
    },
  },
})
@UseGuards(AuthGuard)
export class FileUploadController {
  private readonly logger = new Logger(FileUploadController.name);

  constructor(
    public readonly crudService: FileUploadService,
    private readonly storageService: StorageService,
  ) {}

  /**
   * 파일 업로드 레코드 생성 전 사용자 ID 설정 (나머지는 FileUpload 엔티티에서 자동 처리)
   */
  @BeforeCreate()
  async preprocessCreateUpload(body: any, context: any) {
    const user: User = context.request?.user;

    // 사용자 정보 자동 설정
    if (user) {
      body.userId = user.id;
    }

    // 기본값 설정은 FileUpload 엔티티에서 자동 처리됨
    this.logger.log(
      `Creating upload record for user ${user?.id}: ${body.originalFileName}`,
    );
    return body;
  }

  /**
   * 파일 업로드 레코드 업데이트 전 권한 확인 (진행률 계산은 FileUpload 엔티티에서 자동 처리)
   */
  @BeforeUpdate()
  async preprocessUpdateUpload(entity: FileUpload, context: any) {
    const user: User = context.request?.user;

    // 사용자 권한 확인 - 엔티티에서 처리하기 어려운 비즈니스 로직
    if (context.currentEntity && context.currentEntity.userId !== user?.id) {
      throw new Error('파일 업로드 수정 권한이 없습니다.');
    }

    // 진행률 재계산은 FileUpload 엔티티에서 자동 처리됨
    this.logger.log(
      `Updating upload record ${context.currentEntity?.id} for user ${user?.id}`,
    );
    return entity;
  }

  /**
   * 단일 파일 업로드 (최대 100MB)
   * POST /api/v1/files/upload
   */
  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({
            maxSize: 100 * 1024 * 1024, // 100MB
            message: '파일 크기는 100MB를 초과할 수 없습니다.',
          }),
          new FileTypeValidator({
            fileType:
              /\.(jpg|jpeg|png|gif|webp|mp4|avi|mov|webm|pdf|doc|docx|txt|zip|rar)$/i,
          }),
        ],
      }),
    )
    file: Express.Multer.File,
    @Body('folder') folder?: keyof typeof STORAGE_SETTINGS.folders,
    @Body('metadata') metadata?: string,
    @Request() req?: any,
  ) {
    const user: User = req.user;

    try {
      // 메타데이터 파싱
      let parsedMetadata: Record<string, string> = {};
      if (metadata) {
        try {
          parsedMetadata = JSON.parse(metadata);
        } catch (error) {
          this.logger.warn(`Invalid metadata format: ${metadata}`);
        }
      }

      // 사용자 정보 추가
      parsedMetadata.uploadedBy = user.id.toString();
      parsedMetadata.uploaderName = user.name;

      // 폴더 기본값 설정
      const uploadFolder = folder || 'files';

      // 업로드 레코드 생성
      const uploadRecord = await this.crudService.createUploadRecord({
        userId: user.id,
        originalFileName: file.originalname,
        storageKey: '', // 임시로 빈 문자열, 업로드 후 업데이트
        mimeType: file.mimetype,
        fileSize: file.size,
        uploadType: FileUploadType.SINGLE,
        folder: uploadFolder,
        metadata: parsedMetadata,
      });

      try {
        const result = await this.storageService.uploadFile(
          file,
          uploadFolder,
          parsedMetadata,
        );

        // 업로드 레코드 업데이트
        uploadRecord.storageKey = result.key;
        await this.crudService.markAsCompleted(uploadRecord.id, result.url);

        this.logger.log(`File uploaded: ${result.key}, user: ${user.id}`);

        return {
          success: true,
          message: '파일이 성공적으로 업로드되었습니다.',
          data: {
            uploadId: uploadRecord.id,
            key: result.key,
            url: result.url,
            size: result.size,
            contentType: result.contentType,
            fileName: file.originalname,
            uploadedAt: new Date().toISOString(),
            uploadedBy: user.id,
          },
        };
      } catch (uploadError) {
        // 업로드 실패 시 레코드 업데이트
        await this.crudService.markAsFailed(
          uploadRecord.id,
          uploadError.message,
        );
        throw uploadError;
      }
    } catch (error) {
      this.logger.error(`File upload failed: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * 대용량 파일 업로드 초기화
   * POST /api/v1/files/upload/large/init
   */
  @Post('upload/large/init')
  async initiateMultipartUpload(
    @Body('fileName') fileName: string,
    @Body('contentType') contentType: string,
    @Body('fileSize') fileSize: number,
    @Body('folder') folder?: keyof typeof STORAGE_SETTINGS.folders,
    @Body('metadata') metadata?: Record<string, string>,
    @Request() req?: any,
  ) {
    const user: User = req.user;

    try {
      // 파일 크기 검증 (500MB 제한)
      const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500MB
      if (fileSize > MAX_FILE_SIZE) {
        throw new Error('파일 크기가 500MB를 초과할 수 없습니다.');
      }

      // 파일 형식 검증
      const allowedExtensions = [
        ...STORAGE_SETTINGS.allowedImageTypes,
        ...STORAGE_SETTINGS.allowedVideoTypes,
        ...STORAGE_SETTINGS.allowedFileTypes,
      ];

      const fileExtension = fileName.toLowerCase().split('.').pop();
      if (!fileExtension || !allowedExtensions.includes(fileExtension as any)) {
        throw new Error(`지원하지 않는 파일 형식입니다: ${fileExtension}`);
      }

      // 사용자 정보가 포함된 메타데이터
      const uploadMetadata = {
        uploadedBy: user.id.toString(),
        uploaderName: user.name,
        fileSize: fileSize.toString(),
        originalFileName: fileName,
        ...metadata,
      };

      const uploadFolder = folder || 'files';

      const result = await this.storageService.initiateMultipartUpload(
        fileName,
        uploadFolder,
        contentType,
        uploadMetadata,
      );

      // 청크 크기 계산 (최소 5MB, 최대 100MB)
      const CHUNK_SIZE = Math.min(
        Math.max(5 * 1024 * 1024, Math.ceil(fileSize / 10000)),
        100 * 1024 * 1024,
      );
      const totalChunks = Math.ceil(fileSize / CHUNK_SIZE);

      // 업로드 레코드 생성
      const uploadRecord = await this.crudService.createUploadRecord({
        userId: user.id,
        originalFileName: fileName,
        storageKey: result.key,
        mimeType: contentType,
        fileSize: fileSize,
        uploadType: FileUploadType.MULTIPART,
        folder: uploadFolder,
        uploadId: result.uploadId,
        totalChunks: totalChunks,
        metadata: uploadMetadata,
      });

      this.logger.log(
        `Multipart upload initiated: ${result.key}, chunks: ${totalChunks}, user: ${user.id}`,
      );

      return {
        success: true,
        message: '대용량 파일 업로드가 초기화되었습니다.',
        data: {
          recordId: uploadRecord.id,
          uploadId: result.uploadId,
          key: result.key,
          chunkSize: CHUNK_SIZE,
          totalChunks,
          fileName,
          fileSize,
        },
      };
    } catch (error) {
      this.logger.error(
        `Multipart upload init failed: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * 청크 업로드
   * PUT /api/v1/files/upload/large/chunk
   */
  @Put('upload/large/chunk')
  @UseInterceptors(FileInterceptor('chunk'))
  async uploadChunk(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({
            maxSize: 100 * 1024 * 1024, // 100MB per chunk
            message: '청크 크기는 100MB를 초과할 수 없습니다.',
          }),
        ],
      }),
    )
    chunk: Express.Multer.File,
    @Body('key') key: string,
    @Body('uploadId') uploadId: string,
    @Body('partNumber') partNumber: string,
    @Request() req?: any,
  ) {
    const user: User = req.user;

    try {
      const partNum = parseInt(partNumber);

      if (partNum < 1 || partNum > 10000) {
        throw new Error('Part number must be between 1 and 10000');
      }

      // 업로드 레코드 찾기
      const uploadRecord = await this.crudService.findByUploadId(uploadId);
      if (!uploadRecord) {
        throw new NotFoundException(
          `Upload record not found for uploadId: ${uploadId}`,
        );
      }

      // 사용자 권한 확인
      if (uploadRecord.userId !== user.id) {
        throw new Error('파일 업로드 권한이 없습니다.');
      }

      const result = await this.storageService.uploadPart(
        key,
        uploadId,
        partNum,
        chunk.buffer,
      );

      // 청크 업로드 진행률 업데이트
      await this.crudService.updateChunkProgress(uploadRecord.id, chunk.size);

      this.logger.log(
        `Chunk uploaded: ${key}, part: ${partNum}, user: ${user.id}`,
      );

      return {
        success: true,
        message: `청크 ${partNum}이 성공적으로 업로드되었습니다.`,
        data: {
          partNumber: result.partNumber,
          etag: result.etag,
          chunkSize: chunk.size,
          progress: uploadRecord.progress,
        },
      };
    } catch (error) {
      this.logger.error(`Chunk upload failed: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * 대용량 파일 업로드 완료
   * POST /api/v1/files/upload/large/complete
   */
  @Post('upload/large/complete')
  async completeMultipartUpload(
    @Body('key') key: string,
    @Body('uploadId') uploadId: string,
    @Body('parts') parts: { partNumber: number; etag: string }[],
    @Request() req?: any,
  ) {
    const user: User = req.user;

    try {
      // Parts 검증
      if (!parts || parts.length === 0) {
        throw new Error('업로드할 파트가 없습니다.');
      }

      // 업로드 레코드 찾기
      const uploadRecord = await this.crudService.findByUploadId(uploadId);
      if (!uploadRecord) {
        throw new NotFoundException(
          `Upload record not found for uploadId: ${uploadId}`,
        );
      }

      // 사용자 권한 확인
      if (uploadRecord.userId !== user.id) {
        throw new Error('파일 업로드 권한이 없습니다.');
      }

      // Part number 정렬
      const sortedParts = parts.sort((a, b) => a.partNumber - b.partNumber);

      const result = await this.storageService.completeMultipartUpload(
        key,
        uploadId,
        sortedParts,
      );

      // 업로드 완료 처리
      await this.crudService.markAsCompleted(uploadRecord.id, result.url);

      this.logger.log(
        `Multipart upload completed: ${key}, parts: ${parts.length}, user: ${user.id}`,
      );

      return {
        success: true,
        message: '대용량 파일 업로드가 완료되었습니다.',
        data: {
          recordId: uploadRecord.id,
          key: result.key,
          url: result.url,
          size: result.size,
          contentType: result.contentType,
          etag: result.etag,
          completedAt: new Date().toISOString(),
          totalParts: parts.length,
          uploadDuration: uploadRecord.getUploadDuration(),
          averageSpeed: uploadRecord.getAverageSpeed(),
          uploadedBy: user.id,
        },
      };
    } catch (error) {
      this.logger.error(
        `Multipart upload completion failed: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * 대용량 파일 업로드 취소
   * DELETE /api/v1/files/upload/large/abort
   */
  @Delete('upload/large/abort')
  async abortMultipartUpload(
    @Body('key') key: string,
    @Body('uploadId') uploadId: string,
    @Request() req?: any,
  ) {
    const user: User = req.user;

    try {
      // 업로드 레코드 찾기
      const uploadRecord = await this.crudService.findByUploadId(uploadId);
      if (!uploadRecord) {
        throw new NotFoundException(
          `Upload record not found for uploadId: ${uploadId}`,
        );
      }

      // 사용자 권한 확인
      if (uploadRecord.userId !== user.id) {
        throw new Error('파일 업로드 취소 권한이 없습니다.');
      }

      await this.storageService.abortMultipartUpload(key, uploadId);

      // 업로드 레코드를 취소 상태로 업데이트
      await this.crudService.updateStatus(
        uploadRecord.id,
        uploadRecord.status === 'cancelled'
          ? uploadRecord.status
          : ('cancelled' as any),
      );

      this.logger.log(`Multipart upload aborted: ${key}, user: ${user.id}`);

      return {
        success: true,
        message: '대용량 파일 업로드가 취소되었습니다.',
        data: {
          recordId: uploadRecord.id,
          key,
          uploadId,
          abortedAt: new Date().toISOString(),
        },
      };
    } catch (error) {
      this.logger.error(
        `Multipart upload abort failed: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * 업로드 진행 상황 조회
   * GET /api/v1/files/upload/progress/:recordId
   */
  @Get('upload/progress/:recordId')
  async getUploadProgress(
    @Param('recordId') recordId: string,
    @Request() req?: any,
  ) {
    const user: User = req.user;

    try {
      const uploadRecord = await this.crudService.findById(parseInt(recordId));
      if (!uploadRecord) {
        throw new NotFoundException(`Upload record not found: ${recordId}`);
      }

      // 사용자 권한 확인
      if (uploadRecord.userId !== user.id) {
        throw new Error('업로드 진행 상황 조회 권한이 없습니다.');
      }

      return {
        success: true,
        message: '업로드 진행 상황을 가져왔습니다.',
        data: uploadRecord.getSummary(),
      };
    } catch (error) {
      this.logger.error(
        `Upload progress retrieval failed: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  // 사용자 업로드 목록 조회는 @Crud index 라우트를 사용합니다.
  // GET /api/v1/files?filter[userId_eq]={currentUserId}&filter[status_eq]=completed&page[number]=1&page[size]=20
  // @BeforeCreate/@BeforeUpdate 훅에서 userId 필터링을 자동으로 처리합니다.

  /**
   * 업로드 통계 조회
   * GET /api/v1/files/uploads/stats
   */
  @Get('uploads/stats')
  async getUploadStats(@Request() req?: any) {
    const user: User = req.user;

    try {
      const stats = await this.crudService.getUploadStats(user.id);

      return {
        success: true,
        message: '업로드 통계를 가져왔습니다.',
        data: {
          ...stats,
          // 사용자 친화적인 단위로 변환
          totalSizeMB:
            Math.round((stats.totalSize / (1024 * 1024)) * 100) / 100,
          averageSpeedMBps:
            Math.round((stats.averageSpeed / (1024 * 1024)) * 100) / 100,
        },
      };
    } catch (error) {
      this.logger.error(
        `Upload stats retrieval failed: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * 파일 정보 조회
   * GET /api/v1/files/:key/info
   */
  @Get(':key/info')
  async getFileInfo(@Param('key') key: string) {
    try {
      const fileInfo = await this.storageService.getFileInfo(key);

      if (!fileInfo) {
        return {
          success: false,
          message: '파일을 찾을 수 없습니다.',
          data: null,
        };
      }

      return {
        success: true,
        message: '파일 정보를 가져왔습니다.',
        data: {
          key,
          size: fileInfo.size,
          contentType: fileInfo.contentType,
          lastModified: fileInfo.lastModified,
          metadata: fileInfo.metadata,
        },
      };
    } catch (error) {
      this.logger.error(
        `File info retrieval failed: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * 파일 다운로드 URL 생성
   * GET /api/v1/files/:key/download
   */
  @Get(':key/download')
  async getDownloadUrl(
    @Param('key') key: string,
    @Query('expires') expires?: string,
  ) {
    try {
      const expiresIn = expires ? parseInt(expires) : 3600; // 기본 1시간

      if (expiresIn > 604800) {
        // 최대 7일
        throw new Error('만료 시간은 7일을 초과할 수 없습니다.');
      }

      const downloadUrl = await this.storageService.getDownloadUrl(
        key,
        expiresIn,
      );

      return {
        success: true,
        message: '다운로드 URL이 생성되었습니다.',
        data: {
          key,
          downloadUrl,
          expiresIn,
          expiresAt: new Date(Date.now() + expiresIn * 1000).toISOString(),
        },
      };
    } catch (error) {
      this.logger.error(
        `Download URL generation failed: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * 파일 삭제
   * DELETE /api/v1/files/:key
   */
  @Delete(':key')
  async deleteFile(@Param('key') key: string, @Request() req?: any) {
    const user: User = req.user;

    try {
      // 파일 정보 확인 (권한 체크용)
      const fileInfo = await this.storageService.getFileInfo(key);

      if (!fileInfo) {
        return {
          success: false,
          message: '파일을 찾을 수 없습니다.',
        };
      }

      // 업로더 권한 확인 (메타데이터에서 확인)
      const uploadedBy = fileInfo.metadata?.uploadedBy;
      if (uploadedBy && uploadedBy !== user.id.toString()) {
        throw new Error('파일 삭제 권한이 없습니다.');
      }

      await this.storageService.deleteFile(key);

      this.logger.log(`File deleted: ${key}, user: ${user.id}`);

      return {
        success: true,
        message: '파일이 성공적으로 삭제되었습니다.',
        data: {
          key,
          deletedAt: new Date().toISOString(),
          deletedBy: user.id,
        },
      };
    } catch (error) {
      this.logger.error(`File deletion failed: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * 폴더 내 파일 목록 조회
   * GET /api/v1/files/list/:folder
   */
  @Get('list/:folder')
  async listFiles(
    @Param('folder') folder: keyof typeof STORAGE_SETTINGS.folders,
    @Query('maxKeys') maxKeys?: string,
  ) {
    try {
      const limit = maxKeys ? parseInt(maxKeys) : 100;

      if (limit > 1000) {
        throw new Error('최대 조회 개수는 1000개입니다.');
      }

      const files = await this.storageService.listFiles(folder, limit);

      return {
        success: true,
        message: `${folder} 폴더의 파일 목록을 가져왔습니다.`,
        data: {
          folder,
          files,
          count: files.length,
          maxKeys: limit,
        },
      };
    } catch (error) {
      this.logger.error(`File listing failed: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * 스토리지 상태 확인
   * GET /api/v1/files/health
   */
  @Get('health')
  async healthCheck() {
    try {
      const isHealthy = await this.storageService.healthCheck();

      return {
        success: isHealthy,
        message: isHealthy
          ? '스토리지가 정상 작동 중입니다.'
          : '스토리지 연결에 문제가 있습니다.',
        data: {
          status: isHealthy ? 'healthy' : 'unhealthy',
          timestamp: new Date().toISOString(),
        },
      };
    } catch (error) {
      this.logger.error(
        `Storage health check failed: ${error.message}`,
        error.stack,
      );

      return {
        success: false,
        message: '스토리지 상태 확인에 실패했습니다.',
        data: {
          status: 'error',
          error: error.message,
          timestamp: new Date().toISOString(),
        },
      };
    }
  }
}
