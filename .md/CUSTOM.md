# Custom Routes Documentation

이 문서는 `@foryourdev/nestjs-crud` 패키지의 자동 CRUD 라우트를 사용하지 않는 커스텀 API 엔드포인트를 정리합니다.

## 1. Auth Module (`/api/v1/auth`)

### 소셜 로그인 관련
- **POST `/sign/social`**
  - 역할: Google/Apple 소셜 로그인 처리
  - 소셜 제공자의 토큰을 검증하고 JWT 토큰 발급
  - 신규 사용자는 자동 회원가입 처리

- **POST `/sign/refresh`**
  - 역할: JWT 액세스 토큰 갱신
  - Refresh 토큰을 사용하여 새로운 액세스 토큰 발급

- **POST `/sign/out`**
  - 역할: 로그아웃 처리
  - 서버에 저장된 Refresh 토큰 삭제

## 2. File Upload Module (`/api/v1/file-uploads`)

### 파일 업로드 관련
- **POST `/presigned-url`**
  - 역할: Cloudflare R2 Direct Upload용 Presigned URL 발급
  - 클라이언트가 직접 R2로 업로드할 수 있는 임시 URL 생성
  - 최대 500MB 파일 지원

- **POST `/complete`**
  - 역할: Direct Upload 완료 확인
  - 클라이언트의 업로드 완료 후 서버에서 검증 및 메타데이터 저장
  - 비디오 파일은 자동 처리 시작

- **DELETE `/:id/cancel`**
  - 역할: 진행 중인 업로드 취소
  - 업로드 레코드 상태를 CANCELLED로 변경
  - R2에서 파일 삭제 (존재하는 경우)

### 파일 다운로드/스트리밍 관련
- **GET `/:id/download-url`**
  - 역할: 파일 다운로드용 임시 URL 생성
  - 최대 24시간 유효한 다운로드 URL 제공
  - 권한 검증 후 URL 발급

- **GET `/:id/stream`**
  - 역할: 비디오/오디오 스트리밍 URL 제공
  - HTTP Range 요청 지원으로 부분 다운로드 가능
  - HTML5 비디오/오디오 태그와 호환

## 3. Message Module (`/api/v1/messages`)

### 메시지 컨텍스트 관련
- **GET `/:messageId/context`**
  - 역할: 특정 메시지 주변 컨텍스트 조회
  - 메시지 전후 20개씩 조회 (기본값)
  - 대화의 흐름 파악용

## 4. Read Receipt Module (`/api/v1/read-receipts`)

### 읽음 처리 관련
- **POST `/mark-read`**
  - 역할: 개별 메시지 읽음 처리
  - 읽음 영수증 생성 또는 업데이트
  - 실시간 읽음 상태 동기화 이벤트 발생

- **POST `/mark-multiple-read`**
  - 역할: 여러 메시지 일괄 읽음 처리
  - messageIds 배열로 다수 메시지 동시 처리
  - 성능 최적화된 일괄 처리

- **POST `/mark-all-read/:planetId`**
  - 역할: Planet의 모든 메시지 읽음 처리
  - 특정 채팅방의 모든 미읽은 메시지 일괄 처리
  - Planet 단위 읽음 상태 초기화

### 읽지 않은 메시지 카운트 관련
- **GET `/unread-count/:planetId`**
  - 역할: 특정 Planet의 읽지 않은 메시지 수 조회
  - 채팅방별 배지 표시용
  - 실시간 업데이트 지원

- **GET `/unread-counts/my`**
  - 역할: 사용자의 모든 Planet별 읽지 않은 메시지 수 조회
  - 전체 알림 카운트 집계
  - 메인 화면 배지 표시용

## 5. Notification Module (`/api/v1/notifications`)

### 알림 조회 관련
- **GET `/unread-count`**
  - 역할: 읽지 않은 알림 개수 조회
  - 앱 배지 표시용
  - 실시간 업데이트 지원

### 알림 읽음 처리 관련
- **PATCH `/read-multiple`**
  - 역할: 여러 알림 일괄 읽음 처리
  - notificationIds 배열로 다수 알림 동시 처리

- **PATCH `/read-all`**
  - 역할: 모든 알림 읽음 처리
  - 사용자의 모든 미읽은 알림 일괄 처리

### 푸시 토큰 관리 관련
- **POST `/push-token`**
  - 역할: FCM 푸시 토큰 등록
  - 디바이스별 토큰 관리
  - 멀티 디바이스 지원

- **POST `/push-token/unregister`**
  - 역할: 푸시 토큰 등록 해제
  - 로그아웃 시 토큰 제거
  - 디바이스별 선택적 해제

- **GET `/push-tokens`**
  - 역할: 내 푸시 토큰 목록 조회
  - 등록된 모든 디바이스 확인
  - 토큰 관리 화면용

### 테스트 관련
- **POST `/test`** (개발 환경 전용)
  - 역할: 테스트 알림 발송
  - 푸시 알림 테스트용
  - 개발/디버깅 목적

## 6. Schema Module (`/api/v1/schema`) - 개발 환경 전용

### 스키마 조회 관련
- **GET `/`**
  - 역할: 전체 엔티티 스키마 목록 조회
  - 데이터베이스 구조 파악
  - API 문서 자동 생성용

- **GET `/:entityName`**
  - 역할: 특정 엔티티 상세 스키마 조회
  - 필드, 관계, 인덱스 정보 제공
  - 개발자 디버깅용

## 특징 및 패턴

### 공통 패턴
1. **일괄 처리 API**: 성능 최적화를 위한 벌크 작업 지원
2. **카운트 API**: UI 배지 표시를 위한 집계 데이터 제공
3. **상태 변경 API**: 읽음/미읽음 등 상태 토글 처리
4. **실시간 동기화**: WebSocket 이벤트와 연동된 상태 업데이트

### 보안 고려사항
- 모든 커스텀 라우트는 `AuthGuard` 적용 (스키마 제외)
- 권한 검증 로직 내장
- 사용자별 데이터 격리

### 성능 최적화
- 일괄 처리 API로 네트워크 요청 감소
- 캐싱 전략 적용
- 비동기 처리 및 이벤트 기반 아키텍처

## WebSocket Gateway

WebSocket은 별도의 Gateway를 통해 구현되며, HTTP API와는 별개로 동작합니다.
- 경로: `ws://[host]/socket.io`
- 인증: JWT 토큰 기반
- 주요 이벤트: 메시지 송수신, 타이핑 인디케이터, 온라인 상태 등

## CRUD 전환 완료 현황

### ✅ CRUD로 전환 완료된 라우트

#### 1. Message Module
- **~~PUT `/:id/edit`~~** → CRUD `update` 액션으로 전환 완료
  - `BeforeUpdate` 훅에서 편집 권한과 시간 제한 검증
  - `AfterUpdate` 훅에서 실시간 이벤트 발생

#### 2. Notification Module
- **~~PATCH `/:id/read`~~** → CRUD `update` 액션으로 전환 완료
  - `BeforeUpdate` 훅에서 isRead 필드 업데이트 처리
  - 권한 검증 포함

### 🔄 CRUD로 전환 가능하지만 미전환 라우트

#### 1. Read Receipt Module  
- **POST `/mark-read`** → `create` 액션으로 부분 전환 가능
  - 이유: 기본적으로 엔티티 생성/업데이트 작업
  - 현재 구현: 이미 `BeforeCreate` 훅에서 upsert 로직 처리 중
  - 개선점: 완전한 CRUD 전환을 위해 리팩토링 필요

#### 2. Notification Module
- **GET `/push-tokens`** → `index` 액션으로 전환 가능
  - 이유: 표준 목록 조회 작업
  - 전환 방법: PushToken 엔티티 생성 후 CRUD `index` 사용

#### 3. Schema Module
- **GET `/`** → `index` 액션으로 전환 가능
- **GET `/:entityName`** → `show` 액션으로 전환 가능
  - 이유: 표준 조회 작업
  - 단, 동적 스키마 정보 제공이므로 별도 엔티티 설계 필요

### ❌ CRUD로 전환 불가능한 라우트

#### 1. Auth Module (모든 라우트)
- **POST `/sign/social`**, **POST `/sign/refresh`**, **POST `/sign/out`**
  - 이유: 인증/토큰 관련 특수 로직으로 엔티티 CRUD와 무관
  - JWT 토큰 생성, 검증, 폐기 등 상태 없는(stateless) 작업

#### 2. File Upload Module
- **POST `/presigned-url`**
  - 이유: 외부 서비스(Cloudflare R2) URL 생성 작업
  - 엔티티 생성이 아닌 임시 URL 발급

- **POST `/complete`**
  - 이유: 복잡한 검증 및 외부 서비스 확인 로직
  - 현재 구현: `BeforeCreate` 훅 활용 중이나 완전한 CRUD 패턴과 불일치

- **DELETE `/:id/cancel`**
  - 이유: 삭제가 아닌 상태 변경 + 외부 리소스 정리
  - 트랜잭션 처리와 외부 서비스 호출 포함

- **GET `/:id/download-url`**, **GET `/:id/stream`**
  - 이유: 엔티티 조회가 아닌 동적 URL 생성
  - 외부 서비스와의 통신 필요

#### 3. Message Module
- **GET `/:messageId/context`**
  - 이유: 단순 조회가 아닌 복잡한 컨텍스트 계산
  - 전후 메시지 조회 및 정렬 등 커스텀 로직

#### 4. Read Receipt Module
- **POST `/mark-multiple-read`**, **POST `/mark-all-read/:planetId`**
  - 이유: 일괄 처리 작업으로 단일 엔티티 CRUD 패턴 벗어남
  - 복수 레코드 동시 생성/업데이트 및 트랜잭션 처리

- **GET `/unread-count/:planetId`**, **GET `/unread-counts/my`**
  - 이유: 집계 쿼리로 엔티티 조회가 아닌 계산 작업
  - COUNT, GROUP BY 등 복잡한 SQL 필요

#### 5. Notification Module
- **GET `/unread-count`**
  - 이유: 집계 쿼리 (COUNT)
  
- **PATCH `/read-multiple`**, **PATCH `/read-all`**
  - 이유: 일괄 업데이트 작업
  - 복수 레코드 동시 처리 필요

- **POST `/push-token`**, **POST `/push-token/unregister`**
  - 이유: 외부 서비스(FCM) 연동 및 복잡한 디바이스 관리
  - 토큰 검증, 중복 확인, 디바이스별 처리 등

- **POST `/test`**
  - 이유: 테스트 전용 특수 목적 API
  - 개발 환경 전용 디버깅 도구

### 🎯 전환 권장 사항

#### 우선순위 높음 (간단한 전환)
1. Message의 `PUT /:id/edit` → CRUD `update`
2. Notification의 `PATCH /:id/read` → CRUD `update`

#### 우선순위 중간 (엔티티 재설계 필요)
1. PushToken을 별도 엔티티로 분리하여 CRUD 적용
2. ReadReceipt의 `mark-read`를 완전한 CRUD `create`로 전환

#### 전환 불필요 (커스텀 유지)
- 인증 관련 모든 API
- 일괄 처리 API
- 집계/카운트 API
- 외부 서비스 연동 API

### 📊 전환 통계
- 전체 커스텀 라우트: 28개 → 26개 (2개 전환 완료)
- CRUD로 전환 완료: 2개 
  - Message의 `PUT /:id/edit`
  - Notification의 `PATCH /:id/read`
- CRUD로 전환 가능하지만 미전환: 3개
  - ReadReceipt의 `POST /mark-read`
  - Notification의 `GET /push-tokens`  
  - Schema의 조회 API들
- CRUD로 전환 불가능: 23개 (82.1%)

대부분의 커스텀 라우트는 비즈니스 로직의 복잡성, 외부 서비스 연동, 일괄 처리, 집계 연산 등의 이유로 CRUD 패턴으로 전환하기 어렵습니다.