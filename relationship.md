# Module Relationships

## 모듈 계층 구조

```
AppModule (루트)
├── 인프라 모듈
│   ├── ConfigModule (global)
│   ├── JwtModule (global)
│   ├── TypeOrmModule
│   ├── ScheduleModule
│   ├── RedisModule
│   ├── CacheModule
│   └── StorageModule
│
├── 인증/사용자 모듈
│   ├── AdminModule
│   ├── AuthModule
│   ├── UserModule
│   └── ProfileModule
│
├── 핵심 비즈니스 모듈
│   ├── TravelModule
│   ├── TravelUserModule
│   ├── PlanetModule
│   ├── PlanetUserModule
│   ├── MessageModule
│   └── ReadReceiptModule
│
├── 파일/미디어 모듈
│   ├── FileUploadModule
│   └── VideoProcessingModule
│
├── 실시간/알림 모듈
│   ├── WebSocketModule
│   └── NotificationModule
│
└── 유틸리티 모듈
    ├── SchedulerModule
    └── SchemaModule (개발 환경)
```

## 모듈 의존성 관계

### 1. 인프라 계층

#### RedisModule
- **독립 모듈**
- **사용처**: CacheModule, WebSocketModule

#### CacheModule
- **의존**: RedisModule
- **사용처**: ReadReceiptModule, SchedulerModule

#### StorageModule
- **독립 모듈**
- **사용처**: FileUploadModule, VideoProcessingModule, SchedulerModule

### 2. 인증/사용자 계층

#### AdminModule
- **Entity**: Admin
- **독립 모듈**
- **기능**: 관리자 인증 및 관리

#### AuthModule
- **Entity**: User, Profile
- **기능**: JWT 인증, 소셜 로그인
- **특징**: Profile 자동 생성

#### UserModule
- **Entity**: User, Profile
- **기능**: 사용자 관리
- **관계**: Profile과 1:1 관계

#### ProfileModule
- **Entity**: Profile
- **독립 모듈**
- **관계**: User와 1:1 관계

### 3. 핵심 비즈니스 계층

#### TravelModule
- **Entity**: Travel, Planet, User, TravelUser
- **기능**: 여행 그룹 관리
- **관계**: 
  - Travel → Planet (1:N)
  - Travel → TravelUser (1:N)

#### TravelUserModule
- **Entity**: TravelUser, Travel, Planet, PlanetUser, User
- **기능**: 여행 멤버십 관리
- **관계**: Travel과 User의 M:N 관계 관리

#### PlanetModule
- **Entity**: Planet, Travel, User, TravelUser, PlanetUser
- **기능**: 채팅방 관리
- **관계**:
  - Planet → Travel (N:1)
  - Planet → PlanetUser (1:N)

#### PlanetUserModule
- **Entity**: PlanetUser, Planet, User
- **기능**: 채팅방 멤버십 관리
- **관계**: Planet과 User의 M:N 관계 관리

#### MessageModule
- **Entity**: Message, Planet, Travel, User, PlanetUser, MessageReadReceipt
- **의존**: CacheModule
- **기능**: 메시지 CRUD
- **관계**: Message → Planet (N:1)

#### ReadReceiptModule
- **Entity**: MessageReadReceipt, Message, Planet, User
- **의존**: CacheModule
- **기능**: 메시지 읽음 상태 관리
- **관계**: MessageReadReceipt → Message (N:1)

### 4. 파일/미디어 계층

#### FileUploadModule
- **Entity**: FileUpload, User
- **의존**: StorageModule, VideoProcessingModule (순환 의존성 - forwardRef)
- **기능**: 파일 업로드, 자동 비디오/이미지 처리
- **이벤트**: 
  - video.processing.start 발행
  - image.optimization.start 발행

#### VideoProcessingModule
- **Entity**: VideoProcessing
- **의존**: StorageModule, FileUploadModule (순환 의존성 - forwardRef)
- **기능**: 비디오 압축, 썸네일 생성
- **이벤트**: video.processing.start 구독

### 5. 실시간/알림 계층

#### WebSocketModule
- **Entity**: User, Travel, Planet, Message, MessageReadReceipt, Notification, TravelUser, PlanetUser
- **의존**: RedisModule, ReadReceiptModule, NotificationModule
- **추가 의존**: JwtModule, ThrottlerModule
- **기능**: 실시간 메시징, 타이핑 인디케이터, 알림
- **서비스**:
  - ChatGateway
  - WebSocketRoomService
  - WebSocketBroadcastService
  - RateLimitService
  - TypingIndicatorService

#### NotificationModule
- **Entity**: Notification, User, Travel, Planet
- **기능**: 푸시 알림, 이메일, SMS
- **서비스**:
  - NotificationService
  - PushNotificationService

### 6. 유틸리티 계층

#### SchedulerModule
- **Entity**: FileUpload, VideoProcessing
- **의존**: CacheModule, StorageService
- **기능**: 백그라운드 작업, 정기 정리

#### SchemaModule (개발 환경 전용)
- **기능**: 데이터베이스 스키마 API
- **특징**: 프로덕션에서 비활성화

## 순환 의존성

### FileUploadModule ↔ VideoProcessingModule
- **해결**: forwardRef() 사용
- **이유**: 
  - FileUpload는 비디오 자동 처리를 위해 VideoProcessing 필요
  - VideoProcessing은 처리 완료 후 FileUpload 업데이트 필요

## 이벤트 기반 통신

### EventEmitter2 이벤트
1. **video.processing.start**
   - 발행: FileUploadModule
   - 구독: VideoProcessingModule
   - 데이터: fileUploadId, storageKey, qualityProfile

2. **image.optimization.start**
   - 발행: FileUploadModule
   - 구독: (향후 ImageProcessingModule)
   - 데이터: fileUploadId, storageKey, metadata

3. **message.created**
   - 발행: WebSocketModule
   - 구독: CacheModule (캐시 업데이트)
   - 데이터: messageId, planetId, message

4. **notification.websocket**
   - 발행: NotificationModule
   - 구독: WebSocketModule
   - 데이터: userId, event, data

## 데이터 흐름

### 메시지 전송 플로우
```
Client → WebSocket → Message → Database
                  ↓
            ReadReceipt
                  ↓
            Notification → Push/Email/SMS
```

### 파일 업로드 플로우
```
Client → FileUpload → Storage (R2)
              ↓
        VideoProcessing (비디오인 경우)
              ↓
        Optimized File → Storage
```

### 인증 플로우
```
Social Provider → Auth → User 생성
                       ↓
                  Profile 자동 생성
```

## 주요 엔티티 관계

```
User (사용자)
 ├── Profile (1:1)
 ├── TravelUser (1:N) → Travel
 ├── PlanetUser (1:N) → Planet
 ├── Message (1:N)
 ├── MessageReadReceipt (1:N)
 ├── FileUpload (1:N)
 └── Notification (1:N)

Travel (여행 그룹)
 ├── Planet (1:N)
 └── TravelUser (1:N) → User

Planet (채팅방)
 ├── Travel (N:1)
 ├── PlanetUser (1:N) → User
 └── Message (1:N)
     └── MessageReadReceipt (1:N) → User
```

## 보안 및 권한

### Guard 계층
1. **AuthGuard**: JWT 토큰 검증
2. **AdminGuard**: 관리자 권한 확인
3. **WebSocketAuthGuard**: WebSocket 연결 인증
4. **WebSocketRateLimitGuard**: WebSocket Rate Limiting

### Rate Limiting
- 메시지 전송: 10초당 10개
- 파일 업로드: 별도 제한
- 룸 참여: 빈도 제한
- 타이핑: 빈도 제한

## 캐싱 전략

### Redis 기반 캐싱
- 타이핑 인디케이터: 실시간 상태
- 룸 정보: 참여자 목록
- 읽음 상태: 빠른 조회
- 온라인 상태: (제거됨)

## 모듈 특징

### Global 모듈
- ConfigModule: 환경 변수 전역 접근
- JwtModule: JWT 토큰 전역 사용

### 독립 실행 가능 모듈
- AdminModule
- ProfileModule
- StorageModule
- RedisModule

### 강한 의존성 모듈
- MessageModule (Planet, User 필수)
- TravelUserModule (Travel, User 필수)
- PlanetUserModule (Planet, User 필수)

## 확장 포인트

### 향후 추가 가능 모듈
1. **ImageProcessingModule**: 이미지 최적화 전용
2. **EmailModule**: 이메일 발송 전용
3. **SMSModule**: SMS 발송 전용
4. **AnalyticsModule**: 사용 통계 분석
5. **ReportModule**: 신고 관리
6. **BlockModule**: 차단 관리
