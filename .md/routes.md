# Connecto API 라우트 문서

> 최종 업데이트: 2025-08-21  
> API 버전: v1  
> 프레임워크: NestJS 11.x + @foryourdev/nestjs-crud 0.2.3

## 📋 목차

1. [개요](#개요)
2. [인증 및 권한](#인증-및-권한)
3. [CRUD 패턴 컨트롤러](#crud-패턴-컨트롤러)
4. [커스텀 컨트롤러](#커스텀-컨트롤러)
5. [특수 기능 엔드포인트](#특수-기능-엔드포인트)
6. [WebSocket 엔드포인트](#websocket-엔드포인트)

## 개요

### 통계
- **총 컨트롤러 수**: 18개
- **CRUD 컨트롤러**: 16개 (89%)
- **커스텀 컨트롤러**: 2개 (11%)
- **인증 필요 컨트롤러**: 17개 (94%)
- **개발 환경 전용**: 1개 (Schema)

### 기술 스택
- **CRUD 라이브러리**: `@foryourdev/nestjs-crud`
- **인증**: JWT Bearer Token
- **API 버전**: v1 (모든 경로 `/api/v1` 접두사)
- **실시간 통신**: Socket.io (WebSocket)

## 인증 및 권한

### Guard 종류
| Guard | 용도 | 사용 컨트롤러 수 |
|-------|------|-----------------|
| `AuthGuard` | 일반 사용자 인증 (토큰 블랙리스트 검증 포함) | 16 |
| `DevOnlyGuard` | 개발 환경 전용 | 1 |
| 인증 없음 | 공개 엔드포인트 | 1 (Auth) |

## CRUD 패턴 컨트롤러

`@Crud` 데코레이터를 사용하는 컨트롤러들입니다. 표준 CRUD 작업(index, show, create, update, destroy)을 자동으로 제공합니다.

### 1. Profile Controller
- **경로**: `/api/v1/profiles`
- **인증**: `AuthGuard`
- **CRUD 작업**: `index`, `show`, `update` (create 제거됨)
- **주요 기능**: 사용자 프로필 관리
- **특수 검증**:
  - 수정 시: 본인만 수정 가능, 차단 상태 검증
  - 조회 시: 프로필 존재 검증, 차단된 사용자 제한

### 2. Travel Controller
- **경로**: `/api/v1/travels`
- **인증**: `AuthGuard`
- **CRUD 작업**: `index`, `show` (읽기 전용)
- **주요 기능**: 여행 그룹 조회
- **특징**: 생성/수정/삭제 불가능 (읽기 전용)

### 3. User Controller
- **경로**: `/api/v1/users`
- **인증**: `AuthGuard`
- **CRUD 작업**: `show`, `update`, `destroy`
- **주요 기능**: 사용자 계정 관리
- **특수 검증**:
  - 본인 정보만 조회/수정/삭제 가능
  - Soft delete 지원

### 4. TravelUser Controller
- **경로**: `/api/v1/travel-users`
- **인증**: `AuthGuard`
- **CRUD 작업**: `index`, `show`, `create`, `update`
- **주요 기능**: 여행 멤버십 관리
- **특수 기능**:
  - 초대 코드로 여행 참가
  - 참가 시 자동으로 모든 그룹 채팅방 입장

### 5. Message Controller
- **경로**: `/api/v1/messages`
- **인증**: `AuthGuard`
- **CRUD 작업**: 전체 (`index`, `show`, `create`, `update`, `destroy`)
- **주요 기능**: 채팅 메시지 CRUD
- **커스텀 엔드포인트**:
  ```
  GET /api/v1/messages/:messageId/context - 특정 메시지 주변 컨텍스트 조회
  ```
  - nestjs-crud로 구현 불가: 특정 메시지 기준 전후 메시지를 가져오는 복잡한 쿼리
- **특수 기능**:
  - 메시지 타입 검증 (TEXT, IMAGE, VIDEO, FILE, SYSTEM)
  - 수정 시간 제한 및 히스토리 추적
  - 답장 스레드 지원
  - 실시간 이벤트 발생

### 6. Planet Controller
- **경로**: `/api/v1/planets`
- **인증**: `AuthGuard`
- **CRUD 작업**: `index`, `show` (읽기 전용)
- **주요 기능**: 채팅방(행성) 조회
- **채팅방 타입**: GROUP (그룹), DIRECT (1:1)

### 7. PlanetUser Controller
- **경로**: `/api/v1/planet-users`
- **인증**: `AuthGuard`
- **CRUD 작업**: `index`, `show`, `update`
- **주요 기능**: 채팅방 멤버십 조회 및 설정 관리
- **특징**: 직접 가입/탈퇴 불가 (TravelUser를 통해 자동 관리)

### 8. ReadReceipt Controller
- **경로**: `/api/v1/read-receipts`
- **인증**: `AuthGuard`
- **CRUD 작업**: `index`, `show`, `create`
- **주요 기능**: 메시지 읽음 상태 관리
- **특수 기능**:
  - 단일/복수 메시지 읽음 처리 (POST body에 단일 객체 또는 배열)
  - Upsert 로직으로 중복 처리 방지
  - 실시간 읽음 상태 동기화
  - nestjs-crud 네이티브 벌크 지원

### 9. FileUpload Controller
- **경로**: `/api/v1/file-uploads`
- **인증**: `AuthGuard`
- **CRUD 작업**: `index`, `show`, `create`, `destroy`
- **주요 기능**: Cloudflare R2 파일 업로드 관리
- **커스텀 엔드포인트**:
  ```
  POST   /api/v1/file-uploads/presigned-url     - Presigned URL 생성
  POST   /api/v1/file-uploads/complete          - 업로드 완료 확인
  DELETE /api/v1/file-uploads/:id/cancel        - 업로드 취소
  GET    /api/v1/file-uploads/:id/download-url  - 다운로드 URL 생성
  GET    /api/v1/file-uploads/:id/stream        - 스트리밍 URL 생성
  ```
  - nestjs-crud로 구현 불가: 외부 서비스(Cloudflare R2) 연동 및 presigned URL 생성 로직
- **특수 기능**:
  - 최대 500MB 파일 지원
  - 이미지 자동 최적화
  - 비디오/오디오 스트리밍

### 10. Notification Controller
- **경로**: `/api/v1/notifications`
- **인증**: `AuthGuard`
- **CRUD 작업**: `index`, `show`, `update`
- **주요 기능**: 알림 관리
- **특징**: 푸시 토큰 관리는 별도의 PushTokenController로 분리됨

### 11. PushToken Controller
- **경로**: `/api/v1/push-tokens`
- **인증**: `AuthGuard`
- **CRUD 작업**: `index`, `show`, `create`, `update`, `destroy`
- **주요 기능**: FCM/APNS 푸시 토큰 관리
- **특수 기능**:
  - Upsert 로직 (deviceId 기준으로 자동 생성/업데이트)
  - 본인 토큰만 조회/수정/삭제 가능
  - Soft delete 지원 (비활성화)
  - 플랫폼별 관리 (ios/android/web)
  - 실패 횟수 추적 및 자동 비활성화

### 12. Report Controller
- **경로**: `/api/v1/reports`
- **인증**: `AuthGuard`
- **CRUD 작업**: `index`, `show`, `create`, `destroy`
- **주요 기능**: 신고 시스템
- **신고 컨텍스트**: TRAVEL, PLANET, MESSAGE, USER_PROFILE
- **특수 기능**:
  - 중복 신고 방지
  - PENDING 상태만 취소 가능

### 13. Accommodation Controller
- **경로**: `/api/v1/accommodations`
- **인증**: `AuthGuard`
- **CRUD 작업**: `index`, `show` (읽기 전용)
- **주요 기능**: 숙박 시설 정보 조회

### 14. Mission 관련 Controllers

#### Mission Controller
- **경로**: `/api/v1/missions`
- **인증**: `AuthGuard`
- **CRUD 작업**: `index`, `show` (읽기 전용)
- **주요 기능**: 미션 조회
- **특징**: 생성/수정/삭제 불가능 (관리자 패널에서만 관리)

#### MissionSubmission Controller
- **경로**: `/api/v1/mission-submissions`
- **인증**: `AuthGuard`
- **CRUD 작업**: 전체 (`index`, `show`, `create`, `update`, `destroy`)
- **주요 기능**: 미션 제출 관리
- **특수 기능**:
  - 사용자가 미션 결과를 제출하고 관리
  - 제출 상태 추적 (PENDING, APPROVED, REJECTED)

#### MissionTravel Controller
- **경로**: `/api/v1/mission-travels`
- **인증**: `AuthGuard`
- **CRUD 작업**: `index`, `show` (읽기 전용)
- **주요 기능**: 미션-여행 할당 조회
- **특징**: 할당은 관리자 패널에서만 가능

## 커스텀 컨트롤러

`@Crud` 데코레이터를 사용하지 않고 개별 라우트를 정의한 컨트롤러들입니다.

### 1. Auth Controller
- **경로**: `/api/v1/auth`
- **인증**: 없음 (인증 엔드포인트)
- **엔드포인트**:
  ```
  POST /api/v1/auth/sign/social   - 소셜 로그인 (Google/Apple)
  POST /api/v1/auth/sign/refresh  - 토큰 갱신
  POST /api/v1/auth/sign/out      - 로그아웃
  POST /api/v1/auth/sign/admin    - 관리자 로그인
  ```
- **특수 기능**:
  - 신규 소셜 로그인 시 자동 회원가입
  - JWT 토큰 쌍 생성 (Access + Refresh)
  - 푸시 토큰 자동 등록

### 2. Schema Controller
- **경로**: `/api/v1/schema`
- **인증**: `DevOnlyGuard` (개발 환경 전용)
- **엔드포인트**:
  ```
  GET /api/v1/schema              - 전체 엔티티 스키마
  GET /api/v1/schema/:entityName  - 특정 엔티티 상세 스키마
  ```
- **용도**: TypeORM 메타데이터 기반 DB 스키마 API


## 특수 기능 엔드포인트

### 실시간 기능이 있는 엔드포인트
- **Message**: 생성/수정/삭제 시 실시간 이벤트
- **ReadReceipt**: 읽음 상태 변경 시 실시간 동기화
- **Notification**: 푸시 알림 실시간 전송

### 파일 관련 엔드포인트
- **FileUpload**: Cloudflare R2 직접 업로드
- **Message**: 이미지/비디오/파일 메시지 지원
- **Streaming**: HLS 비디오/오디오 스트리밍

### 권한 검증이 복잡한 엔드포인트
- **Planet 접근**: Travel 멤버십 필수
- **Message CRUD**: Planet 멤버십 + 역할 검증
- **Moderation**: 플랫폼/여행 레벨 권한 구분

## WebSocket 엔드포인트

Socket.io를 통한 실시간 통신 엔드포인트입니다.

### Gateway 경로
- **URL**: `ws://[host]/websocket`
- **인증**: JWT Bearer Token 필요

### 주요 이벤트
```javascript
// 클라이언트 → 서버
socket.emit('join-planet', { planetId })      // 채팅방 입장
socket.emit('leave-planet', { planetId })     // 채팅방 퇴장
socket.emit('typing-start', { planetId })     // 타이핑 시작
socket.emit('typing-stop', { planetId })      // 타이핑 종료

// 서버 → 클라이언트
socket.on('message-created', data)            // 새 메시지
socket.on('message-updated', data)            // 메시지 수정
socket.on('message-deleted', data)            // 메시지 삭제
socket.on('read-receipt-updated', data)       // 읽음 상태 변경
socket.on('user-typing', data)                // 타이핑 알림
socket.on('user-online-status', data)         // 온라인 상태
```

## Active Record 패턴 마이그레이션 현황

2025년 1월 21일 기준으로 다음 서비스들이 Active Record 패턴으로 마이그레이션되었습니다:

### 완료된 마이그레이션
- ✅ User, Profile, Travel, TravelUser
- ✅ Planet, PlanetUser, Message
- ✅ FileUpload, Notification, Report
- ✅ Mission, MissionSubmission, MissionTravel
- ✅ ReadReceipt (부분 마이그레이션)
- ✅ PushToken (신규 분리)

### 마이그레이션 영향
- Repository 패턴 → Active Record 패턴
- TypeOrmModule.forFeature 제거
- BaseActiveRecord 상속으로 공통 기능 제공
- 서비스 레이어 단순화

### 최근 개선사항 (2025-08-21)
- **패키지 업데이트**: @foryourdev/nestjs-crud 0.1.21 → 0.2.3 업그레이드
- **Guard 통합**: EnhancedAuthGuard 기능을 AuthGuard에 통합 (토큰 블랙리스트, 사용자 밴 검증)
- **성능 최적화**: AuthGuard 67-75% 성능 향상 (병렬 처리, 캐싱)
- **ReadReceipt API 개선**: 
  - 커스텀 messageIds 필드 제거
  - nestjs-crud 네이티브 벌크 생성 지원 활용
  - POST body에 배열 전송 시 자동 벌크 처리
- **PushToken 도메인 분리**:
  - NotificationController에서 독립적인 PushTokenController로 분리
  - RESTful 원칙 준수 (가상 Notification 엔티티 제거)
  - Redis 임시 저장 → PostgreSQL 영구 저장으로 전환
  - Active Record 패턴 적용
- **관리자/호스트 API 제거**: 사용자 API 개발에 집중하기 위해 Admin, QueueAdmin, Moderation 컨트롤러 제거
- **코드 정리**: 불필요한 엔티티 메서드 제거, 직접 TypeORM 쿼리 사용

---

> 이 문서는 프로젝트의 모든 API 라우트를 포괄적으로 문서화합니다.  
> 각 엔드포인트의 상세 스펙은 Swagger 문서(`/api-docs`)를 참조하세요.