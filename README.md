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
- 🚀 **Railway PostgreSQL**: Railway 호스팅 PostgreSQL 데이터베이스 연결

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

# SSL 설정
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

## 시작하기

### 1. 의존성 설치

```bash
npm install
```

### 2. 환경변수 설정

`.env` 파일을 생성하고 위의 환경변수들을 설정하세요.

### 3. 데이터베이스 마이그레이션

```bash
# 마이그레이션 생성
npm run migration:generate -- InitialMigration

# 마이그레이션 실행
npm run migration:run
```

### 4. 개발 서버 실행

```bash
npm run start:dev
```

### 5. 빌드

```bash
npm run build
```

### 6. 프로덕션 실행

```bash
npm run start:prod
```

## API 엔드포인트

### 인증 API

#### 일반 로그인/회원가입

- `POST /api/v1/auth/sign/up` - 회원가입
- `POST /api/v1/auth/sign/in` - 로그인
- `POST /api/v1/auth/sign/refresh` - Access Token 갱신
- `POST /api/v1/auth/sign/out` - 로그아웃

#### 소셜 로그인

- `GET /api/v1/auth/google` - Google 로그인 시작
- `GET /api/v1/auth/google/callback` - Google 로그인 콜백
- `GET /api/v1/auth/kakao` - Kakao 로그인 시작
- `GET /api/v1/auth/kakao/callback` - Kakao 로그인 콜백
- `GET /api/v1/auth/naver` - Naver 로그인 시작
- `GET /api/v1/auth/naver/callback` - Naver 로그인 콜백
- `GET /api/v1/auth/apple` - Apple 로그인 시작
- `GET /api/v1/auth/apple/callback` - Apple 로그인 콜백

### 사용자 API

기본 CRUD 엔드포인트가 자동으로 생성됩니다:

- `GET /api/v1/users` - 모든 사용자 조회 (페이지네이션, 필터링 지원)
- `GET /api/v1/users/:id` - 특정 사용자 조회
- `GET /api/v1/users/me` - 현재 로그인한 사용자 정보 조회 (인증 필요)
- `POST /api/v1/users` - 사용자 생성
- `PUT /api/v1/users/:id` - 사용자 업데이트
- `DELETE /api/v1/users/:id` - 사용자 삭제

## 프로젝트 구조

```
src/
├── common/               # 공통 유틸리티
│   ├── constants/        # 상수
│   ├── decorators/       # 데코레이터
│   └── interceptors/     # 인터셉터
├── config/               # 설정 파일
│   ├── database.config.ts
│   └── jwt.config.ts
├── guards/               # 가드
│   ├── admin.guard.ts
│   ├── auth.guard.ts
│   └── dev-only.guard.ts
├── migrations/           # 데이터베이스 마이그레이션
├── modules/              # 모듈
│   ├── app.module.ts     # 루트 모듈
│   ├── auth/             # 인증 모듈
│   ├── schema/           # 스키마 모듈 (개발용)
│   └── users/            # 사용자 모듈
└── main.ts               # 진입점
```

## 마이그레이션

이 템플릿은 TypeORM 마이그레이션을 사용합니다:

```bash
# 새 마이그레이션 생성
npm run migration:generate -- MigrationName

# 마이그레이션 실행
npm run migration:run

# 마이그레이션 되돌리기
npm run migration:revert
```

## 개발 도구

### 스키마 모듈 (개발 환경에서만)

개발 환경에서는 스키마 모듈이 자동으로 활성화되어 데이터베이스 구조와 CRUD 메타데이터를 확인할 수 있습니다:

- `GET /schema` - 데이터베이스 스키마 조회
- CRUD 엔드포인트의 메타데이터 및 검증 규칙 확인

## 보안 고려사항

- 프로덕션에서는 `DATABASE_SYNCHRONIZE=false`로 설정
- JWT_SECRET은 반드시 강력한 키로 변경
- 환경변수 파일(.env)을 git에 커밋하지 않도록 주의
- CORS 설정 확인
- 소셜 로그인 콜백 URL의 HTTPS 사용 권장

## 참고 자료

- [NestJS Documentation](https://docs.nestjs.com/)
- [@foryourdev/nestjs-crud Documentation](https://github.com/foryourdev/nestjs-crud)
- [TypeORM Documentation](https://typeorm.io/)
- [Railway PostgreSQL Documentation](https://docs.railway.app/databases/postgresql)
