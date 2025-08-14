# 커스텀 라우트 문서

이 문서는 `@foryourdev/nestjs-crud` 데코레이터 패턴을 사용하지 않고 구현된 모든 커스텀 라우트를 정리합니다.

## 📋 개요

이 프로젝트의 대부분 CRUD 작업은 표준화된 `@foryourdev/nestjs-crud` 패턴을 사용하지만, 특정 비즈니스 로직, 복잡한 작업, 또는 특별한 인증 플로우를 위해 커스텀 구현이 필요한 엔드포인트들이 있습니다.

## 🔐 인증 모듈 (`/api/v1/auth`)

### 소셜 로그인
- **POST** `/api/v1/auth/sign/social`
  - **컨트롤러**: `AuthController.signSocial()`
  - **목적**: Google/Apple 소셜 로그인 처리 및 JWT 토큰 생성
  - **요청 본문**: `SocialSigninDto` (provider, accessToken, appleUser?)
  - **응답**: JWT 토큰 및 사용자 정보
  - **인증 필요**: 아니오

### 토큰 새로고침
- **POST** `/api/v1/auth/sign/refresh`
  - **컨트롤러**: `AuthController.refreshToken()`
  - **목적**: 리프레시 토큰을 사용한 액세스 토큰 갱신
  - **요청 헤더**: Authorization Bearer 토큰
  - **응답**: 새로운 액세스 및 리프레시 토큰
  - **인증 필요**: 아니오

### 로그아웃
- **POST** `/api/v1/auth/sign/out`
  - **컨트롤러**: `AuthController.signOut()`
  - **목적**: 사용자 로그아웃 및 토큰 무효화
  - **요청 헤더**: Authorization Bearer 토큰
  - **응답**: 성공 확인
  - **인증 필요**: 예

## 📁 파일 업로드 모듈 (`/api/v1/file-uploads`)

### Presigned URL 생성
- **POST** `/api/v1/file-uploads/presigned-url`
  - **컨트롤러**: `FileUploadController.generatePresignedUrl()`
  - **목적**: 다이렉트 업로드를 위한 Cloudflare R2 presigned URL 생성
  - **요청 본문**: `CreatePresignedUrlDto` (filename, contentType, fileSize, folder?, metadata?)
  - **응답**: Presigned 업로드 URL, 키, 공개 URL
  - **인증 필요**: 예

### 업로드 완료
- **POST** `/api/v1/file-uploads/complete`
  - **컨트롤러**: `FileUploadController.completeUpload()`
  - **목적**: 다이렉트 업로드 성공 확인 및 파일 메타데이터 저장
  - **요청 본문**: `CompleteUploadDto` (key, filename, contentType, fileSize, publicUrl, folder?, metadata?)
  - **응답**: 저장된 메타데이터가 포함된 FileUpload 엔티티
  - **인증 필요**: 예

### 스트리밍 URL 가져오기
- **GET** `/api/v1/file-uploads/:id/stream`
  - **컨트롤러**: `FileUploadController.getStreamingUrl()`
  - **목적**: 비디오 파일을 위한 HTTP Range 지원 스트리밍 URL 가져오기
  - **파라미터**: 파일 업로드 ID
  - **응답**: 비디오 재생용 스트리밍 URL
  - **인증 필요**: 예

### 다운로드 URL 가져오기
- **GET** `/api/v1/file-uploads/:id/download-url`
  - **컨트롤러**: `FileUploadController.getDownloadUrl()`
  - **목적**: 임시 서명된 다운로드 URL 생성
  - **쿼리**: `expiresIn` (선택사항, 기본값 3600초)
  - **응답**: 임시 다운로드 URL
  - **인증 필요**: 예

### 파일 삭제
- **DELETE** `/api/v1/file-uploads/:id`
  - **컨트롤러**: `FileUploadController.deleteFile()`
  - **목적**: 스토리지 및 데이터베이스에서 파일 삭제
  - **파라미터**: 파일 업로드 ID
  - **응답**: 성공 확인
  - **인증 필요**: 예

## 🎥 비디오 프로세싱 모듈 (`/api/v1/video-processing`)

### 프로세싱 시작
- **POST** `/api/v1/video-processing/process`
  - **컨트롤러**: `VideoProcessingController.startVideoProcessing()`
  - **목적**: 일반 비디오 프로세싱 작업 시작
  - **요청 본문**: 프로세싱 설정
  - **응답**: 프로세싱 작업 상세 정보
  - **인증 필요**: 예

### 비디오 압축
- **POST** `/api/v1/video-processing/compress`
  - **컨트롤러**: `VideoProcessingController.compressVideo()`
  - **목적**: 비디오 압축 작업 시작
  - **요청 본문**: inputStorageKey, qualityProfile, originalFileName, fileSize, fileUploadId
  - **응답**: 압축 작업 상세 정보
  - **인증 필요**: 예

### 썸네일 추출
- **POST** `/api/v1/video-processing/thumbnails`
  - **컨트롤러**: `VideoProcessingController.extractThumbnails()`
  - **목적**: 비디오 썸네일 추출
  - **요청 본문**: inputStorageKey, originalFileName, fileSize, fileUploadId
  - **응답**: 썸네일 추출 작업 상세 정보
  - **인증 필요**: 예

### 전체 프로세싱
- **POST** `/api/v1/video-processing/full`
  - **컨트롤러**: `VideoProcessingController.fullProcessing()`
  - **목적**: 비디오 압축 및 썸네일 추출
  - **요청 본문**: inputStorageKey, qualityProfile, originalFileName, fileSize, fileUploadId
  - **응답**: 전체 프로세싱 작업 상세 정보
  - **인증 필요**: 예

### 프로세싱 진행률 가져오기
- **GET** `/api/v1/video-processing/progress/:jobId`
  - **컨트롤러**: `VideoProcessingController.getProcessingProgress()`
  - **목적**: 실시간 프로세싱 진행률 확인
  - **파라미터**: 작업 ID
  - **응답**: 진행률 퍼센트 및 상태
  - **인증 필요**: 예

### 프로세싱 작업 가져오기
- **GET** `/api/v1/video-processing/:jobId`
  - **컨트롤러**: `VideoProcessingController.getProcessingJob()`
  - **목적**: 프로세싱 작업 상세 정보 가져오기
  - **파라미터**: 작업 ID
  - **응답**: 전체 작업 정보
  - **인증 필요**: 예

### 내 프로세싱 작업 목록
- **GET** `/api/v1/video-processing/my/jobs`
  - **컨트롤러**: `VideoProcessingController.getMyProcessingJobs()`
  - **목적**: 사용자의 프로세싱 작업 목록 조회
  - **쿼리**: status?, processingType?, limit?, offset?
  - **응답**: 사용자의 프로세싱 작업 목록
  - **인증 필요**: 예

### 프로세싱 취소
- **DELETE** `/api/v1/video-processing/:jobId/cancel`
  - **컨트롤러**: `VideoProcessingController.cancelProcessing()`
  - **목적**: 진행 중인 프로세싱 작업 취소
  - **파라미터**: 작업 ID
  - **응답**: 취소 확인
  - **인증 필요**: 예

### 프로세싱 재시도
- **POST** `/api/v1/video-processing/:jobId/retry`
  - **컨트롤러**: `VideoProcessingController.retryProcessing()`
  - **목적**: 실패한 프로세싱 작업 재시도
  - **파라미터**: 작업 ID
  - **응답**: 새로운 프로세싱 시도 상태
  - **인증 필요**: 예

### 품질 프로필 가져오기
- **GET** `/api/v1/video-processing/quality-profiles`
  - **컨트롤러**: `VideoProcessingController.getQualityProfiles()`
  - **목적**: 사용 가능한 비디오 품질 프로필 조회
  - **응답**: 설정이 포함된 품질 프로필 목록
  - **인증 필요**: 아니오

### 출력 크기 예측
- **POST** `/api/v1/video-processing/estimate-size`
  - **컨트롤러**: `VideoProcessingController.estimateOutputSize()`
  - **목적**: 압축된 비디오 크기 예측
  - **요청 본문**: inputSizeMB, qualityProfile
  - **응답**: 예상 출력 크기
  - **인증 필요**: 아니오

## 📖 읽음 확인 모듈 (`/api/v1/read-receipts`)

### 메시지 읽음 표시
- **POST** `/api/v1/read-receipts/mark-read`
  - **컨트롤러**: `ReadReceiptController.markMessageAsRead()`
  - **목적**: 단일 메시지를 읽음으로 표시
  - **요청 본문**: messageId
  - **응답**: 읽음 확인 정보
  - **인증 필요**: 예

### 여러 메시지 읽음 표시
- **POST** `/api/v1/read-receipts/mark-multiple-read`
  - **컨트롤러**: `ReadReceiptController.markMultipleMessagesAsRead()`
  - **목적**: 여러 메시지를 읽음으로 표시
  - **요청 본문**: messageIds[]
  - **응답**: 처리된 읽음 확인 수
  - **인증 필요**: 예

### Planet의 모든 메시지 읽음 표시
- **POST** `/api/v1/read-receipts/mark-all-read/:planetId`
  - **컨트롤러**: `ReadReceiptController.markAllMessagesAsReadInPlanet()`
  - **목적**: Planet의 모든 메시지를 읽음으로 표시
  - **파라미터**: planetId
  - **응답**: 처리된 메시지 수
  - **인증 필요**: 예

### Planet의 읽지 않은 메시지 수
- **GET** `/api/v1/read-receipts/unread-count/:planetId`
  - **컨트롤러**: `ReadReceiptController.getUnreadCountInPlanet()`
  - **목적**: Planet의 읽지 않은 메시지 수 조회
  - **파라미터**: planetId
  - **응답**: `{ count: number }`
  - **인증 필요**: 예

### 내 전체 읽지 않은 메시지 수
- **GET** `/api/v1/read-receipts/unread-counts/my`
  - **컨트롤러**: `ReadReceiptController.getMyUnreadCounts()`
  - **목적**: 모든 Planet의 읽지 않은 메시지 수 조회
  - **응답**: Planet별 읽지 않은 메시지 수 목록
  - **인증 필요**: 예

## 🗂️ 스키마 모듈 (`/api/v1/schema`) - 개발 환경 전용

### 데이터베이스 스키마 가져오기
- **GET** `/api/v1/schema`
  - **컨트롤러**: `SchemaController.getSchema()`
  - **목적**: 전체 데이터베이스 스키마 정보 조회
  - **응답**: 테이블, 컬럼, 관계, 인덱스 정보
  - **인증 필요**: 아니오
  - **환경**: 개발 환경 전용

### 엔티티 관계 가져오기
- **GET** `/api/v1/schema/relations`
  - **컨트롤러**: `SchemaController.getRelations()`
  - **목적**: 모든 엔티티 관계 다이어그램 조회
  - **응답**: 엔티티 관계 매핑
  - **인증 필요**: 아니오
  - **환경**: 개발 환경 전용

### 테이블 상세 정보
- **GET** `/api/v1/schema/tables/:tableName`
  - **컨트롤러**: `SchemaController.getTableDetails()`
  - **목적**: 특정 테이블의 상세 정보 조회
  - **파라미터**: 테이블 이름
  - **응답**: 컬럼, 인덱스, 외래 키 정보
  - **인증 필요**: 아니오
  - **환경**: 개발 환경 전용

### 엔티티 목록
- **GET** `/api/v1/schema/entities`
  - **컨트롤러**: `SchemaController.getEntities()`
  - **목적**: 모든 엔티티 목록 조회
  - **응답**: 엔티티 이름 및 설명 목록
  - **인증 필요**: 아니오
  - **환경**: 개발 환경 전용

### 엔티티 상세 정보
- **GET** `/api/v1/schema/entities/:entityName`
  - **컨트롤러**: `SchemaController.getEntityDetails()`
  - **목적**: 특정 엔티티의 상세 정보 조회
  - **파라미터**: 엔티티 이름
  - **응답**: 컬럼, 관계, 인덱스 정보
  - **인증 필요**: 아니오
  - **환경**: 개발 환경 전용

### 데이터베이스 통계
- **GET** `/api/v1/schema/stats`
  - **컨트롤러**: `SchemaController.getDatabaseStats()`
  - **목적**: 데이터베이스 통계 정보 조회
  - **응답**: 테이블별 레코드 수, 크기 등
  - **인증 필요**: 아니오
  - **환경**: 개발 환경 전용

### API 라우트 목록
- **GET** `/api/v1/schema/routes`
  - **컨트롤러**: `SchemaController.getRoutes()`
  - **목적**: 모든 API 라우트 목록 조회
  - **응답**: 등록된 모든 라우트 정보
  - **인증 필요**: 아니오
  - **환경**: 개발 환경 전용

### 마이그레이션 SQL 생성
- **POST** `/api/v1/schema/generate-migration`
  - **컨트롤러**: `SchemaController.generateMigration()`
  - **목적**: 현재 엔티티로부터 마이그레이션 SQL 생성
  - **응답**: 마이그레이션 SQL 쿼리
  - **인증 필요**: 아니오
  - **환경**: 개발 환경 전용

## ⏰ 스케줄러 모듈 (`/api/v1/scheduler`)

### 스케줄러 상태
- **GET** `/api/v1/scheduler/status`
  - **컨트롤러**: `SchedulerController.getSchedulerStatus()`
  - **목적**: 스케줄러 실행 상태 조회
  - **응답**: 실행 중인 작업, 마지막 실행 시간 등
  - **인증 필요**: 예

### 시스템 헬스 체크
- **GET** `/api/v1/scheduler/health`
  - **컨트롤러**: `SchedulerController.getSystemHealth()`
  - **목적**: 시스템 리소스 및 상태 확인
  - **응답**: CPU, 메모리, 디스크 사용률
  - **인증 필요**: 예

### 작업 히스토리
- **GET** `/api/v1/scheduler/history`
  - **컨트롤러**: `SchedulerController.getTaskHistory()`
  - **목적**: 스케줄러 작업 실행 히스토리 조회
  - **응답**: 최근 실행된 작업 목록
  - **인증 필요**: 예

### 시스템 정보
- **GET** `/api/v1/scheduler/info`
  - **컨트롤러**: `SchedulerController.getSystemInfo()`
  - **목적**: 시스템 환경 정보 조회
  - **응답**: Node.js 버전, OS 정보 등
  - **인증 필요**: 예

### 활성 락 정보
- **GET** `/api/v1/scheduler/locks`
  - **컨트롤러**: `SchedulerController.getActiveLocks()`
  - **목적**: 스케줄러 작업 락 상태 조회
  - **응답**: 현재 활성화된 락 목록
  - **인증 필요**: 예

### 캐시 최적화 (수동 실행)
- **POST** `/api/v1/scheduler/optimize-cache`
  - **컨트롤러**: `SchedulerController.manualOptimizeCache()`
  - **목적**: 캐시 최적화 작업 수동 실행
  - **응답**: 최적화 결과
  - **인증 필요**: 예
  - **환경**: 개발 환경 권장

## 💬 WebSocket 모듈 (실시간 통신)

### WebSocket 게이트웨이 이벤트

#### 연결 관리
- **CONNECTION** `connection`
  - **핸들러**: `WebSocketGateway.handleConnection()`
  - **목적**: WebSocket 연결 인증 및 설정
  - **인증**: 핸드셰이크에 JWT 토큰 필요

- **DISCONNECTION** `disconnect`
  - **핸들러**: `WebSocketGateway.handleDisconnect()`
  - **목적**: 사용자 연결 정리 및 온라인 상태 업데이트

#### 사용자 상태
- **EVENT** `user:online`
  - **핸들러**: `WebSocketGateway.handleUserOnline()`
  - **목적**: 관련 planet에 사용자 온라인 상태 브로드캐스트
  - **페이로드**: 사용자 정보 및 온라인 상태

- **EVENT** `user:offline`
  - **핸들러**: `WebSocketGateway.handleUserOffline()`
  - **목적**: 사용자 오프라인 상태 브로드캐스트
  - **페이로드**: 사용자 ID 및 오프라인 시간

#### 룸 관리
- **EVENT** `join:planet`
  - **핸들러**: `WebSocketGateway.handleJoinPlanet()`
  - **목적**: planet(채팅방) 입장 및 실시간 업데이트 수신
  - **페이로드**: `{ planetId: number }`
  - **응답**: 입장 확인

- **EVENT** `leave:planet`
  - **핸들러**: `WebSocketGateway.handleLeavePlanet()`
  - **목적**: planet 룸 퇴장
  - **페이로드**: `{ planetId: number }`
  - **응답**: 퇴장 확인

#### 메시징
- **EVENT** `message:send`
  - **핸들러**: `WebSocketGateway.handleSendMessage()`
  - **목적**: planet 멤버에게 실시간 메시지 전송
  - **페이로드**: 메시지 내용, 타입, 메타데이터
  - **브로드캐스트**: 모든 planet 멤버

- **EVENT** `message:edit`
  - **핸들러**: `WebSocketGateway.handleEditMessage()`
  - **목적**: 기존 메시지 실시간 수정
  - **페이로드**: `{ messageId: number, content: string }`
  - **브로드캐스트**: planet 멤버에게 수정된 메시지

- **EVENT** `message:delete`
  - **핸들러**: `WebSocketGateway.handleDeleteMessage()`
  - **목적**: 메시지 소프트 삭제
  - **페이로드**: `{ messageId: number }`
  - **브로드캐스트**: planet 멤버에게 삭제 이벤트

- **EVENT** `message:read`
  - **핸들러**: `WebSocketGateway.handleMarkAsRead()`
  - **목적**: 메시지 읽음 표시 및 발신자 알림
  - **페이로드**: `{ messageId: number }`
  - **발신**: 메시지 발신자에게 읽음 확인

#### 타이핑 인디케이터
- **EVENT** `typing:start`
  - **핸들러**: `WebSocketGateway.handleTypingStart()`
  - **목적**: 타이핑 시작 알림
  - **페이로드**: `{ planetId: number }`
  - **브로드캐스트**: planet 멤버

- **EVENT** `typing:stop`
  - **핸들러**: `WebSocketGateway.handleTypingStop()`
  - **목적**: 타이핑 중지 알림
  - **페이로드**: `{ planetId: number }`
  - **브로드캐스트**: planet 멤버

## 📝 참고사항

### 인증
- "인증 필요: 예"로 표시된 모든 엔드포인트는 유효한 JWT Bearer 토큰 필요
- WebSocket 연결은 핸드셰이크 쿼리에서 JWT로 인증
- 소셜 로그인 엔드포인트는 자체 토큰 생성 처리

### 오류 처리
- 모든 커스텀 라우트는 표준화된 오류 응답 구현
- HTTP 상태 코드는 REST 규약 준수
- 개발 환경에서는 디버깅에 유용한 오류 메시지 포함

### 속도 제한
- WebSocket 연결은 사용자별 속도 제한 적용
- 파일 업로드 엔드포인트는 크기 및 빈도 제한
- 비디오 프로세싱은 사용자당 동시 작업 제한

### 개발 vs 프로덕션
- 스키마 엔드포인트는 프로덕션에서 완전히 비활성화
- 스케줄러 수동 트리거는 개발 환경 전용
- 테스트 알림 엔드포인트는 개발 환경으로 제한

## 🔍 빠른 참조

### @foryourdev/nestjs-crud를 사용하지 않는 라우트:
1. **Auth 모듈**: 모든 라우트 (소셜 로그인, 새로고침, 계정 삭제)
2. **File Upload 모듈**: 모든 라우트 (presigned URL, 스트리밍, 삭제)
3. **WebSocket 모듈**: 모든 이벤트 (실시간 메시징)
4. **Video Processing 모듈**: 모든 라우트 (작업 관리)
5. **Read Receipt 모듈**: 모든 라우트 (읽음 확인 관리)
6. **Schema 모듈**: 모든 라우트 (개발 전용)
7. **Scheduler 모듈**: 모든 라우트 (시스템 모니터링)

### @foryourdev/nestjs-crud를 사용하는 표준 CRUD 모듈:
- User, Profile, Admin
- Travel, TravelUser
- Planet, PlanetUser
- Message
- Notification
- (이러한 모듈들도 위에 나열된 추가 커스텀 라우트를 가질 수 있음)