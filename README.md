<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

[circleci-image]: https://img.shields.io/circleci/build/github/nestjs/nest/master?token=abc123def456
[circleci-url]: https://circleci.com/gh/nestjs/nest

  <p align="center">A progressive <a href="http://nodejs.org" target="_blank">Node.js</a> framework for building efficient and scalable server-side applications.</p>
    <p align="center">
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/v/@nestjs/core.svg" alt="NPM Version" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/l/@nestjs/core.svg" alt="Package License" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/dm/@nestjs/common.svg" alt="NPM Downloads" /></a>
<a href="https://circleci.com/gh/nestjs/nest" target="_blank"><img src="https://img.shields.io/circleci/build/github/nestjs/nest/master" alt="CircleCI" /></a>
<a href="https://discord.gg/G7Qnnhy" target="_blank"><img src="https://img.shields.io/badge/discord-online-brightgreen.svg" alt="Discord"/></a>
<a href="https://opencollective.com/nest#backer" target="_blank"><img src="https://opencollective.com/nest/backers/badge.svg" alt="Backers on Open Collective" /></a>
<a href="https://opencollective.com/nest#sponsor" target="_blank"><img src="https://opencollective.com/nest/sponsors/badge.svg" alt="Sponsors on Open Collective" /></a>
  <a href="https://paypal.me/kamilmysliwiec" target="_blank"><img src="https://img.shields.io/badge/Donate-PayPal-ff3f59.svg" alt="Donate us"/></a>
    <a href="https://opencollective.com/nest#sponsor"  target="_blank"><img src="https://img.shields.io/badge/Support%20us-Open%20Collective-41B883.svg" alt="Support us"></a>
  <a href="https://twitter.com/nestframework" target="_blank"><img src="https://img.shields.io/twitter/follow/nestframework.svg?style=social&label=Follow" alt="Follow us on Twitter"></a>
</p>
  <!--[![Backers on Open Collective](https://opencollective.com/nest/backers/badge.svg)](https://opencollective.com/nest#backer)
  [![Sponsors on Open Collective](https://opencollective.com/nest/sponsors/badge.svg)](https://opencollective.com/nest#sponsor)-->

# NestJS Template

이 프로젝트는 [NestJS](https://nestjs.com/)와 [@foryourdev/nestjs-crud](https://github.com/foryourdev/nestjs-crud)를 사용하여 구축된 RESTful API 템플릿입니다.

## 특징

- 🔌 **자동 CRUD 생성**: @foryourdev/nestjs-crud를 사용하여 자동으로 CRUD 엔드포인트 생성
- 🗄️ **TypeORM 통합**: PostgreSQL 데이터베이스와 TypeORM을 사용한 ORM 지원
- 🔍 **쿼리 파싱**: 필터링, 페이지네이션, 정렬, 관계 조인 등 풍부한 쿼리 기능
- ✅ **검증**: class-validator를 사용한 DTO 및 엔티티 검증
- 🔐 **JWT 인증**: JWT 기반 로그인/로그아웃 및 Refresh Token 지원
- 📱 **소셜 로그인**: Google, Apple, Kakao, Naver 소셜 로그인 지원
- 📚 **Swagger**: 자동 API 문서 생성 (추가 설정 필요)
- 🚀 **Railway PostgreSQL**: Railway 호스팅 PostgreSQL 데이터베이스 연결

## 설치된 패키지

### 핵심 패키지
- `@foryourdev/nestjs-crud`: 핵심 CRUD 패키지
- `@nestjs/typeorm`: NestJS TypeORM 통합
- `typeorm`: TypeORM ORM
- `pg`: PostgreSQL 데이터베이스 드라이버
- `class-validator`: 검증 라이브러리
- `class-transformer`: 변환 라이브러리

### 인증 관련 패키지
- `@nestjs/jwt`: JWT 토큰 처리
- `@nestjs/passport`: Passport 통합
- `passport`: Passport 인증 프레임워크
- `passport-jwt`: JWT 전략
- `passport-local`: 로컬 전략
- `bcrypt`: 비밀번호 해싱

### 소셜 로그인 패키지
- `passport-google-oauth20`: Google OAuth 2.0 전략
- `passport-apple`: Apple 로그인 전략
- `passport-kakao`: Kakao 로그인 전략
- `passport-naver-v2`: Naver 로그인 전략

### 타입 정의 (개발 의존성)
- `@types/pg`: PostgreSQL 타입 정의
- `@types/passport-jwt`: Passport JWT 타입 정의
- `@types/passport-local`: Passport Local 타입 정의
- `@types/bcrypt`: bcrypt 타입 정의
- `@types/passport-google-oauth20`: Google OAuth 타입 정의

## 데이터베이스 설정

이 프로젝트는 Railway에서 호스팅되는 PostgreSQL 데이터베이스를 사용합니다.

### 데이터베이스 연결 정보

데이터베이스 연결은 환경변수를 통해 설정됩니다. `src/config/database.config.ts`에서 환경변수를 읽어와 설정됩니다.

⚠️ **보안 주의사항**: 
- 실제 데이터베이스 자격증명은 절대 코드에 하드코딩하지 마세요
- `.env` 파일을 사용하여 환경변수를 관리하고 `.gitignore`에 추가하세요
- 프로덕션 환경에서는 `DATABASE_SYNCHRONIZE=false`로 설정하고 마이그레이션을 사용하세요

## 환경변수 설정

### 필수 환경변수

프로젝트 실행을 위해 다음 환경변수들이 필요합니다:

```bash
# 서버 설정
PORT=3000
NODE_ENV=development

# API 설정
API_VERSION=1
API_PREFIX=api/v

# JWT 설정 (필수)
JWT_SECRET=your-jwt-secret-key-change-this-in-production
JWT_ACCESS_TOKEN_EXPIRES_IN=15m
JWT_REFRESH_TOKEN_EXPIRES_IN=7d

# 데이터베이스 설정 (필수)
DATABASE_TYPE=postgres
DATABASE_HOST=your-database-host
DATABASE_PORT=5432
DATABASE_USERNAME=your-username
DATABASE_PASSWORD=your-secure-password
DATABASE_NAME=your-database-name
DATABASE_SYNCHRONIZE=false
DATABASE_LOGGING=false

# SSL 설정 (Railway용)
DATABASE_SSL=true
DATABASE_SSL_REJECT_UNAUTHORIZED=false

# Frontend URL
FRONTEND_URL=http://localhost:3000
```

### 소셜 로그인 선택적 설정

소셜 로그인은 선택적으로 사용할 수 있습니다. 필요한 플랫폼의 환경변수만 설정하면 해당 소셜 로그인이 활성화됩니다:

```bash

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=http://localhost:3000/auth/google/callback

# Kakao OAuth
KAKAO_CLIENT_ID=your-kakao-client-id
KAKAO_CLIENT_SECRET=your-kakao-client-secret
KAKAO_CALLBACK_URL=http://localhost:3000/auth/kakao/callback

# Naver OAuth
NAVER_CLIENT_ID=your-naver-client-id
NAVER_CLIENT_SECRET=your-naver-client-secret
NAVER_CALLBACK_URL=http://localhost:3000/auth/naver/callback

# Apple OAuth
APPLE_CLIENT_ID=your-apple-service-id
APPLE_TEAM_ID=your-apple-team-id
APPLE_KEY_ID=your-apple-key-id
APPLE_PRIVATE_KEY=your-apple-private-key
APPLE_CALLBACK_URL=http://localhost:3000/auth/apple/callback
```

### 소셜 로그인 설정 가이드

1. **Google OAuth 설정**
   - [Google Cloud Console](https://console.cloud.google.com/)에서 프로젝트 생성
   - OAuth 2.0 클라이언트 ID 생성
   - 승인된 리디렉션 URI에 콜백 URL 추가

2. **Kakao OAuth 설정**  
   - [카카오 개발자](https://developers.kakao.com/)에서 앱 생성
   - 플랫폼 설정에서 Web 플랫폼의 사이트 도메인 등록
   - Redirect URI 설정

3. **Naver OAuth 설정**
   - [네이버 개발자 센터](https://developers.naver.com/)에서 애플리케이션 등록
   - 서비스 URL과 Callback URL 설정

4. **Apple OAuth 설정**
   - [Apple Developer](https://developer.apple.com/)에서 App ID 및 Service ID 생성
   - Sign in with Apple 키 생성
   - 개인키(.p8 파일) 다운로드하여 환경변수에 설정

## 시작하기

### 1. 의존성 설치

```bash
npm install
```

### 2. 개발 서버 실행

```bash
npm run start:dev
```

### 3. 빌드

```bash
npm run build
```

### 4. 프로덕션 실행

```bash
npm run start:prod
```

## API 엔드포인트

### 인증 API

#### 일반 로그인/회원가입
- `POST /auth/sign/up` - 회원가입
- `POST /auth/sign/in` - 로그인
- `POST /auth/sign/refresh` - Access Token 갱신
- `POST /auth/sign/out` - 로그아웃

#### 소셜 로그인
- `GET /auth/google` - Google 로그인 시작
- `GET /auth/google/callback` - Google 로그인 콜백
- `GET /auth/kakao` - Kakao 로그인 시작  
- `GET /auth/kakao/callback` - Kakao 로그인 콜백
- `GET /auth/naver` - Naver 로그인 시작
- `GET /auth/naver/callback` - Naver 로그인 콜백
- `GET /auth/apple` - Apple 로그인 시작
- `GET /auth/apple/callback` - Apple 로그인 콜백

#### 요청/응답 예시

**회원가입**
```bash
POST /auth/sign/up
{
  "name": "홍길동",
  "email": "hong@example.com",
  "password": "password123",
  "phone": "010-1234-5678",
  "role": "user"
}
```

**로그인**
```bash
POST /auth/sign/in
{
  "email": "hong@example.com",
  "password": "password123"
}

# 응답
{
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

**토큰 갱신**
```bash
POST /auth/sign/refresh
Authorization: Bearer {refresh_token}

# 응답
{
  "accessToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

### 사용자 API

기본 CRUD 엔드포인트가 자동으로 생성됩니다:

- `GET /users` - 모든 사용자 조회 (페이지네이션, 필터링 지원)
- `GET /users/:id` - 특정 사용자 조회
- `GET /users/me` - 현재 로그인한 사용자 정보 조회 (인증 필요)
- `POST /users` - 사용자 생성
- `PUT /users/:id` - 사용자 업데이트
- `DELETE /users/:id` - 사용자 삭제

**인증이 필요한 요청 예시**
```bash
GET /users/me
Authorization: Bearer {access_token}
```

### 쿼리 파라미터 예시

#### 필터링 (Filtering)

**⚠️ 중요**: @foryourdev/nestjs-crud는 **underscore 구분자 방식**을 사용합니다:

```bash
# ✅ 올바른 형식
GET /users?filter[name_eq]=홍길동
GET /users?filter[email_like]=%gmail.com
GET /users?filter[age_gte]=18

# ❌ 지원하지 않는 형식
GET /users?filter[name][$eq]=홍길동     # 작동하지 않음
GET /users?filter=name||$cont||John    # 작동하지 않음
```

#### 주요 필터 연산자

```bash
# 기본 비교
GET /users?filter[name_eq]=홍길동         # 같음
GET /users?filter[status_ne]=inactive    # 다름

# 크기 비교
GET /users?filter[age_gt]=18             # 초과
GET /users?filter[age_gte]=18            # 이상
GET /users?filter[age_lt]=65             # 미만
GET /users?filter[age_lte]=65            # 이하
GET /users?filter[age_between]=18,65     # 범위

# 문자열 패턴
GET /users?filter[name_like]=%김%         # LIKE 패턴
GET /users?filter[email_start]=test      # 시작 문자
GET /users?filter[email_end]=.com        # 끝 문자

# 배열 검색
GET /users?filter[id_in]=1,2,3,4,5       # 포함 (IN)
GET /users?filter[role_not_in]=guest     # 미포함 (NOT IN)

# NULL 체크
GET /users?filter[deleted_at_null]=true  # NULL 값
GET /users?filter[email_not_null]=true   # NOT NULL
```

#### 관계 필터링 및 포함

```bash
# 관계 필터링 (allowedFilters에 설정된 경우만)
GET /users?filter[department.name_eq]=개발팀

# 관계 포함 (allowedIncludes에 설정된 경우만)
GET /users?include=department            # 단일 관계
GET /users?include=department,posts      # 다중 관계
GET /posts?include=author,comments.author # 중첩 관계
```

#### 정렬 및 페이지네이션

```bash
# 정렬
GET /users?sort=name                     # 이름 오름차순
GET /users?sort=-created_at              # 생성일 내림차순
GET /users?sort=role,name,-created_at    # 다중 필드 정렬

# 페이지네이션
GET /users?page[number]=1&page[size]=10     # 페이지 번호 방식
GET /users?page[offset]=0&page[limit]=10    # 오프셋 방식

# 복합 쿼리
GET /users?filter[status_eq]=active&filter[age_gte]=18&sort=-created_at&page[number]=1&page[size]=10
```

## 프로젝트 구조

```
src/
├── controllers/        # 컨트롤러
│   └── user.controller.ts
├── entities/          # 데이터베이스 엔티티
│   └── user.entity.ts
├── modules/           # 모듈
│   └── user.module.ts
├── services/          # 서비스
│   └── user.service.ts
├── app.module.ts      # 루트 모듈
└── main.ts           # 진입점
```

## 커스터마이징

### 새로운 엔티티 추가

1. `src/entities/`에 새로운 엔티티 생성
2. `src/services/`에 해당 서비스 생성
3. `src/controllers/`에 해당 컨트롤러 생성
4. `src/modules/`에 해당 모듈 생성
5. `app.module.ts`에 새로운 모듈 추가

### CRUD 보안 설정

@foryourdev/nestjs-crud는 강력한 보안 제어 기능을 제공합니다:

```typescript
// user.controller.ts
import { Controller } from '@nestjs/common';
import { Crud } from '@foryourdev/nestjs-crud';
import { User } from './user.entity';
import { UserService } from './user.service';

@Crud({
  entity: User,
  // 보안 설정: 허용된 것만 명시적으로 설정
  allowedFilters: ['name', 'email', 'status'], // 필터링 허용 컬럼
  allowedParams: ['name', 'email', 'phone'],   // 요청 본문 허용 필드
  allowedIncludes: ['department', 'posts'],    // 관계 포함 허용 목록
  only: ['index', 'show', 'create', 'update'], // 활성화할 메서드
  routes: {
    index: {
      allowedFilters: ['name', 'email', 'status', 'createdAt'], // 메서드별 추가 허용
      allowedIncludes: ['department', 'posts', 'posts.comments'], // 메서드별 관계 설정
    },
    show: {
      allowedIncludes: ['department'], // SHOW는 제한적 관계만
    },
    create: {
      allowedParams: ['name', 'email', 'password'], // CREATE는 비밀번호 허용
      hooks: {
        assignBefore: async (body, context) => {
          // 이메일 소문자 변환
          if (body.email) {
            body.email = body.email.toLowerCase();
          }
          return body;
        },
      },
    },
    update: {
      allowedParams: ['name', 'phone'], // UPDATE는 이메일 수정 불가
    },
  },
})
@Controller('users')
export class UserController {
  constructor(public readonly crudService: UserService) {}
}
```

### 커스텀 메서드 추가

컨트롤러에서 @foryourdev/nestjs-crud가 제공하는 기본 메서드 외에 커스텀 메서드를 추가할 수 있습니다.

```typescript
import { ClassValidatedBody } from '@foryourdev/nestjs-crud';

@Get('active')
async getActiveUsers(): Promise<User[]> {
  return this.service.findActiveUsers();
}

@Post('custom')
async createCustomUser(@ClassValidatedBody() userData: any) {
  // allowedParams 필터링 + Entity 검증이 자동으로 적용됨
  return this.service.create(userData);
}
```

## 참고 자료

- [NestJS Documentation](https://docs.nestjs.com/)
- [@foryourdev/nestjs-crud Documentation](https://github.com/foryourdev/nestjs-crud)
- [TypeORM Documentation](https://typeorm.io/)
- [Railway PostgreSQL Documentation](https://docs.railway.app/databases/postgresql)

## 중요한 주의사항

### 필터링 문법
- ✅ **올바른 방법**: `GET /users?filter[email_eq]=test@example.com`
- ❌ **잘못된 방법**: `GET /users?filter[email][$eq]=test@example.com`

### 보안 설정
- `allowedFilters`, `allowedParams`, `allowedIncludes` 미설정 시 **모든 접근이 차단**됩니다
- 프로덕션 환경에서는 반드시 명시적인 허용 목록 설정이 필요합니다

### 현재 프로젝트 설정
현재 UserController는 `allowedFilters: ['email']`만 설정되어 있어 **email 필드만 필터링 가능**합니다:

```bash
# ✅ 작동함
GET /users?filter[email_eq]=test@example.com

# ❌ 작동하지 않음 (allowedFilters에 없음)
GET /users?filter[name_like]=%김%
GET /users?filter[id_gt]=10
```

### 통일된 오류 응답
현재 프로젝트는 `CrudExceptionFilter`를 전역으로 적용하여 모든 오류 응답을 통일된 형식으로 제공합니다:

```typescript
// 기본 NestJS 오류 응답
{
  "message": "Not Found",      // 문자열
  "statusCode": 404
}

// CrudExceptionFilter 적용 후
{
  "message": ["Not Found"],    // 항상 배열 ✨
  "statusCode": 404
}
```

이를 통해 프론트엔드에서 일관된 오류 처리가 가능합니다.