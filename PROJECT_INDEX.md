# 📚 Connecto NestJS Project Index

## 개요
Connecto는 여행 그룹 기반의 실시간 채팅 애플리케이션입니다. NestJS 프레임워크를 사용하여 구축되었으며, PostgreSQL, Redis, WebSocket을 활용한 확장 가능한 백엔드 시스템입니다.

## 🏗️ 프로젝트 구조

### 핵심 기술 스택
- **Framework**: NestJS 11.x with TypeScript 5.7.x
- **Database**: PostgreSQL with TypeORM (Active Record Pattern)
- **Cache**: Redis for caching and real-time features
- **Real-time**: Socket.io for WebSocket communication
- **Storage**: Cloudflare R2 for file storage
- **Authentication**: JWT with Google/Apple social login

### 아키텍처 패턴
- **Entity-First CRUD Pattern**: `@foryourdev/nestjs-crud` 라이브러리 활용
- **Active Record Pattern**: TypeORM BaseEntity 상속
- **Module-based Architecture**: NestJS 모듈 시스템
- **Lifecycle Hooks**: 비즈니스 로직 전처리/후처리

## 📦 모듈 구조

### 1. 인증 및 사용자 관리
| 모듈 | 설명 | 주요 기능 |
|------|------|----------|
| **auth** | JWT 기반 인증 | Google/Apple 소셜 로그인, 토큰 관리 |
| **user** | 사용자 계정 | 프로필, 알림 설정, 차단 관리 |
| **profile** | 사용자 프로필 | 닉네임, 이름, 성별, 나이, 직업 |
| **admin** | 관리자 시스템 | bcrypt 암호화, 권한 관리 |

### 2. 여행 및 그룹 관리
| 모듈 | 설명 | 주요 기능 |
|------|------|----------|
| **travel** | 여행 그룹 | 그룹 생성, 초대 코드, 만료 관리 |
| **travel-user** | 여행 멤버십 | HOST/PARTICIPANT 역할, 차단 관리 |
| **planet** | 채팅방 | GROUP/DIRECT 타입, 시간 제한 |
| **planet-user** | 채팅방 멤버십 | 음소거, 읽음 상태 추적 |

### 3. 메시징 및 알림
| 모듈 | 설명 | 주요 기능 |
|------|------|----------|
| **message** | 채팅 메시지 | TEXT/IMAGE/VIDEO/FILE/SYSTEM 타입 |
| **read-receipt** | 읽음 확인 | 메시지별 읽음 상태 추적 |
| **notification** | 알림 시스템 | FCM Push, Email, SMS 지원 |
| **websocket** | 실시간 통신 | Socket.io 기반 실시간 메시징 |

### 4. 파일 및 미디어
| 모듈 | 설명 | 주요 기능 |
|------|------|----------|
| **file-upload** | 파일 업로드 | 청크 업로드, 최대 500MB |
| **streaming** | 미디어 스트리밍 | HLS 비디오/오디오 스트리밍 |
| **video-processing** | 비디오 처리 | 인코딩, 썸네일 생성 |
| **storage** | 스토리지 관리 | Cloudflare R2 통합 |

### 5. 성능 및 시스템
| 모듈 | 설명 | 주요 기능 |
|------|------|----------|
| **cache** | 캐싱 시스템 | Redis 기반 TTL 전략 |
| **scheduler** | 스케줄러 | 백그라운드 작업, 시스템 최적화 |
| **schema** | 스키마 API | 개발 환경 전용 스키마 정보 |

## 📊 데이터 모델

### 계층 구조
```
User (사용자)
├── Profile (1:1 관계)
├── TravelUser (여행 멤버십)
│   └── Travel (여행 그룹)
│       └── Planet (채팅방)
│           ├── PlanetUser (채팅방 멤버십)
│           └── Message (메시지)
│               └── MessageReadReceipt (읽음 확인)
└── Notification (알림)
```

### 주요 엔티티 (최근 간소화)
- **User**: 소셜 로그인 정보, 기본 설정 (language, timezone 제거됨)
- **Profile**: 간소화된 프로필 - 5개 필드만 유지
  - nickname (닉네임)
  - name (실명)
  - gender (성별)
  - age (나이)
  - occupation (직업)
- **Travel**: 간소화된 여행 그룹 - 필수 필드만 유지 (상태: INACTIVE/ACTIVE)
- **Planet**: 채팅방 (타입: GROUP/DIRECT)
- **Message**: 채팅 메시지 (다양한 미디어 타입 지원)

## 🔧 개발 환경 설정

### 필수 환경 변수
```env
DATABASE_URL=postgresql://user:password@localhost:5432/connecto
JWT_SECRET=your-secret-key-min-32-chars
REDIS_URL=redis://localhost:6379
CLOUDFLARE_R2_ACCESS_KEY_ID=your-access-key
CLOUDFLARE_R2_SECRET_ACCESS_KEY=your-secret-key
CLOUDFLARE_R2_BUCKET_NAME=your-bucket
CLOUDFLARE_R2_PUBLIC_URL=https://your-public-url
GOOGLE_CLIENT_ID=your-google-client-id
APPLE_CLIENT_ID=your-apple-client-id
```

### 주요 명령어
```bash
# 개발
yarn dev                # 개발 서버 실행 (watch mode)
yarn build              # 프로덕션 빌드
yarn start:prod         # 프로덕션 실행

# 테스트
yarn test               # 단위 테스트
yarn test:e2e           # E2E 테스트
yarn test:cov           # 커버리지 리포트

# 데이터베이스
yarn migration:generate -- MigrationName  # 마이그레이션 생성
yarn migration:run                        # 마이그레이션 실행
yarn migration:revert                     # 마이그레이션 롤백

# 코드 품질
yarn lint               # ESLint 실행
yarn format             # Prettier 포맷팅
```

## 📚 프로젝트 문서

### 메인 문서
- [CLAUDE.md](./CLAUDE.md) - Claude AI 가이드라인
- [README.md](./README.md) - 프로젝트 개요
- [PROJECT_INDEX.md](./PROJECT_INDEX.md) - 이 문서

### 기술 문서 (.md/)
- [entity-relationship-diagram.md](./.md/entity-relationship-diagram.md) - ERD 및 데이터베이스 스키마
- [routes.md](./.md/routes.md) - API 라우트 문서
- [NESTJSCRUD.md](./.md/NESTJSCRUD.md) - NestJS CRUD 프레임워크 가이드
- [custom.md](./.md/custom.md) - 커스텀 엔드포인트 문서
- [relationship.md](./.md/relationship.md) - 엔티티 관계 설명

## 🚀 API 엔드포인트

### 기본 정보
- **Base URL**: `/api/v1`
- **인증**: Bearer JWT Token
- **Rate Limiting**: 100 requests/minute (일반), 10 requests/minute (파일 업로드)

### 주요 엔드포인트 카테고리
1. **인증**: `/api/v1/auth/*` - 소셜 로그인, 토큰 관리
2. **사용자**: `/api/v1/users/*` - 사용자 정보 CRUD
3. **프로필**: `/api/v1/profiles/*` - 프로필 정보 CRUD
4. **여행**: `/api/v1/travels/*` - 여행 그룹 관리
5. **채팅방**: `/api/v1/planets/*` - 채팅방 관리
6. **메시지**: `/api/v1/messages/*` - 메시지 CRUD
7. **알림**: `/api/v1/notifications/*` - 알림 관리
8. **파일**: `/api/v1/file-uploads/*` - 파일 업로드/다운로드
9. **WebSocket**: `/websocket` - 실시간 통신

### CRUD 프레임워크 활용
- **전체 CRUD 활용**: 11개 모듈이 `@foryourdev/nestjs-crud` 사용
- **자동 생성 비율**: 표준 CRUD 작업의 약 85%가 자동 생성
- **커스텀 보완**: 특수 비즈니스 로직은 커스텀 엔드포인트로 구현

## 🔐 보안 가이드라인

### 인증 및 권한
- 모든 API는 `@UseGuards(AuthGuard)` 사용
- JWT 토큰 기반 인증 (Access Token + Refresh Token)
- 소셜 로그인 검증 (Google OAuth, Apple Sign-In)

### 데이터 보호
- 민감한 데이터는 `@Exclude()` 데코레이터 사용
- 환경 변수로 시크릿 관리
- bcrypt를 통한 관리자 비밀번호 해싱

### API 보안
- CRUD 데코레이터에서 `allowedFilters`, `allowedParams`, `allowedIncludes` 명시
- Rate Limiting 적용
- CORS 설정
- 상대 경로 import 사용 (절대 경로 금지)

## 🎯 최근 변경사항 (2025년 1월)

### 엔티티 간소화
1. **User 엔티티 간소화**
   - 제거된 필드: `language`, `timezone`, `lastSeenAt`
   - 마이그레이션: `RemoveUserLanguageTimezone`

2. **Profile 엔티티 대폭 간소화**
   - 유지된 필드: `nickname`, `name`, `gender`, `age`, `occupation` (5개만)
   - 제거된 필드: `bio`, `profileImage`, `coverImage`, `birthday`, `hobbies`, `interests`, `website`, `socialLinks`, `education`, `work`, `skills`, `profileImageUrl`, `settings`
   - 마이그레이션: `SimplifyProfileEntity`

3. **Travel 엔티티 대폭 간소화**
   - 유지된 필드: `name`, `description`, `imageUrl`, `status`, `startDate`, `endDate`, `visibility`, `inviteCode`
   - 제거된 필드: `inviteCodeEnabled`, `maxPlanets`, `maxGroupMembers`, `memberCount`, `planetCount`, `totalMessages`, `lastActivityAt`, `settings`, `metadata`
   - 마이그레이션: `SimplifyTravelEntity`

## 📈 성능 최적화

### 데이터베이스 최적화
- **복합 인덱스**: Travel `(status, endDate)`, `(visibility, status)`
- **단일 인덱스**: Profile의 각 필드별 인덱스
- **Eager/Lazy Loading**: 관계별 최적화된 로딩 전략
- **Count 필드 비정규화**: memberCount, planetCount 등

### 캐싱 전략
- Redis 기반 캐싱
- TTL 전략 적용
- 실시간 데이터 동기화

### 실시간 통신 최적화
- WebSocket 연결 풀링
- Redis Pub/Sub for 스케일링
- 배치 처리 for 읽음 확인

## 🤝 기여 가이드

### 코드 스타일
- TypeScript 엄격 모드
- ESLint + Prettier 설정 준수
- 상대 경로 import 사용 (절대 경로 금지)
- 한글 주석 및 문서 작성 시 인코딩 주의

### 커밋 컨벤션
- feat: 새로운 기능
- fix: 버그 수정
- docs: 문서 업데이트
- refactor: 코드 리팩토링
- test: 테스트 추가/수정
- chore: 빌드 및 설정 변경

### 개발 주의사항
- **패키지 매니저**: yarn만 사용 (npm 사용 금지)
- **파일 경로**: 상대 경로만 사용
- **환경 변수**: 민감한 정보는 반드시 .env 파일에
- **한글 인코딩**: UTF-8 인코딩 확인

## 📞 지원

프로젝트 관련 문의사항이나 이슈는 GitHub Issues를 통해 등록해주세요.

---
*Last Updated: 2025년 1월*
*Generated by: Claude Code*