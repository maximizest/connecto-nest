# Connecto NestJS Backend

NestJS 기반의 실시간 채팅 및 여행 그룹 관리 백엔드 서비스입니다.

## 📋 목차
- [기술 스택](#기술-스택)
- [프로젝트 구조](#프로젝트-구조)
- [모듈별 상세 설명](#모듈별-상세-설명)
- [API 엔드포인트](#api-엔드포인트)
- [설치 및 실행](#설치-및-실행)

## 🛠 기술 스택

- **Framework**: NestJS 11.x
- **Language**: TypeScript 5.7.x
- **Database**: PostgreSQL with TypeORM
- **Cache**: Redis
- **Real-time**: WebSocket (Socket.io)
- **Storage**: Cloudflare R2
- **Authentication**: JWT with Google/Apple social login
- **Video Processing**: FFmpeg with HLS streaming

## 📁 프로젝트 구조

```
src/modules/
├── admin/              # 관리자 인증 및 관리
├── auth/               # 사용자 인증 (JWT, 소셜 로그인)
├── cache/              # Redis 캐싱 관리
├── file-upload/        # 파일 업로드 (청크 방식)
├── message/            # 채팅 메시지 관리
├── notification/       # 알림 시스템 (FCM, Email, SMS)
├── planet/             # 채팅방 관리
├── planet-user/        # 채팅방 멤버십 관리
├── profile/            # 사용자 프로필 관리
├── read-receipt/       # 메시지 읽음 확인
├── scheduler/          # 백그라운드 작업 스케줄링
├── schema/             # 데이터베이스 스키마 API (개발용)
├── storage/            # 통합 파일 스토리지 관리
├── streaming/          # HLS 비디오/오디오 스트리밍
├── travel/             # 여행 그룹 관리
├── travel-user/        # 여행 그룹 멤버십 관리
├── user/               # 사용자 계정 관리
├── video-processing/   # 비디오 인코딩 및 썸네일 생성
└── websocket/          # WebSocket 실시간 통신
```

## 📚 모듈별 상세 설명

### 1. 🔐 Admin Module (`/admin`)
**역할**: 시스템 관리자 인증 및 관리 기능 제공

**주요 기능**:
- 관리자 계정 관리 (bcrypt 암호화)
- 관리자 권한 레벨 관리
- 시스템 관리 작업 수행

**API 엔드포인트**:
- `POST /api/v1/admin/login` - 관리자 로그인
- `POST /api/v1/admin/logout` - 관리자 로그아웃
- `GET /api/v1/admin/profile` - 관리자 프로필 조회

### 2. 🔑 Auth Module (`/auth`)
**역할**: 사용자 인증 및 토큰 관리

**주요 기능**:
- JWT 기반 인증
- Google/Apple 소셜 로그인
- 토큰 갱신 및 검증
- 계정 삭제

**API 엔드포인트**:
- `POST /api/v1/auth/signin` - 소셜 로그인
- `POST /api/v1/auth/refresh` - 토큰 갱신
- `POST /api/v1/auth/signout` - 로그아웃
- `DELETE /api/v1/auth/account` - 계정 삭제

### 3. 💾 Cache Module (`/cache`)
**역할**: Redis 기반 캐싱 시스템 관리

**주요 기능**:
- 타이핑 인디케이터 관리
- WebSocket 브로드캐스트 지원
- 캐시 TTL 전략 구현

### 4. 📤 File Upload Module (`/file-upload`)
**역할**: 대용량 파일 청크 업로드 관리

**주요 기능**:
- 5MB 단위 청크 업로드
- 최대 500MB 파일 지원
- Cloudflare R2 저장소 연동
- 파일 보안 검증

**API 엔드포인트**:
- `POST /api/v1/file-upload/start` - 업로드 세션 시작
- `POST /api/v1/file-upload/chunk` - 청크 업로드
- `POST /api/v1/file-upload/complete` - 업로드 완료
- `DELETE /api/v1/file-upload/:id` - 파일 삭제

### 5. 💬 Message Module (`/message`)
**역할**: 채팅 메시지 관리 및 페이지네이션

**주요 기능**:
- 텍스트/이미지/비디오/파일 메시지 지원
- 메시지 페이지네이션
- 시스템 메시지 처리
- 메시지 검색

**API 엔드포인트**:
- `GET /api/v1/messages` - 메시지 목록 조회
- `GET /api/v1/messages/:id` - 메시지 상세 조회
- `POST /api/v1/messages` - 메시지 생성
- `PUT /api/v1/messages/:id` - 메시지 수정
- `DELETE /api/v1/messages/:id` - 메시지 삭제

### 6. 🔔 Notification Module (`/notification`)
**역할**: 멀티채널 알림 시스템

**주요 기능**:
- FCM 푸시 알림
- 이메일 알림 (SendGrid)
- SMS 알림 (Twilio)
- 알림 설정 관리

**API 엔드포인트**:
- `POST /api/v1/notifications/send` - 알림 발송
- `GET /api/v1/notifications/settings` - 알림 설정 조회
- `PUT /api/v1/notifications/settings` - 알림 설정 수정

### 7. 🌍 Planet Module (`/planet`)
**역할**: 채팅방(Planet) 관리

**주요 기능**:
- 그룹/다이렉트 채팅방 생성
- 채팅방 설정 관리
- 멤버 수 추적
- 채팅방 활성화/비활성화

**API 엔드포인트**:
- `GET /api/v1/planets` - 채팅방 목록 조회
- `GET /api/v1/planets/:id` - 채팅방 상세 조회
- `POST /api/v1/planets` - 채팅방 생성
- `PUT /api/v1/planets/:id` - 채팅방 수정
- `DELETE /api/v1/planets/:id` - 채팅방 삭제

### 8. 👥 Planet User Module (`/planet-user`)
**역할**: 채팅방 멤버십 관리

**주요 기능**:
- 채팅방 참여/퇴장
- 역할 관리 (HOST/MODERATOR/PARTICIPANT)
- 음소거 기능
- 멤버 권한 관리

**API 엔드포인트**:
- `GET /api/v1/planet-users` - 멤버 목록 조회
- `POST /api/v1/planet-users` - 채팅방 참여
- `PUT /api/v1/planet-users/:id` - 멤버 정보 수정
- `DELETE /api/v1/planet-users/:id` - 채팅방 퇴장

### 9. 👤 Profile Module (`/profile`)
**역할**: 사용자 상세 프로필 관리

**주요 기능**:
- 프로필 정보 관리 (1:1 User 관계)
- 생년월일, 성별 등 추가 정보
- 프로필 사진 관리

**API 엔드포인트**:
- `GET /api/v1/profiles` - 프로필 목록 조회
- `GET /api/v1/profiles/:id` - 프로필 상세 조회
- `PUT /api/v1/profiles/:id` - 프로필 수정

### 10. ✅ Read Receipt Module (`/read-receipt`)
**역할**: 메시지 읽음 상태 추적

**주요 기능**:
- 메시지별 읽음 상태 기록
- 읽은 시간 추적
- 채팅방별 읽음 통계

**API 엔드포인트**:
- `POST /api/v1/read-receipts/mark` - 메시지 읽음 표시
- `GET /api/v1/read-receipts/status` - 읽음 상태 조회

### 11. ⏰ Scheduler Module (`/scheduler`)
**역할**: 백그라운드 작업 스케줄링

**주요 기능**:
- 정기적 데이터 정리
- 캐시 갱신
- 시스템 최적화 작업
- 만료된 데이터 처리

**API 엔드포인트** (개발 환경):
- `POST /api/v1/scheduler/trigger` - 수동 작업 트리거
- `GET /api/v1/scheduler/jobs` - 작업 목록 조회

### 12. 🗂 Schema Module (`/schema`)
**역할**: 데이터베이스 스키마 정보 제공 (개발용)

**주요 기능**:
- 엔티티 스키마 조회
- 관계 정보 제공
- 개발 환경에서만 활성화

**API 엔드포인트**:
- `GET /api/v1/schema` - 전체 스키마 조회
- `GET /api/v1/schema/:entity` - 특정 엔티티 스키마 조회

### 13. 🎬 Streaming Module (`/streaming`)
**역할**: HLS 비디오/오디오 스트리밍

**주요 기능**:
- HLS 프로토콜 지원
- 적응형 비트레이트 스트리밍
- 세그먼트 캐싱
- 스트리밍 세션 관리

**API 엔드포인트**:
- `GET /api/v1/streaming/:key/master.m3u8` - 마스터 플레이리스트
- `GET /api/v1/streaming/:key/:quality/playlist.m3u8` - 품질별 플레이리스트
- `GET /api/v1/streaming/:key/:quality/:segment` - 세그먼트 스트리밍

### 14. ✈️ Travel Module (`/travel`)
**역할**: 여행 그룹 관리

**주요 기능**:
- 여행 그룹 생성/관리
- 초대 코드 생성
- 멤버 수 제한 관리
- 여행 기간 설정

**API 엔드포인트**:
- `GET /api/v1/travels` - 여행 목록 조회
- `GET /api/v1/travels/:id` - 여행 상세 조회
- `POST /api/v1/travels` - 여행 생성 (관리자)
- `PUT /api/v1/travels/:id` - 여행 수정 (관리자)

### 15. 🧳 Travel User Module (`/travel-user`)
**역할**: 여행 그룹 멤버십 관리

**주요 기능**:
- 초대 코드로 여행 참여
- 역할 관리 (HOST/PARTICIPANT)
- 자동 그룹 채팅방 참여
- 멤버 상태 관리

**API 엔드포인트**:
- `GET /api/v1/travel-users` - 멤버 목록 조회
- `GET /api/v1/travel-users/:id` - 멤버 상세 조회
- `POST /api/v1/travel-users` - 여행 참여 (초대 코드 필수)

### 16. 👤 User Module (`/user`)
**역할**: 사용자 계정 관리

**주요 기능**:
- 사용자 정보 관리
- 온라인 상태 추적
- 사용자 설정 관리
- 차단 상태 관리

**API 엔드포인트**:
- `GET /api/v1/users` - 사용자 목록 조회
- `GET /api/v1/users/:id` - 사용자 상세 조회
- `PUT /api/v1/users/:id` - 사용자 정보 수정

### 17. 🎥 Video Processing Module (`/video-processing`)
**역할**: 비디오 처리 및 변환

**주요 기능**:
- 비디오 압축 (다양한 품질 프로필)
- 썸네일 자동 추출
- 메타데이터 추출
- 진행률 실시간 추적

**API 엔드포인트**:
- `POST /api/v1/video-processing/process` - 비디오 처리 시작
- `POST /api/v1/video-processing/compress` - 비디오 압축
- `POST /api/v1/video-processing/thumbnails` - 썸네일 추출
- `GET /api/v1/video-processing/progress/:jobId` - 처리 진행률 조회
- `GET /api/v1/video-processing/my/jobs` - 내 처리 작업 목록
- `DELETE /api/v1/video-processing/:jobId/cancel` - 처리 취소
- `POST /api/v1/video-processing/:jobId/retry` - 처리 재시도

### 18. 🔌 WebSocket Module (`/websocket`)
**역할**: 실시간 통신 게이트웨이

**주요 기능**:
- JWT 기반 WebSocket 인증
- 실시간 메시지 전송
- 타이핑 인디케이터
- 온라인 상태 브로드캐스트
- 멀티 디바이스 지원

**WebSocket 이벤트**:
- `connection` - 연결 수립
- `disconnect` - 연결 종료
- `message:send` - 메시지 전송
- `message:receive` - 메시지 수신
- `typing:start` - 타이핑 시작
- `typing:stop` - 타이핑 종료
- `presence:update` - 온라인 상태 업데이트

## 🏗 데이터베이스 구조

### 주요 엔티티 관계
```
User (사용자)
├── Profile (1:1)
├── TravelUser (1:N) - 여행 멤버십
├── PlanetUser (1:N) - 채팅방 멤버십
└── Message (1:N) - 메시지

Travel (여행 그룹)
├── TravelUser (1:N) - 멤버
└── Planet (1:N) - 채팅방

Planet (채팅방)
├── PlanetUser (1:N) - 멤버
└── Message (1:N) - 메시지
    └── ReadReceipt (1:N) - 읽음 확인
```

## 🚀 설치 및 실행

### 필수 요구사항
- Node.js >= 20.0.0
- PostgreSQL
- Redis
- FFmpeg (비디오 처리용)

### 환경 변수 설정
```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/connecto

# JWT
JWT_SECRET=your-32-character-secret-key
JWT_EXPIRES_IN=7d

# Redis
REDIS_URL=redis://localhost:6379

# Cloudflare R2
CLOUDFLARE_R2_ACCOUNT_ID=your-account-id
CLOUDFLARE_R2_ACCESS_KEY_ID=your-access-key
CLOUDFLARE_R2_SECRET_ACCESS_KEY=your-secret-key
CLOUDFLARE_R2_BUCKET_NAME=your-bucket

# Social Login
GOOGLE_CLIENT_ID=your-google-client-id
APPLE_CLIENT_ID=your-apple-client-id

# Notification Services (Optional)
FCM_SERVER_KEY=your-fcm-key
SENDGRID_API_KEY=your-sendgrid-key
TWILIO_ACCOUNT_SID=your-twilio-sid
TWILIO_AUTH_TOKEN=your-twilio-token
```

### 설치 및 실행 명령어
```bash
# 의존성 설치
yarn install

# 데이터베이스 마이그레이션
yarn migration:run

# 개발 서버 실행
yarn dev

# 프로덕션 빌드
yarn build

# 프로덕션 서버 실행
yarn start:prod

# 테스트 실행
yarn test
yarn test:e2e
yarn test:cov

# 린트 실행
yarn lint
```

## 📝 API 문서

API 문서는 E2E 테스트에서 자동 생성됩니다:
```bash
yarn test:docs
```

생성된 문서는 `/api-docs` 엔드포인트에서 확인할 수 있습니다.

## 🔒 보안 고려사항

- 모든 API는 JWT 인증 필요 (`AuthGuard`)
- CRUD 작업에 세밀한 권한 제어
- 민감한 데이터 필드는 `@Exclude()` 데코레이터로 보호
- 환경 변수로 모든 시크릿 관리
- 파일 업로드 시 보안 검증
- WebSocket 연결 시 JWT 검증

## 🤝 기여 가이드

1. 모든 새 기능은 별도 모듈로 구현
2. Entity-First CRUD 패턴 준수
3. 상대 경로 import 사용
4. yarn 패키지 매니저 사용 (npm 금지)
5. 테스트 작성 필수

## 📄 라이선스

이 프로젝트는 비공개 소유입니다.