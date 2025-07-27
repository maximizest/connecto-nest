# 🌳 환경별 자동 배포 가이드

## 브랜치 전략

### 📋 브랜치 → 환경 매핑
- `main` → **Production** 환경 (운영)
- `staging` → **Staging** 환경 (사전 배포)  
- `develop` → **Development** 환경 (개발)

---

## 🏭 Production 환경 (.env 설정)

**브랜치**: `main`  
**도메인**: `https://yourapp.railway.app`

```bash
# 서버 설정
NODE_ENV=production
PORT=${{PORT}}

# JWT 설정 (🚨 강력한 시크릿 필수!)
JWT_SECRET=Pr0d_Super_Strong_JWT_Secret_Key_64_Characters_Long_Random_String_2024
JWT_ACCESS_TOKEN_EXPIRES_IN=15m
JWT_REFRESH_TOKEN_EXPIRES_IN=7d

# 데이터베이스 (Railway PostgreSQL)
DATABASE_TYPE=postgres
DATABASE_HOST=${{Postgres.PGHOST}}
DATABASE_PORT=${{Postgres.PGPORT}}
DATABASE_USERNAME=${{Postgres.PGUSER}}
DATABASE_PASSWORD=${{Postgres.PGPASSWORD}}
DATABASE_NAME=${{Postgres.PGDATABASE}}
DATABASE_SYNCHRONIZE=false
DATABASE_LOGGING=false

# SSL & 보안
DATABASE_SSL=true
DATABASE_SSL_REJECT_UNAUTHORIZED=true

# 고성능 설정
DATABASE_MAX_CONNECTIONS=50
DATABASE_MIN_CONNECTIONS=10
LOG_LEVEL=warn

# 프론트엔드
FRONTEND_URL=https://yourdomain.com
```

---

## 🧪 Staging 환경 (.env 설정)

**브랜치**: `staging`  
**도메인**: `https://yourapp-staging.railway.app`

```bash
# 서버 설정
NODE_ENV=staging
PORT=${{PORT}}

# JWT 설정
JWT_SECRET=Staging_JWT_Secret_Key_Different_From_Production_2024
JWT_ACCESS_TOKEN_EXPIRES_IN=30m  # 테스트용 longer
JWT_REFRESH_TOKEN_EXPIRES_IN=3d

# 데이터베이스 (별도 Staging DB)
DATABASE_TYPE=postgres
DATABASE_HOST=${{StagingPostgres.PGHOST}}
DATABASE_PORT=${{StagingPostgres.PGPORT}}
DATABASE_USERNAME=${{StagingPostgres.PGUSER}}
DATABASE_PASSWORD=${{StagingPostgres.PGPASSWORD}}
DATABASE_NAME=${{StagingPostgres.PGDATABASE}}
DATABASE_SYNCHRONIZE=false
DATABASE_LOGGING=true  # 디버깅용

# SSL 설정
DATABASE_SSL=true
DATABASE_SSL_REJECT_UNAUTHORIZED=true

# 중간 성능 설정
DATABASE_MAX_CONNECTIONS=20
DATABASE_MIN_CONNECTIONS=5
LOG_LEVEL=info

# 프론트엔드 (Staging)
FRONTEND_URL=https://staging.yourdomain.com
```

---

## 🔧 Development 환경 (.env 설정)

**브랜치**: `develop`  
**도메인**: `https://yourapp-dev.railway.app`

```bash
# 서버 설정
NODE_ENV=development
PORT=${{PORT}}

# JWT 설정 (개발용)
JWT_SECRET=Dev_JWT_Secret_Key_For_Development_Environment_2024
JWT_ACCESS_TOKEN_EXPIRES_IN=2h   # 개발 편의성
JWT_REFRESH_TOKEN_EXPIRES_IN=30d

# 데이터베이스 (개발용 DB)
DATABASE_TYPE=postgres
DATABASE_HOST=${{DevPostgres.PGHOST}}
DATABASE_PORT=${{DevPostgres.PGPORT}}
DATABASE_USERNAME=${{DevPostgres.PGUSER}}
DATABASE_PASSWORD=${{DevPostgres.PGPASSWORD}}
DATABASE_NAME=${{DevPostgres.PGDATABASE}}
DATABASE_SYNCHRONIZE=true   # 개발용 auto-sync
DATABASE_LOGGING=true       # 디버깅용

# SSL 설정
DATABASE_SSL=true
DATABASE_SSL_REJECT_UNAUTHORIZED=false  # 개발 편의성

# 개발용 설정
DATABASE_MAX_CONNECTIONS=10
DATABASE_MIN_CONNECTIONS=2
LOG_LEVEL=debug

# 프론트엔드 (로컬/개발)
FRONTEND_URL=http://localhost:5173
```

---

## 🚀 Railway 환경 설정 단계

### 1. Railway에서 환경 분리
```bash
# Railway CLI 설치 (필요시)
npm install -g @railway/cli

# 로그인
railway login

# 프로젝트 연결
railway link

# 환경별 서비스 생성
railway environment create production
railway environment create staging  
railway environment create development
```

### 2. 브랜치별 자동 연결
1. **Railway 대시보드** → **Settings** → **Environment**
2. 각 환경에서 **Source** 설정:
   - **Production**: `main` 브랜치
   - **Staging**: `staging` 브랜치  
   - **Development**: `develop` 브랜치

### 3. 환경변수 일괄 설정
```bash
# Production 환경변수 설정
railway variables set NODE_ENV=production --environment production
railway variables set JWT_SECRET=your-strong-secret --environment production

# Staging 환경변수 설정  
railway variables set NODE_ENV=staging --environment staging
railway variables set JWT_SECRET=your-staging-secret --environment staging

# Development 환경변수 설정
railway variables set NODE_ENV=development --environment development
railway variables set JWT_SECRET=your-dev-secret --environment development
```

---

## 🔄 개발 워크플로우

### 🏃‍♂️ **일반 개발 흐름**
```bash
# 1. 기능 개발
git checkout develop
git pull origin develop

# 2. 새 기능 브랜치 생성
git checkout -b feature/new-feature

# 3. 개발 및 커밋
git add .
git commit -m "feat: add new feature"

# 4. develop에 머지
git checkout develop
git merge feature/new-feature
git push origin develop  # 🚀 자동으로 Dev 환경 배포

# 5. 스테이징 테스트
git checkout staging
git merge develop
git push origin staging  # 🚀 자동으로 Staging 환경 배포

# 6. 프로덕션 릴리즈
git checkout main
git merge staging
git push origin main     # 🚀 자동으로 Production 환경 배포
```

### 🆘 **핫픽스 흐름**
```bash
# 1. 프로덕션 이슈 발생
git checkout main
git checkout -b hotfix/critical-fix

# 2. 수정 및 커밋
git add .
git commit -m "fix: critical production issue"

# 3. 모든 브랜치에 적용
git checkout main
git merge hotfix/critical-fix
git push origin main     # 🚀 즉시 Production 배포

git checkout staging
git merge main
git push origin staging

git checkout develop
git merge main
git push origin develop
```

---

## 📊 환경별 모니터링

### 🔍 **헬스체크 엔드포인트**
- **Production**: `https://yourapp.railway.app/api/v1/users`
- **Staging**: `https://yourapp-staging.railway.app/api/v1/users`  
- **Development**: `https://yourapp-dev.railway.app/api/v1/users`

### 📈 **로그 모니터링**
```bash
# Railway CLI로 실시간 로그 확인
railway logs --environment production
railway logs --environment staging
railway logs --environment development
```

### 🚨 **알림 설정**
- **Production**: Slack/Discord 알림 설정 권장
- **Staging**: 이메일 알림
- **Development**: Railway 대시보드만

---

## ⚠️ **중요 주의사항**

### 🔒 **보안**
- 각 환경마다 **다른 JWT_SECRET** 사용
- Production은 **가장 강력한 시크릿** 사용
- 환경변수는 **Railway Variables**에만 저장

### 🗄️ **데이터베이스**
- 각 환경마다 **별도 데이터베이스** 사용 권장
- Production DB는 **백업 자동화** 필수
- Development는 **데이터 리셋 가능하게** 설정

### 🚀 **배포**
- `main` 브랜치는 **항상 안정적인 코드**만 유지
- **Staging에서 충분한 테스트** 후 Production 배포
- **롤백 계획** 항상 준비 