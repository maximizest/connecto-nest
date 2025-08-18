# API Routes Documentation

이 문서는 Connecto NestJS 애플리케이션의 모든 API 라우트와 그 역할 및 기능을 설명합니다.

## Base URL
- API Version: v1
- Base Path: `/api/v1`

---

## 📋 목차

1. [인증 (Auth)](#인증-auth)
2. [파일 업로드 (File Upload)](#파일-업로드-file-upload)
3. [메시지 (Message)](#메시지-message)
4. [알림 (Notification)](#알림-notification)
5. [Planet (채팅방)](#planet-채팅방)
6. [Planet User (채팅방 사용자)](#planet-user-채팅방-사용자)
7. [Profile (프로필)](#profile-프로필)
8. [Read Receipt (읽음 확인)](#read-receipt-읽음-확인)
9. [Travel (여행 그룹)](#travel-여행-그룹)
10. [Travel User (여행 그룹 사용자)](#travel-user-여행-그룹-사용자)
11. [User (사용자)](#user-사용자)
12. [Moderation (관리 및 조정)](#moderation-관리-및-조정)
13. [Admin (관리자)](#admin-관리자)
14. [Schema (스키마)](#schema-스키마)

---

## 인증 (Auth)

### 엔드포인트: `/api/v1/auth`

| Method | Path | 인증 필요 | 역할 | 기능 |
|--------|------|----------|------|------|
| POST | `/sign/social` | ❌ | All | 소셜 로그인 (Google/Apple) - JWT 토큰 발급 |
| POST | `/sign/admin` | ❌ | ADMIN only | 관리자 이메일/비밀번호 로그인 |
| POST | `/sign/refresh` | ❌ | All | 리프레시 토큰으로 액세스 토큰 재발급 |
| POST | `/sign/out` | ✅ | All | 로그아웃 (리프레시 토큰 삭제) |

**주요 기능:**
- 소셜 로그인 지원 (Google, Apple)
- 관리자 전용 이메일/비밀번호 인증
- JWT 기반 인증 시스템
- 자동 프로필 생성
- 푸시 토큰 등록 지원

---

## 파일 업로드 (File Upload)

### 엔드포인트: `/api/v1/file-uploads`

| Method | Path | 인증 필요 | 역할 | 기능 |
|--------|------|----------|------|------|
| GET | `/` | ✅ | All | 파일 목록 조회 (필터링 지원) |
| GET | `/:id` | ✅ | All | 특정 파일 정보 조회 |
| POST | `/` | ✅ | All | 파일 업로드 레코드 생성 |
| DELETE | `/:id` | ✅ | Owner | 파일 삭제 |
| POST | `/presigned-url` | ✅ | All | Cloudflare R2 업로드용 Presigned URL 발급 |
| POST | `/complete` | ✅ | All | Direct Upload 완료 확인 |
| DELETE | `/:id/cancel` | ✅ | Owner | 진행 중인 업로드 취소 |
| GET | `/:id/download-url` | ✅ | Owner | 다운로드 URL 생성 (임시, 최대 24시간) |
| GET | `/:id/stream` | ✅ | Owner | 비디오/오디오 스트리밍 URL 조회 |

**주요 기능:**
- Cloudflare R2 Direct Upload 지원
- 최대 500MB 파일 지원
- 청크 업로드 (5MB 단위)
- 자동 이미지 최적화 (5MB 이상)
- 비디오/오디오 스트리밍 지원
- HTTP Range 요청 지원

**필터링 옵션:**
- `status`, `userId`, `mimeType`, `uploadType`, `folder`, `createdAt`

---

## 메시지 (Message)

### 엔드포인트: `/api/v1/messages`

| Method | Path | 인증 필요 | 역할 | 기능 |
|--------|------|----------|------|------|
| GET | `/` | ✅ | Planet Member | 메시지 목록 조회 (planetId 필터 필수) |
| GET | `/:id` | ✅ | Planet Member | 특정 메시지 조회 |
| POST | `/` | ✅ | Planet Member | 새 메시지 생성 |
| PATCH | `/:id` | ✅ | Sender | 메시지 수정 (15분 이내, 텍스트만) |
| DELETE | `/:id` | ✅ | Sender | 메시지 삭제 (Soft Delete) |
| GET | `/:messageId/context` | ✅ | Planet Member | 특정 메시지 주변 컨텍스트 조회 |

**주요 기능:**
- 메시지 타입: TEXT, IMAGE, VIDEO, FILE, SYSTEM
- 답장 기능 지원
- 메시지 편집 기능 (15분 제한)
- Soft Delete (복구 가능)
- 실시간 이벤트 발생
- 역할 기반 접근 제어
- 시간 제한 채팅 지원

**필터링 옵션:**
- `planetId` (필수), `senderId`, `type`, `status`, `isEdited`, `replyToMessageId`, `createdAt`, `updatedAt`, `searchableText`, `content`

**관계 포함 옵션:**
- `sender`, `planet`, `replyToMessage`, `readReceipts`, `replies`

---

## 알림 (Notification)

### 엔드포인트: `/api/v1/notifications`

| Method | Path | 인증 필요 | 역할 | 기능 |
|--------|------|----------|------|------|
| GET | `/` | ✅ | All | 내 알림 목록 조회 |
| GET | `/:id` | ✅ | Owner | 특정 알림 상세 조회 |
| PATCH | `/:id` | ✅ | Owner | 알림 상태 업데이트 |
| POST | `/push-token` | ✅ | All | 푸시 토큰 등록 |
| POST | `/push-token/unregister` | ✅ | All | 푸시 토큰 해제 |
| GET | `/push-tokens` | ✅ | All | 내 푸시 토큰 목록 조회 |
| POST | `/test` | ✅ | All (Dev only) | 테스트 알림 전송 |

**주요 기능:**
- 알림 타입: MESSAGE, MENTION, REPLY, BANNED, SYSTEM
- 알림 채널: IN_APP, PUSH, EMAIL, SMS
- 우선순위: LOW, NORMAL, HIGH, URGENT
- 상태: PENDING, SENT, DELIVERED, FAILED
- 푸시 토큰 관리 (iOS, Android, Web)
- 멀티 디바이스 지원

**필터링 옵션:**
- `type`, `priority`, `status`, `travelId`, `planetId`, `createdAt`

---

## Planet (채팅방)

### 엔드포인트: `/api/v1/planets`

| Method | Path | 인증 필요 | 역할 | 기능 |
|--------|------|----------|------|------|
| GET | `/` | ✅ | Travel Member | Planet 목록 조회 (travelId 필터 필수) |
| GET | `/:id` | ✅ | Travel Member | Planet 상세 조회 |

**주요 기능:**
- Planet 타입: GROUP (그룹 채팅), DIRECT (1:1 채팅)
- 시간 제한 채팅 지원
- Travel 하위 채팅방 관리
- 사용자는 읽기 전용 (생성/수정/삭제 불가)

**필터링 옵션:**
- `travelId` (필수), `type`, `isActive`, `name`, `createdAt`

**관계 포함 옵션:**
- `travel`, `partner`, `planetUsers`, `planetUsers.user`

---

## Planet User (채팅방 사용자)

### 엔드포인트: `/api/v1/planet-users`

| Method | Path | 인증 필요 | 역할 | 기능 |
|--------|------|----------|------|------|
| GET | `/` | ✅ | Travel Member | Planet 멤버십 목록 조회 |
| GET | `/:id` | ✅ | Travel Member | 특정 Planet 멤버십 조회 |
| PATCH | `/:id` | ✅ | Self | 멤버십 설정 업데이트 (알림 설정) |

**주요 기능:**
- Planet 멤버십 관리
- 상태: ACTIVE, MUTED
- 알림 설정 관리
- 뮤트 기능 (차단 대신 뮤트 사용)

**필터링 옵션:**
- `planetId`, `status`, `joinedAt`

**업데이트 가능 필드:**
- `notificationsEnabled`

---

## Profile (프로필)

### 엔드포인트: `/api/v1/profiles`

| Method | Path | 인증 필요 | 역할 | 기능 |
|--------|------|----------|------|------|
| GET | `/` | ✅ | All | 프로필 목록 조회 |
| GET | `/:id` | ✅ | All | 프로필 상세 조회 |
| POST | `/` | ✅ | All | 프로필 생성 (사용자당 1개) |
| PATCH | `/:id` | ✅ | Owner | 프로필 수정 |

**주요 기능:**
- 사용자당 1개 프로필 제한
- 프로필 정보: 닉네임, 이름, 성별, 나이, 직업
- 밴 된 사용자는 수정 불가
- 공개 프로필 열람 가능

**필터링 옵션:**
- `userId`, `nickname`, `name`, `gender`, `age`, `occupation`, `createdAt`

**업데이트 가능 필드:**
- `nickname`, `name`, `gender`, `age`, `occupation`

---

## Read Receipt (읽음 확인)

### 엔드포인트: `/api/v1/read-receipts`

| Method | Path | 인증 필요 | 역할 | 기능 |
|--------|------|----------|------|------|
| GET | `/` | ✅ | Planet Member | 읽음 확인 목록 조회 |
| GET | `/:id` | ✅ | Planet Member | 특정 읽음 확인 조회 |
| POST | `/` | ✅ | Planet Member | 읽음 확인 생성 |
| POST | `/mark-read` | ✅ | Planet Member | 단일 메시지 읽음 처리 |
| POST | `/mark-multiple-read` | ✅ | Planet Member | 여러 메시지 읽음 처리 |
| POST | `/mark-all-read/:planetId` | ✅ | Planet Member | Planet 전체 메시지 읽음 처리 |
| GET | `/unread-count/:planetId` | ✅ | Planet Member | Planet 읽지 않은 메시지 수 조회 |
| GET | `/unread-counts/my` | ✅ | All | 내 모든 Planet 읽지 않은 메시지 수 조회 |

**주요 기능:**
- 실시간 읽음 상태 동기화
- 배치 읽음 처리
- Planet 범위 접근 제어
- Upsert 로직 (중복 방지)
- 디바이스별 추적

**필터링 옵션:**
- `messageId`, `userId`, `planetId`, `isRead`, `readAt`, `deviceType`, `createdAt`

---

## Travel (여행 그룹)

### 엔드포인트: `/api/v1/travels`

| Method | Path | 인증 필요 | 역할 | 기능 |
|--------|------|----------|------|------|
| GET | `/` | ✅ | Member | 내가 참여한 Travel 목록 조회 |
| GET | `/:id` | ✅ | Member | Travel 상세 조회 |

**주요 기능:**
- Travel 상태: PLANNED, ONGOING, COMPLETED, CANCELLED
- 가시성: PUBLIC, PRIVATE
- 멤버 및 Planet 정보 포함
- 사용자는 읽기 전용

**필터링 옵션:**
- `status`, `name`, `visibility`, `endDate`, `createdAt`

**관계 포함 옵션:**
- `travelUsers`, `travelUsers.user`, `planets`

---

## Travel User (여행 그룹 사용자)

### 엔드포인트: `/api/v1/travel-users`

| Method | Path | 인증 필요 | 역할 | 기능 |
|--------|------|----------|------|------|
| GET | `/` | ✅ | All | Travel 멤버십 목록 조회 |
| GET | `/:id` | ✅ | All | 특정 Travel 멤버십 조회 |
| POST | `/` | ✅ | All | Travel 참여 (초대 코드 필요) |
| PATCH | `/:id` | ✅ | Self | 멤버십 정보 수정 |

**주요 기능:**
- 역할: HOST (호스트), PARTICIPANT (참가자)
- 상태: ACTIVE, BANNED
- 초대 코드 기반 참여
- 자동 Planet 멤버십 할당
- 자기 정보만 수정 가능

**필터링 옵션:**
- `travelId` (필수), `userId`, `status`, `role`, `joinedAt`

**생성 시 필수 필드:**
- `inviteCode`

**업데이트 가능 필드:**
- `bio`, `nickname`

---

## User (사용자)

### 엔드포인트: `/api/v1/users`

| Method | Path | 인증 필요 | 역할 | 기능 |
|--------|------|----------|------|------|
| GET | `/:id` | ✅ | Self | 내 정보 조회 |
| PATCH | `/:id` | ✅ | Self | 내 정보 수정 |
| DELETE | `/:id` | ✅ | Self | 계정 삭제 (Soft Delete) |

**주요 기능:**
- 역할: USER, ADMIN
- 소셜 로그인 지원 (Google, Apple)
- 자기 정보만 접근 가능
- Soft Delete 지원
- 밴 사용자 제한

**필터링 옵션:**
- `name`, `email`, `phone`

**업데이트 가능 필드:**
- `name`, `phone`, `notificationsEnabled`, `advertisingConsentEnabled`

**관계 포함 옵션:**
- `profile`

---

## Moderation (관리 및 조정)

### 엔드포인트: `/api/v1/moderation`

| Method | Path | 인증 필요 | 역할 | 기능 |
|--------|------|----------|------|------|
| POST | `/ban/platform/:userId` | ✅ | ADMIN | 플랫폼 전체 사용자 벤 |
| POST | `/unban/platform/:userId` | ✅ | ADMIN | 플랫폼 전체 사용자 벤 해제 |
| POST | `/ban/travel/:travelId/:userId` | ✅ | ADMIN, HOST | Travel에서 사용자 벤 |
| POST | `/unban/travel/:travelId/:userId` | ✅ | ADMIN, HOST | Travel에서 사용자 벤 해제 |

**권한 규칙:**
- **ADMIN**: 플랫폼 전체, 모든 Travel, 모든 Planet에서 벤 가능
- **HOST**: 참여한 Travel 및 해당 Travel의 Planet에서만 벤 가능
- **USER**: 벤 권한 없음

**벤 레벨:**
- **플랫폼 벤**: User.isBanned = true (전체 서비스 접근 차단)
- **Travel 벤**: TravelUser.status = 'BANNED' (해당 Travel 참여 차단)
- **Planet 차단**: PlanetUser.status = 'BANNED' (해당 Planet에서 활동 차단)

---

## Admin (관리자)

### 엔드포인트: `/api/v1/admin`

| Method | Path | 인증 필요 | 역할 | 기능 |
|--------|------|----------|------|------|
| POST | `/users/:userId/force-logout` | ✅ | ADMIN | 특정 사용자 강제 로그아웃 |
| POST | `/users/:userId/ban` | ✅ | ADMIN | 사용자 차단 |
| POST | `/users/:userId/unban` | ✅ | ADMIN | 사용자 차단 해제 |
| GET | `/users/:userId/sessions` | ✅ | ADMIN | 사용자의 활성 세션 목록 조회 |
| GET | `/sessions/stats` | ✅ | ADMIN | 전체 세션 통계 조회 |
| GET | `/users/banned` | ✅ | ADMIN | 차단된 사용자 목록 조회 |
| POST | `/devices/:deviceId/force-disconnect` | ✅ | ADMIN | 특정 디바이스 강제 연결 종료 |

**주요 기능:**
- 강제 로그아웃 시스템
- 사용자 차단 관리
- 세션 모니터링 및 통계
- 디바이스별 연결 관리
- Redis 기반 토큰 블랙리스트
- WebSocket 즉시 연결 종료

**차단 프로세스:**
1. 사용자 상태를 차단으로 변경
2. 모든 활성 세션 무효화
3. 모든 토큰 블랙리스트 추가
4. WebSocket 연결 즉시 종료
5. 감사 로그 기록

---

## Schema (스키마)

### 엔드포인트: `/api/v1/schema`

| Method | Path | 인증 필요 | 역할 | 기능 |
|--------|------|----------|------|------|
| GET | `/` | ❌ | Dev Only | 모든 엔티티 스키마 조회 |
| GET | `/:entityName` | ❌ | Dev Only | 특정 엔티티 스키마 조회 |

**주요 기능:**
- 개발 환경 전용
- 데이터베이스 스키마 검사
- 엔티티 메타데이터 및 관계 정보
- CRUD 설정 정보

---

## 🔐 인증 및 권한 시스템

### JWT 토큰
- Access Token: 짧은 유효 기간
- Refresh Token: 긴 유효 기간, 재발급용
- Token Blacklist: Redis 기반 토큰 무효화 시스템
- Session Manager: 세션 생명주기 및 상태 추적

### 역할 기반 접근 제어 (RBAC)
1. **USER**: 일반 사용자
2. **ADMIN**: 관리자 (이메일/비밀번호 로그인 가능)

### 계층적 권한 구조
```
Travel (여행 그룹)
├── HOST: 그룹 관리 권한
└── PARTICIPANT: 참여자 권한
    └── Planet (채팅방)
        └── MEMBER: 채팅 참여 권한
```

### 밴(Ban) 시스템
- **User Ban**: 전체 계정 로그인 차단
  - 강제 로그아웃 기능 포함
  - 차단 기간 설정 가능 (bannedUntil)
  - 차단 사유 및 관리자 추적
- **TravelUser Ban**: 특정 Travel 참여 차단
- **PlanetUser Mute**: 채팅방 뮤트 (차단 대신)

---

## 📝 공통 규칙

### CRUD 패턴
- `@foryourdev/nestjs-crud` 데코레이터 사용
- 표준 RESTful 라우트 자동 생성
- 필터링, 정렬, 페이지네이션 지원

### 보안
- 모든 API는 AuthGuard 사용 (Schema 제외)
- allowedFilters, allowedParams로 입력 제한
- 역할 기반 접근 제어
- 자기 데이터만 수정 가능

### 응답 형식
- 성공: `{ data: {...} }`
- 에러: `{ statusCode: number, message: string, error: string }`
- 페이지네이션: `{ data: [...], meta: { ... } }`

---

## 📋 API 사용 예시

### 인증 플로우
1. 소셜 로그인: `POST /api/v1/auth/sign/social`
2. 토큰 갱신: `POST /api/v1/auth/sign/refresh`
3. 로그아웃: `POST /api/v1/auth/sign/out`

### 메시지 플로우
1. Planet 조회: `GET /api/v1/planets?filter[travelId_eq]=1`
2. 메시지 목록: `GET /api/v1/messages?filter[planetId_eq]=1`
3. 메시지 전송: `POST /api/v1/messages`
4. 읽음 처리: `POST /api/v1/read-receipts/mark-read`

### 파일 업로드 플로우
1. Presigned URL 획득: `POST /api/v1/file-uploads/presigned-url`
2. 파일 업로드 (클라이언트 → Cloudflare R2)
3. 업로드 완료 확인: `POST /api/v1/file-uploads/complete`

---

## 🔄 WebSocket 이벤트

실시간 통신을 위한 WebSocket 이벤트는 별도 문서에서 관리됩니다.

주요 이벤트:
- 메시지 전송/수신
- 읽음 상태 동기화
- 타이핑 표시
- 온라인 상태
- 알림 푸시

---

## 🔀 실시간 세션 관리

### 세션 추적 시스템
- **SessionManager Service**: Redis 기반 세션 생명주기 관리
- **TokenBlacklist Service**: JWT 토큰 블랙리스트 관리
- **ConnectionManager Service**: WebSocket 연결 실시간 관리
- **Enhanced Auth Guard**: 향상된 인증 검증 파이프라인

### 강제 로그아웃 프로세스
1. 관리자가 강제 로그아웃 API 호출
2. 모든 활성 세션 Redis에서 무효화
3. 모든 토큰 블랙리스트 추가
4. WebSocket 연결 즉시 종료
5. 감사 로그 기록

---

## 📚 추가 정보

- API 문서: `/api-docs` (Swagger UI)
- 개발 환경 스키마: `/api/v1/schema`
- 상태 코드 규약: RFC 7231 표준 준수