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

### 메시지 편집 관련
- **PUT `/:id/edit`**
  - 역할: 메시지 내용 수정
  - 본인이 작성한 메시지만 수정 가능
  - 수정 시간 및 수정 여부 기록

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
- **PATCH `/:id/read`**
  - 역할: 개별 알림 읽음 처리
  - 특정 알림을 읽음 상태로 변경

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