# API 라우트 문서

## 개요
이 문서는 Connecto NestJS 백엔드의 모든 API 라우트를 정리한 것입니다.
- **Base URL**: `/api/v1`
- **인증**: 대부분의 엔드포인트는 JWT 토큰 인증 필요 (`@UseGuards(AuthGuard)`)
- **CRUD Framework**: `@foryourdev/nestjs-crud` 사용
- **라우트 타입**: 
  - 🔄 = nestjs-crud 자동 생성 라우트
  - 🛠️ = 커스텀 구현 라우트

## 1. 인증 (Authentication)
**Base Path**: `/api/v1/auth`
**인증 필요**: ❌ (토큰 발급 엔드포인트)
**구현 방식**: 🛠️ 모두 커스텀

| Method | Endpoint | 설명 | 권한 | 타입 |
|--------|----------|------|------|------|
| POST | `/sign/social` | 소셜 로그인 (Google/Apple) | Public | 🛠️ 커스텀 |
| POST | `/sign/refresh` | JWT 토큰 갱신 | Refresh Token | 🛠️ 커스텀 |
| POST | `/sign/out` | 로그아웃 | Access Token | 🛠️ 커스텀 |

### 주요 기능
- Google OAuth 및 Apple Sign-In 지원
- JWT 기반 인증 (Access Token + Refresh Token)
- 자동 사용자 생성 및 프로필 초기화

---

## 2. 사용자 (Users)
**Base Path**: `/api/v1/users`
**인증 필요**: ✅
**구현 방식**: 🔄 nestjs-crud (`@Crud` 데코레이터 사용)
**CRUD Operations**: `show`, `update`, `destroy`

| Method | Endpoint | 설명 | 권한 | 타입 |
|--------|----------|------|------|------|
| GET | `/:id` | 사용자 정보 조회 | 본인만 | 🔄 CRUD |
| PATCH | `/:id` | 사용자 정보 수정 | 본인만 | 🔄 CRUD |
| DELETE | `/:id` | 계정 삭제 (Soft Delete) | 본인만 | 🔄 CRUD |

### Lifecycle Hooks
- `@BeforeShow()`: 본인 확인
- `@BeforeUpdate()`: 본인 확인, 차단 계정 체크
- `@BeforeDestroy()`: 본인 확인, 삭제 메타데이터 설정

### 주요 기능
- 본인 정보만 조회/수정/삭제 가능
- 차단된 계정은 수정 불가
- Soft Delete로 데이터 보존

### 수정 가능 필드
- `name`, `phone`, `language`, `timezone`
- `notificationsEnabled`, `advertisingConsentEnabled`

---

## 3. 프로필 (Profiles)
**Base Path**: `/api/v1/profiles`
**인증 필요**: ✅
**구현 방식**: 🔄 nestjs-crud (`@Crud` 데코레이터 사용)
**CRUD Operations**: `index`, `show`, `create`, `update`

| Method | Endpoint | 설명 | 권한 | 타입 |
|--------|----------|------|------|------|
| GET | `/` | 프로필 목록 조회 | 인증된 사용자 | 🔄 CRUD |
| GET | `/:id` | 프로필 상세 조회 | 인증된 사용자 | 🔄 CRUD |
| POST | `/` | 프로필 생성 | 프로필 없는 사용자 | 🔄 CRUD |
| PATCH | `/:id` | 프로필 수정 | 본인만 | 🔄 CRUD |

### Lifecycle Hooks
- `@BeforeCreate()`: 중복 확인, userId 설정
- `@BeforeUpdate()`: 본인 확인, 차단 사용자 체크
- `@BeforeShow()`: 차단된 사용자 프로필 접근 제한

### 주요 기능
- User와 1:1 관계
- 차단된 사용자의 프로필 조회 제한
- 풍부한 프로필 정보 지원

### 프로필 필드
- 기본: `bio`, `profileImage`, `coverImage`, `birthday`, `gender`
- 배열: `hobbies`, `interests`, `education`, `work`, `skills`
- 기타: `website`, `socialLinks`

---

## 4. 여행 그룹 (Travels)
**Base Path**: `/api/v1/travels`
**인증 필요**: ✅
**구현 방식**: 🔄 nestjs-crud (`@Crud` 데코레이터 사용)
**CRUD Operations**: `index`, `show`

| Method | Endpoint | 설명 | 권한 | 타입 |
|--------|----------|------|------|------|
| GET | `/` | 여행 목록 조회 | 참여한 여행만 | 🔄 CRUD |
| GET | `/:id` | 여행 상세 조회 | 멤버만 | 🔄 CRUD |

### 주요 기능
- Planet들의 최상위 컨테이너
- 초대 코드를 통한 참여
- 만료 시간 관리

### 필터 옵션
- `status`, `name`, `visibility`, `endDate`, `createdAt`

### Include 옵션
- `travelUsers`, `travelUsers.user`, `planets`

---

## 5. 여행 멤버십 (Travel Users)
**Base Path**: `/api/v1/travel-users`
**인증 필요**: ✅
**구현 방식**: 🔄 nestjs-crud (`@Crud` 데코레이터 사용)
**전체 CRUD 지원**

| Method | Endpoint | 설명 | 권한 | 타입 |
|--------|----------|------|------|------|
| GET | `/` | 멤버십 목록 조회 | 인증된 사용자 | 🔄 CRUD |
| GET | `/:id` | 멤버십 상세 조회 | 관련 사용자 | 🔄 CRUD |
| POST | `/` | 멤버십 생성 (참여) | 인증된 사용자 | 🔄 CRUD |
| PATCH | `/:id` | 멤버십 수정 | HOST 권한 | 🔄 CRUD |
| DELETE | `/:id` | 멤버십 삭제 (탈퇴) | 본인/HOST | 🔄 CRUD |

### 역할 (Role)
- `HOST`: 여행 관리자
- `PARTICIPANT`: 일반 참여자

### 상태 (Status)
- `ACTIVE`: 활성 멤버
- `BANNED`: 차단됨
- `LEFT`: 자진 탈퇴

---

## 6. 채팅방 (Planets)
**Base Path**: `/api/v1/planets`
**인증 필요**: ✅
**구현 방식**: 🔄 nestjs-crud (`@Crud` 데코레이터 사용)
**CRUD Operations**: `index`, `show`

| Method | Endpoint | 설명 | 권한 | 타입 |
|--------|----------|------|------|------|
| GET | `/` | 채팅방 목록 조회 | Travel 멤버 | 🔄 CRUD |
| GET | `/:id` | 채팅방 상세 조회 | Planet 멤버 | 🔄 CRUD |

### Lifecycle Hooks
- `@BeforeShow()`: Travel 멤버십 확인

### 주요 기능
- Travel 하위의 채팅 공간
- GROUP/DIRECT 타입 지원
- 시간 제한 채팅 기능

### 타입 (Type)
- `GROUP`: 그룹 채팅방
- `DIRECT`: 1:1 채팅방

### 필터 옵션
- `travelId` (필수), `type`, `isActive`, `name`, `createdAt`

---

## 7. 채팅방 멤버십 (Planet Users)
**Base Path**: `/api/v1/planet-users`
**인증 필요**: ✅
**구현 방식**: 🔄 nestjs-crud (`@Crud` 데코레이터 사용)
**전체 CRUD 지원**

| Method | Endpoint | 설명 | 권한 | 타입 |
|--------|----------|------|------|------|
| GET | `/` | 멤버십 목록 조회 | 인증된 사용자 | 🔄 CRUD |
| GET | `/:id` | 멤버십 상세 조회 | 관련 사용자 | 🔄 CRUD |
| POST | `/` | 멤버십 생성 | Travel 멤버 | 🔄 CRUD |
| PATCH | `/:id` | 멤버십 수정 | 관리자 | 🔄 CRUD |
| DELETE | `/:id` | 멤버십 삭제 | 본인/관리자 | 🔄 CRUD |

### 상태 (Status)
- `ACTIVE`: 활성 멤버
- `MUTED`: 음소거 상태

### 기능
- 음소거 기능 (mutedUntil)
- 마지막 읽은 메시지 추적

---

## 8. 메시지 (Messages)
**Base Path**: `/api/v1/messages`
**인증 필요**: ✅
**구현 방식**: 🔄 nestjs-crud + 🛠️ 커스텀 엔드포인트
**CRUD Operations**: `index`, `show`, `create`, `update`, `destroy`

| Method | Endpoint | 설명 | 권한 | 타입 |
|--------|----------|------|------|------|
| GET | `/` | 메시지 목록 조회 | Planet 멤버 | 🔄 CRUD |
| GET | `/:id` | 메시지 상세 조회 | Planet 멤버 | 🔄 CRUD |
| POST | `/` | 메시지 생성 | Planet 멤버 | 🔄 CRUD |
| PATCH | `/:id` | 메시지 수정 (15분 내) | 발신자만 | 🔄 CRUD |
| DELETE | `/:id` | 메시지 삭제 (Soft) | 발신자만 | 🔄 CRUD |
| GET | `/:messageId/context` | 메시지 주변 컨텍스트 조회 | Planet 멤버 | 🛠️ 커스텀 |

### Lifecycle Hooks
- `@BeforeShow()`: Planet 접근 권한 확인
- `@BeforeCreate()`: Planet 권한, 타입 검증, 메타데이터 설정
- `@AfterCreate()`: 답장 수 증가
- `@BeforeUpdate()`: 발신자 확인, 편집 시간 제한
- `@AfterUpdate()`: 편집 이벤트 발생
- `@BeforeDestroy()`: 삭제 권한 확인
- `@AfterDestroy()`: 삭제 이벤트 발생
- `@AfterRecover()`: 복구 처리

### 메시지 타입
- `TEXT`: 텍스트 메시지
- `IMAGE`: 이미지 메시지
- `VIDEO`: 비디오 메시지
- `FILE`: 파일 메시지
- `SYSTEM`: 시스템 메시지

### 주요 기능
- 답장 기능 (replyToMessageId)
- 메시지 편집 (15분 제한)
- 검색용 텍스트 자동 생성
- 읽음 수/답장 수 추적

---

## 9. 읽음 확인 (Read Receipts)
**Base Path**: `/api/v1/read-receipts`
**인증 필요**: ✅
**구현 방식**: 🔄 nestjs-crud + 🛠️ 커스텀 엔드포인트
**CRUD Operations**: 기본 CRUD + 특수 엔드포인트

| Method | Endpoint | 설명 | 권한 | 타입 |
|--------|----------|------|------|------|
| GET | `/` | 읽음 확인 목록 조회 | 인증된 사용자 | 🔄 CRUD |
| GET | `/:id` | 읽음 확인 상세 조회 | 관련 사용자 | 🔄 CRUD |
| POST | `/` | 읽음 확인 생성 | Planet 멤버 | 🔄 CRUD |
| PATCH | `/:id` | 읽음 확인 수정 | 본인 | 🔄 CRUD |
| DELETE | `/:id` | 읽음 확인 삭제 | 본인 | 🔄 CRUD |
| POST | `/mark-read` | 단일 메시지 읽음 처리 | Planet 멤버 | 🛠️ 커스텀 |
| POST | `/mark-multiple-read` | 다중 메시지 읽음 처리 | Planet 멤버 | 🛠️ 커스텀 |
| POST | `/mark-all-read/:planetId` | Planet 전체 읽음 처리 | Planet 멤버 | 🛠️ 커스텀 |
| GET | `/unread-count/:planetId` | Planet 읽지 않은 메시지 수 | Planet 멤버 | 🛠️ 커스텀 |
| GET | `/unread-counts/my` | 내 모든 Planet 읽지 않은 수 | 인증된 사용자 | 🛠️ 커스텀 |

### 주요 기능
- 메시지별 읽음 상태 추적
- 일괄 읽음 처리
- 실시간 읽음 수 업데이트

---

## 10. 알림 (Notifications)
**Base Path**: `/api/v1/notifications`
**인증 필요**: ✅
**구현 방식**: 🔄 nestjs-crud + 🛠️ 커스텀 엔드포인트
**CRUD Operations**: `index`, `show`, `update`

| Method | Endpoint | 설명 | 권한 | 타입 |
|--------|----------|------|------|------|
| GET | `/` | 알림 목록 조회 | 본인 알림만 | 🔄 CRUD |
| GET | `/:id` | 알림 상세 조회 | 수신자만 | 🔄 CRUD |
| PATCH | `/:id` | 알림 수정 (읽음 처리) | 수신자만 | 🔄 CRUD |
| GET | `/unread-count` | 읽지 않은 알림 수 | 인증된 사용자 | 🛠️ 커스텀 |
| PATCH | `/read-multiple` | 다중 알림 읽음 처리 | 수신자만 | 🛠️ 커스텀 |
| PATCH | `/read-all` | 전체 알림 읽음 처리 | 인증된 사용자 | 🛠️ 커스텀 |
| POST | `/push-token` | 푸시 토큰 등록 | 인증된 사용자 | 🛠️ 커스텀 |
| POST | `/push-token/unregister` | 푸시 토큰 해제 | 인증된 사용자 | 🛠️ 커스텀 |
| GET | `/push-tokens` | 내 푸시 토큰 목록 | 인증된 사용자 | 🛠️ 커스텀 |
| POST | `/test` | 테스트 알림 발송 | 인증된 사용자 | 🛠️ 커스텀 |

### 알림 타입
- `MESSAGE`: 새 메시지
- `MESSAGE_REPLY`: 답장
- `TRAVEL_INVITATION`: 여행 초대
- `TRAVEL_UPDATE`: 여행 업데이트
- `PLANET_UPDATE`: 채팅방 업데이트
- `USER_JOINED`: 사용자 참여
- `USER_LEFT`: 사용자 탈퇴
- `MENTION`: 멘션
- `ANNOUNCEMENT`: 공지사항
- `SYSTEM`: 시스템 알림

### 알림 채널
- Push Notification (FCM)
- Email
- SMS

---

## 11. 파일 업로드 (File Uploads)
**Base Path**: `/api/v1/file-uploads`
**인증 필요**: ✅
**구현 방식**: 🔄 nestjs-crud + 🛠️ 커스텀 엔드포인트
**CRUD Operations**: `index`, `show`, `create`, `destroy`

| Method | Endpoint | 설명 | 권한 | 타입 |
|--------|----------|------|------|------|
| GET | `/` | 업로드 파일 목록 | 업로더만 | 🔄 CRUD |
| GET | `/:id` | 파일 정보 조회 | 관련 사용자 | 🔄 CRUD |
| POST | `/` | 파일 업로드 시작 | 인증된 사용자 | 🔄 CRUD |
| DELETE | `/:id` | 파일 삭제 | 업로더만 | 🔄 CRUD |
| POST | `/presigned-url` | 업로드 URL 생성 | 인증된 사용자 | 🛠️ 커스텀 |
| POST | `/complete` | 업로드 완료 처리 | 업로더만 | 🛠️ 커스텀 |
| DELETE | `/:id/cancel` | 업로드 취소 | 업로더만 | 🛠️ 커스텀 |
| GET | `/:id/download-url` | 다운로드 URL 생성 | 관련 사용자 | 🛠️ 커스텀 |
| GET | `/:id/stream` | 스트리밍 URL 생성 | 관련 사용자 | 🛠️ 커스텀 |

### 주요 기능
- Cloudflare R2 스토리지 사용
- 청크 단위 업로드 (5MB 단위)
- 최대 파일 크기: 500MB
- 자동 썸네일 생성 (비디오)
- HLS 스트리밍 지원

### 지원 파일 타입
- 이미지: JPG, PNG, GIF, WebP
- 비디오: MP4, MOV, AVI, WebM
- 문서: PDF, DOC, DOCX, XLS, XLSX
- 기타: ZIP, RAR

---

## 12. 관리자 (Admin)
**Base Path**: `/api/v1/admin/admins`
**인증 필요**: ✅ (관리자 권한)
**구현 방식**: 🔄 nestjs-crud (`@Crud` 데코레이터 사용)
**전체 CRUD 지원**

| Method | Endpoint | 설명 | 권한 | 타입 |
|--------|----------|------|------|------|
| GET | `/` | 관리자 목록 조회 | 슈퍼 관리자 | 🔄 CRUD |
| GET | `/:id` | 관리자 정보 조회 | 관리자 | 🔄 CRUD |
| POST | `/` | 관리자 생성 | 슈퍼 관리자 | 🔄 CRUD |
| PATCH | `/:id` | 관리자 정보 수정 | 슈퍼 관리자 | 🔄 CRUD |
| DELETE | `/:id` | 관리자 삭제 | 슈퍼 관리자 | 🔄 CRUD |

### 관리자 역할
- `SUPER_ADMIN`: 최고 관리자
- `ADMIN`: 일반 관리자
- `MODERATOR`: 중재자

---

## 13. 스키마 정보 (Schema) - 개발 전용
**Base Path**: `/api/v1/schema`
**인증 필요**: ❌
**구현 방식**: 🛠️ 모두 커스텀
**환경 제한**: 개발 환경만 (`@UseGuards(DevOnlyGuard)`)

| Method | Endpoint | 설명 | 권한 | 타입 |
|--------|----------|------|------|------|
| GET | `/` | 전체 스키마 정보 | 개발 환경 | 🛠️ 커스텀 |
| GET | `/:entityName` | 특정 엔티티 스키마 | 개발 환경 | 🛠️ 커스텀 |

### 주요 기능
- 데이터베이스 스키마 조회
- TypeORM 메타데이터 정보
- CRUD 설정 정보
- 관계 매핑 정보

---

## WebSocket 엔드포인트
**Base Path**: `/websocket`
**인증 필요**: ✅ (JWT 토큰)
**구현 방식**: 🛠️ 모두 커스텀 (Socket.io Gateway)

### 이벤트
#### 클라이언트 → 서버
- `join:planet` - 채팅방 참여
- `leave:planet` - 채팅방 퇴장
- `message:send` - 메시지 전송
- `message:edit` - 메시지 수정
- `message:delete` - 메시지 삭제
- `typing:start` - 타이핑 시작
- `typing:stop` - 타이핑 종료
- `presence:online` - 온라인 상태
- `presence:offline` - 오프라인 상태

#### 서버 → 클라이언트
- `message:new` - 새 메시지
- `message:edited` - 메시지 수정됨
- `message:deleted` - 메시지 삭제됨
- `user:typing` - 사용자 타이핑 중
- `user:online` - 사용자 온라인
- `user:offline` - 사용자 오프라인
- `planet:userJoined` - 사용자 참여
- `planet:userLeft` - 사용자 퇴장

---

## 요약 통계

### 구현 방식별 분류
- **🔄 nestjs-crud 전용**: 7개 모듈
  - Users, Profiles, Travels, Travel Users, Planets, Planet Users, Admin
- **🔄 + 🛠️ 혼합 구현**: 4개 모듈
  - Messages, Read Receipts, Notifications, File Uploads
- **🛠️ 커스텀 전용**: 2개 모듈
  - Auth, Schema

### nestjs-crud 활용도
- **총 13개 모듈 중 11개가 nestjs-crud 활용**
- **표준 CRUD 작업의 약 85%가 자동 생성**
- **특수 비즈니스 로직은 커스텀 엔드포인트로 보완**

---

## 공통 응답 형식

### 성공 응답
```json
{
  "data": {
    // 실제 데이터
  },
  "meta": {
    "total": 100,
    "page": 1,
    "pageSize": 20
  }
}
```

### 에러 응답
```json
{
  "statusCode": 400,
  "message": "에러 메시지",
  "error": "Bad Request"
}
```

### 페이지네이션
- Query Parameters:
  - `page`: 페이지 번호 (기본: 1)
  - `pageSize`: 페이지 크기 (기본: 20, 최대: 100)
  - `sortBy`: 정렬 필드
  - `sortOrder`: 정렬 방향 (ASC/DESC)

### 필터링
- Query Parameters:
  - `filter[field]`: 필드별 필터
  - `search`: 전체 텍스트 검색
  - `include`: 관계 포함 (comma-separated)

---

## 인증 헤더
```
Authorization: Bearer {JWT_ACCESS_TOKEN}
```

## Rate Limiting
- 일반 API: 100 요청/분
- 파일 업로드: 10 요청/분
- WebSocket: 30 메시지/분

## API 버전
현재 버전: `v1`
모든 엔드포인트는 `/api/v1` 접두사 사용