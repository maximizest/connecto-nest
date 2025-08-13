# Connecto-nest API

NestJS 11.x 기반 백엔드 API 서버로, 여행 그룹 채팅 플랫폼을 위한 실시간 메시징 및 협업 기능을 제공합니다.

## 🎯 프로젝트 개요

- **프레임워크**: NestJS 11.x + TypeScript 5.7.x
- **데이터베이스**: PostgreSQL + TypeORM
- **인증**: JWT + 소셜 로그인 (Google, Apple)
- **실시간 통신**: WebSocket (Socket.io)
- **CRUD**: @foryourdev/nestjs-crud 자동 생성
- **캐싱**: Redis 기반 성능 최적화
- **스토리지**: Cloudflare R2 (최대 500MB 파일 지원)
- **패키지 매니저**: yarn

## 📁 모듈 구조 (@modules/)

### 🔐 인증 및 사용자 관리

#### **admin** - 시스템 관리자

- **API**: `/api/v1/admins`
- **역할**: 시스템 관리자 계정 및 권한 관리
- **주요 기능**:
  - 관리자 계정 CRUD (생성/조회/수정/삭제)
  - bcrypt 패스워드 해싱
  - JWT 리프레시 토큰 관리
  - 관리자 권한 기반 시스템 접근 제어

#### **auth** - 인증 시스템

- **API**: `/api/v1/auth`
- **역할**: 소셜 로그인, 토큰 관리, 계정 생성/삭제
- **주요 기능**:
  - 소셜 로그인 (Google, Apple)
  - JWT 토큰 발급 및 갱신
  - 로그아웃 및 토큰 무효화
  - 회원가입 (첫 소셜 로그인 시 자동 계정 생성)
  - 회원탈퇴 및 완전 데이터 삭제 (개보법 준수)
  - 계정 삭제 영향도 분석
- **특징**:
  - JWT 기반 인증 시스템
  - 실제 Google/Apple 토큰 검증 구현
  - Google OAuth 2.0 ID 토큰 검증
  - Apple Identity Token (JWT) 검증
  - 개인정보 완전 삭제 + 서비스 데이터 익명화

#### **user** - 사용자 프로필 관리

- **API**: `/api/v1/users`
- **역할**: 사용자 프로필 조회 및 수정
- **주요 기능**:
  - 사용자 프로필 조회 및 수정
  - 온라인/오프라인 상태 실시간 추적
  - 사용자 벤 시스템 (로그인 차단)
  - 알림 설정 및 광고성 알림 동의 관리
  - 전화번호 등록 및 관리
- **특징**:
  - 실시간 온라인 상태 관리
  - 영구 벤 시스템 (만료 시간 없음)
  - 본인 정보만 수정 가능한 보안 모델

#### **profile** - 사용자 프로필

- **API**: `/api/v1/profiles`
- **역할**: 사용자 상세 프로필 정보 관리 (User와 1:1 관계)
- **주요 기능**:
  - 닉네임, 실명, 성별, 나이, 직업 관리
  - 프로필 이미지 및 자기소개 설정
  - 프로필 공개/비공개 설정
  - 언어, 시간대, 테마 설정
  - 프로필 완성도 계산 및 연령대 분류

### 🌍 여행 및 그룹 관리

#### **travel** - 여행 그룹

- **API**: `/api/v1/travels`
- **역할**: 여행 그룹 생성 및 관리 (Planet들의 상위 컨테이너)
- **주요 기능**:
  - 여행 그룹 CRUD 및 상태 관리 (INACTIVE/ACTIVE)
  - 공개/비공개 설정 (PUBLIC/INVITE_ONLY)
  - 초대 코드 생성 및 관리
  - 여행 기간 설정 및 자동 만료 처리
  - 멤버 수 제한 및 관리
  - 여행 만료 시 관련 Planet 비활성화
- **특징**:
  - 단순화된 상태 시스템 (isActive 제거)
  - endDate 기반 만료 관리 (expiryDate 통합)
  - 관리자 소유권 제거 (모든 관리자가 관리 가능)

#### **travel-user** - 여행 그룹 멤버십

- **API**: `/api/v1/travel-users`
- **역할**: 여행 그룹 멤버십 및 권한 관리
- **주요 기능**:
  - 멤버 초대/참여/탈퇴 관리
  - 역할 관리 (HOST/PARTICIPANT)
  - 여행별 벤 시스템 (로그인 가능, 해당 여행 채팅 불가)
  - 멤버 상태 추적 (ACTIVE/LEFT/INVITED)
  - 참여 통계 및 활동 지수 계산
- **특징**:
  - 영구 벤 시스템 (banExpiresAt 제거)
  - 여행 만료 시 자동 상태 관리

#### **planet** - 채팅방

- **API**: `/api/v1/planets`
- **역할**: 실제 채팅방 관리 (단체 채팅 / 1:1 채팅)
- **주요 기능**:
  - 채팅방 타입별 관리 (GROUP/DIRECT)
  - 시간 제한 채팅 기능 (일별/주별/사용자 정의)
  - 멤버 수 제한 및 관리
  - 마지막 메시지 미리보기
  - 파일 업로드 및 알림 설정 관리
- **특징**:
  - Travel 만료 후에도 조회 가능 (읽기 전용)
  - 관리자 소유권 제거

#### **planet-user** - 채팅방 멤버십

- **API**: `/api/v1/planet-users`
- **역할**: 채팅방 멤버십 및 권한 관리
- **주요 기능**:
  - 채팅방 참여/탈퇴 관리
  - 역할 관리 (PARTICIPANT/MODERATOR)
  - 음소거 시스템 (일시적 채팅 제한)
  - 1:1 채팅 초대 시스템
  - 읽음 상태 및 알림 설정
  - 개인별 권한 및 설정 관리
- **특징**:
  - 벤 시스템 완전 제거 (음소거로 대체)
  - 1:1 채팅 전용 초대 시스템

### 💬 메시징 및 커뮤니케이션

#### **message** - 메시지 시스템

- **API**: `/api/v1/messages`
- **역할**: 채팅 메시지 송수신 및 관리
- **주요 기능**:
  - 다양한 메시지 타입 (TEXT/IMAGE/VIDEO/FILE/SYSTEM)
  - 메시지 편집 및 소프트 삭제
  - 답장 및 스레드 기능
  - 파일 메타데이터 및 썸네일 관리
  - 멘션 및 해시태그 지원
  - 전문 검색 및 고급 필터링
- **특징**:
  - 대용량 파일 지원 (최대 500MB)
  - 실시간 검색 최적화
  - 탈퇴 사용자 메시지 익명화 처리

#### **read-receipt** - 읽음 상태 관리

- **API**: `/api/v1/read-receipts`
- **역할**: 메시지 읽음 상태 추적 및 관리
- **주요 기능**:
  - 메시지별 읽음 상태 추적
  - 일괄 읽음 처리
  - 디바이스별 읽음 정보 수집
  - Planet별 읽지 않은 메시지 수 계산
- **특징**:
  - 다양한 읽음 소스 추적 (auto/manual/scroll)
  - 실시간 읽음 상태 업데이트

#### **websocket** - 실시간 통신

- **API**: WebSocket Gateway + `/api/v1/typing`
- **역할**: 실시간 통신 및 WebSocket 연결 관리
- **주요 기능**:
  - 실시간 메시지 전송
  - 타이핑 인디케이터
  - 온라인 상태 브로드캐스트
  - WebSocket 인증 및 권한 관리
  - 레이트 리미팅
  - 룸 기반 메시지 라우팅
- **특징**:
  - Socket.io 기반 실시간 통신
  - Redis를 통한 확장 가능한 아키텍처
  - 다중 디바이스 연결 지원

#### **notification** - 알림 시스템

- **API**: `/api/v1/notifications`
- **역할**: 다채널 알림 관리 (푸시/이메일/인앱/SMS)
- **주요 기능**:
  - FCM 푸시 알림 전송
  - 다채널 알림 배송 (IN_APP/PUSH/EMAIL/SMS/WEBSOCKET)
  - 알림 우선순위 및 스케줄링
  - 알림 배송 결과 추적
  - 디바이스 토큰 관리
  - 대량 알림 배송
- **특징**:
  - 다양한 알림 타입 및 메타데이터 지원
  - 실패 시 자동 재시도 시스템
  - 플랫폼별 맞춤 설정

### 📁 파일 및 미디어 관리

#### **file-upload** - 파일 업로드

- **API**: `/api/v1/files`
- **역할**: 대용량 파일 업로드 및 관리
- **주요 기능**:
  - 멀티파트 청크 업로드 (5MB 단위)
  - Cloudflare R2 스토리지 연동
  - 업로드 진행률 실시간 추적
  - 파일 타입 검증 및 크기 제한
  - 업로드 재시도 및 복구 시스템
- **특징**:
  - 최대 500MB 파일 지원
  - 청크 기반 안정적 업로드
  - 탈퇴 사용자 파일 표시 시스템

#### **streaming** - 미디어 스트리밍

- **API**: `/api/v1/streaming`
- **역할**: 비디오/오디오 스트리밍 서비스
- **주요 기능**:
  - HLS (HTTP Live Streaming) 지원
  - 실시간 스트리밍 세션 관리
  - 다양한 품질 옵션
  - CDN 최적화
- **특징**:
  - 다중 디바이스 스트리밍
  - 적응형 비트레이트 스트리밍

#### **video-processing** - 비디오 처리

- **API**: `/api/v1/video-processing`
- **역할**: 비디오 인코딩 및 후처리
- **주요 기능**:
  - 비디오 인코딩/디코딩
  - 해상도 변환 및 최적화
  - 썸네일 자동 생성
  - 비디오 메타데이터 추출
  - 배치 처리 시스템
- **특징**:
  - 다양한 품질 프로파일 지원
  - 백그라운드 비동기 처리

#### **storage** - 스토리지 관리

- **역할**: 통합 파일 저장소 관리
- **주요 기능**:
  - Cloudflare R2 스토리지 연동
  - 파일 CRUD 작업
  - 프리사인드 URL 생성
  - 스토리지 사용량 모니터링
  - 파일 보안 및 접근 제어

### 🗄️ 캐시 및 성능 관리

#### **cache** - Redis 기반 캐싱

- **API**: `/api/v1/online-presence`
- **역할**: Redis 기반 캐싱 및 온라인 상태 관리
- **주요 기능**:
  - 사용자 온라인 상태 실시간 관리
  - Travel/Planet 캐시 관리
  - 캐시 이벤트 시스템
  - 캐시 성능 메트릭 수집
  - 자동 캐시 무효화
- **특징**:
  - Redis 클러스터 지원
  - 캐시 Hit/Miss 비율 분석
  - 실시간 온라인 사용자 통계

### 🔒 보안 및 시스템 관리

#### **security** - 보안 시스템

- **역할**: 파일 보안 및 접근 제어
- **주요 기능**:
  - 파일 보안 스캔
  - 악성코드 탐지
  - 보안 정책 관리
  - 접근 로그 및 감사

#### **scheduler** - 작업 스케줄러

- **API**: `/api/v1/scheduler` (개발 환경 전용)
- **역할**: 백그라운드 작업 및 시스템 최적화
- **주요 기능**:
  - 대용량 파일 정리 작업
  - 캐시 최적화 작업
  - 시스템 상태 모니터링
  - 작업 스케줄 관리
  - 분산 락 시스템
- **특징**:
  - Redis 기반 분산 락
  - 성능 추적

#### **schema** - 데이터베이스 스키마 API

- **API**: `/api/v1/schema` (개발 환경 전용)
- **역할**: 데이터베이스 스키마 정보 제공
- **주요 기능**:
  - 엔티티 메타데이터 조회
  - CRUD 설정 정보 제공
  - 보안 유효성 검증
  - 개발 도구 지원

## 🏗️ 아키텍처 특징

### **Entity-First CRUD 패턴**

- `@foryourdev/nestjs-crud` 활용한 표준화된 RESTful API
- `allowedFilters`, `allowedParams`, `allowedIncludes`를 통한 보안 제어
- 자동 페이지네이션 및 정렬 지원
- 고급 필터링 (eq, ne, gt, gte, lt, lte, like, in, between 등)

### **Travel-Planet 계층 구조**

```
Travel (여행 그룹)
├── TravelUser (멤버십)
└── Planet (채팅방)
    ├── PlanetUser (멤버십)
    └── Message (메시지)
        └── MessageReadReceipt (읽음 상태)
```

### **벤 시스템 구조**

| 벤 타입               | 대상       | 로그인  | 여행 참여 | 채팅                |
| --------------------- | ---------- | ------- | --------- | ------------------- |
| **User 벤**           | 전체 계정  | ❌ 불가 | ❌ 불가   | ❌ 불가             |
| **TravelUser 벤**     | 특정 여행  | ✅ 가능 | ❌ 불가   | ❌ 불가 (해당 여행) |
| **~~PlanetUser 벤~~** | ~~제거됨~~ | -       | -         | -                   |

_PlanetUser는 음소거(mute) 시스템으로 대체_

### **실시간 통신 시스템**

- WebSocket 기반 실시간 메시징
- Redis를 통한 확장 가능한 pub/sub
- 타이핑 인디케이터 및 온라인 상태
- 다중 디바이스 동시 연결 지원

### **대용량 파일 처리**

- **파일 크기**: 최대 500MB (모든 파일 타입 통일)
- **업로드 방식**: 5MB 단위 청크 업로드
- **스토리지**: Cloudflare R2
- **지원 타입**:
  - 이미지: jpg, jpeg, png, gif, webp
  - 비디오: mp4, avi, mov, webm
  - 파일: pdf, doc, docx, txt, zip, rar

### **캐싱 전략**

- **User 온라인 상태**: 5분 TTL
- **Travel/Planet 정보**: 30분-1시간 TTL
- **메시지 캐시**: 10분 TTL
- **실시간 데이터**: 1분 TTL

## 🚀 시작하기

```bash
# 의존성 설치
yarn install

# 데이터베이스 마이그레이션
yarn migration:run

# 개발 서버 시작
yarn dev

# 백그라운드 작업 (선택사항)
yarn scheduler:start
```

## 📝 API 구조

### **Base URL**

```
Production: /api/v1
Development: /api/v1 (+ 개발 전용 엔드포인트)
```

### **인증 헤더**

```
Authorization: Bearer <JWT_TOKEN>
```

### **표준 CRUD 엔드포인트**

```
GET    /{resource}         # 목록 조회 (페이지네이션)
GET    /{resource}/{id}    # 단일 조회
POST   /{resource}         # 생성
PUT    /{resource}/{id}    # 수정
DELETE /{resource}/{id}    # 삭제
```

### **인증 API 엔드포인트**

```bash
# 소셜 로그인 및 회원가입
POST /api/v1/auth/sign/social

# JWT 토큰 갱신
POST /api/v1/auth/sign/refresh

# 로그아웃
POST /api/v1/auth/sign/out

# 현재 사용자 정보 조회
GET /api/v1/auth/me

# 토큰 유효성 검증
POST /api/v1/auth/verify-token

# 계정 삭제 영향도 분석
GET /api/v1/auth/account/deletion-impact

# 회원탈퇴 (완전 삭제)
DELETE /api/v1/auth/account
```

### **고급 필터링 예시**

```bash
# 필터링
GET /api/v1/messages?filter[planetId_eq]=123&filter[type_ne]=system

# 관계 포함
GET /api/v1/travels?include=travelUsers,planets&filter[status_eq]=active

# 정렬 및 페이지네이션
GET /api/v1/messages?sort=-createdAt&page[number]=1&page[size]=20
```

## 🔧 환경 설정

### **필수 환경변수**

```env
# 데이터베이스
DATABASE_URL=postgresql://user:password@host:port/database
DATABASE_SSL_MODE=require

# JWT 인증
JWT_SECRET=your-secret-key-32-chars-minimum
JWT_ACCESS_TOKEN_EXPIRES_IN=1h
JWT_REFRESH_TOKEN_EXPIRES_IN=7d

# Redis 캐싱
REDIS_URL=redis://localhost:6379

# 파일 스토리지 (Cloudflare R2)
CLOUDFLARE_R2_ACCOUNT_ID=your-account-id
CLOUDFLARE_R2_ACCESS_KEY_ID=your-access-key
CLOUDFLARE_R2_SECRET_ACCESS_KEY=your-secret-key
CLOUDFLARE_R2_BUCKET_NAME=your-bucket-name
CLOUDFLARE_R2_PUBLIC_URL=https://your-domain.com

# 소셜 로그인 (필수 - 토큰 검증을 위해 필요)
GOOGLE_CLIENT_ID=your-google-client-id
APPLE_CLIENT_ID=your-apple-client-id
```

### **개발 환경 전용**

```env
NODE_ENV=development
DATABASE_SYNCHRONIZE=false  # 항상 false (마이그레이션 사용)
SCHEMA_API_ENABLED=true     # 스키마 API 활성화
```

## 📋 개발 가이드라인

### **소셜 로그인 토큰 사용법**

**Google OAuth 2.0:**

```javascript
// 클라이언트에서 Google ID 토큰 획득 후 API 호출
POST /api/v1/auth/sign/social
{
  "provider": "google",
  "socialToken": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9..." // Google ID Token
}
```

**Apple Sign-in:**

```javascript
// 클라이언트에서 Apple Identity 토큰 획득 후 API 호출
POST /api/v1/auth/sign/social
{
  "provider": "apple",
  "socialToken": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9..." // Apple Identity Token
}
```

### **코딩 규칙**

- **Import 경로**: 반드시 상대경로 사용 (`../../guards/auth.guard`)
- **패키지 매니저**: yarn만 사용 (npm 금지)
- **언어**: 한국어 주석 및 에러 메시지
- **타입 안정성**: any 타입 지양, 명확한 타입 정의

### **CRUD 패턴**

```typescript
@Injectable()
export class EntityService extends CrudService<Entity> {
  constructor(
    @InjectRepository(Entity)
    repository: Repository<Entity>,
  ) {
    super(repository);
  }
}

@Controller({ path: 'entities', version: '1' })
@Crud({
  entity: Entity,
  allowedFilters: ['field1', 'field2'],
  allowedParams: ['field1', 'field2'],
  allowedIncludes: ['relation1'],
  only: ['index', 'show', 'create', 'update', 'destroy'],
})
export class EntityController {
  constructor(public readonly crudService: EntityService) {}
}
```

### **보안 가이드라인**

- 모든 API에 적절한 가드 적용 (`@UseGuards(AuthGuard)`)
- `allowedFilters`, `allowedParams`, `allowedIncludes` 필수 설정
- 민감한 데이터는 `@Exclude()` 데코레이터 사용
- 환경변수로 시크릿 관리

### **데이터베이스 마이그레이션**

```bash
# 마이그레이션 생성
yarn migration:generate -- CreateEntityTable

# 마이그레이션 실행
yarn migration:run

# 마이그레이션 되돌리기
yarn migration:revert
```

### **테스트**

- Jest E2E 테스트 작성
- `describeE2E` 헬퍼 함수 사용
- `@foryourdev/jest-swag`로 OpenAPI 문서 자동 생성

## 🎯 주요 기능 및 특징

### **실시간 기능**

- ✅ 실시간 메시징
- ✅ 온라인 상태 표시
- ✅ 타이핑 인디케이터
- ✅ 읽음 상태 동기화
- ✅ 실시간 알림

### **보안 기능**

- ✅ JWT 기반 인증
- ✅ 소셜 로그인 연동
- ✅ 계층적 권한 관리
- ✅ API 레이트 리미팅
- ✅ 파일 보안 스캔

### **성능 최적화**

- ✅ Redis 기반 캐싱
- ✅ 데이터베이스 인덱스 최적화
- ✅ 청크 기반 파일 업로드
- ✅ CDN 연동 (R2)
- ✅ 쿼리 최적화

### **운영 지원**

- ✅ 구조화된 로깅
- ✅ 성능 메트릭 수집
- ✅ 자동화된 데이터 정리
- ✅ 시스템 상태 모니터링
- ✅ 개발 도구 API

이 문서는 Connecto-nest 프로젝트의 현재 아키텍처와 각 모듈의 실제 기능을 반영합니다. 각 모듈은 독립적이면서도 유기적으로 연결되어 완전한 여행 그룹 채팅 플랫폼을 구성합니다.
