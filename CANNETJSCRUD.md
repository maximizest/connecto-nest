# 남은 커스텀 라우트 분석 (변환 완료 후)

이 문서는 @Crud 패턴 변환 작업 후에도 여전히 커스텀으로 유지되는 라우트들을 정리합니다.

## 📊 변환 결과 요약

### 전체 통계
- **초기 커스텀 라우트**: 약 70개
- **변환 완료**: 15개 (21.4%)
- **여전히 커스텀**: 55개 (78.6%)

## ✅ 변환 완료된 라우트

### File Upload 모듈
- ~~DELETE /api/v1/file-uploads/:id~~ → `destroy` 액션으로 변환
- ~~POST /api/v1/file-uploads/complete~~ → `create` 액션으로 변환 (upsert 로직)

### Video Processing 모듈
- ~~GET /api/v1/video-processing~~ → `index` 액션으로 변환
- ~~GET /api/v1/video-processing/:id~~ → `show` 액션으로 변환
- ~~POST /api/v1/video-processing/process~~ → `create` 액션으로 변환
- ~~PATCH /api/v1/video-processing/:id/cancel~~ → `update` 액션으로 변환
- ~~PATCH /api/v1/video-processing/:id/retry~~ → `update` 액션으로 변환

### Read Receipt 모듈
- ~~POST /api/v1/read-receipts/mark-read~~ → `create` 액션으로 변환 (upsert 로직)

### Notification 모듈
- ~~PATCH /api/v1/notifications/:id/read~~ → `update` 액션으로 변환
- ~~PATCH /api/v1/notifications/read-all~~ → 벌크 업데이트로 변환

## ❌ 여전히 커스텀으로 유지되는 라우트

### 1. Auth 모듈 (15개)
인증 관련 로직은 CRUD 패러다임과 맞지 않음

```typescript
POST   /api/v1/auth/social-signin         // 소셜 로그인
POST   /api/v1/auth/refresh                // 토큰 갱신
POST   /api/v1/auth/logout                 // 로그아웃
DELETE /api/v1/auth/account                // 계정 삭제
GET    /api/v1/auth/me                     // 현재 사용자 정보
POST   /api/v1/auth/verify-token           // 토큰 검증
POST   /api/v1/auth/change-password        // 비밀번호 변경
POST   /api/v1/auth/forgot-password        // 비밀번호 찾기
POST   /api/v1/auth/reset-password         // 비밀번호 재설정
POST   /api/v1/auth/verify-email           // 이메일 인증
POST   /api/v1/auth/resend-verification    // 인증 재전송
GET    /api/v1/auth/check-email            // 이메일 중복 확인
POST   /api/v1/auth/register-device        // 디바이스 등록
POST   /api/v1/auth/unregister-device      // 디바이스 해제
GET    /api/v1/auth/sessions               // 활성 세션 목록
```

### 2. File Upload 모듈 (3개)
외부 서비스 연동 및 URL 생성

```typescript
POST /api/v1/file-uploads/presigned-url    // Presigned URL 생성
GET  /api/v1/file-uploads/:id/download-url // 다운로드 URL 생성
GET  /api/v1/file-uploads/:id/stream       // 스트리밍 URL 생성
```

### 3. Video Processing 모듈 (6개)
특화된 처리 및 메타데이터 조회

```typescript
POST /api/v1/video-processing/compress     // 압축 작업 (단축 API)
POST /api/v1/video-processing/thumbnails   // 썸네일 추출 (단축 API)
POST /api/v1/video-processing/full         // 전체 처리 (단축 API)
GET  /api/v1/video-processing/progress/:id // 실시간 진행률
GET  /api/v1/video-processing/quality-profiles // 품질 프로필 목록
POST /api/v1/video-processing/estimate-size    // 크기 예측
```

### 4. Read Receipt 모듈 (4개)
벌크 처리 및 집계 기능

```typescript
POST /api/v1/read-receipts/mark-multiple-read     // 다중 읽음 처리
POST /api/v1/read-receipts/mark-all-read/:planetId // Planet 전체 읽음
GET  /api/v1/read-receipts/unread-count/:planetId // Planet별 미읽음 수
GET  /api/v1/read-receipts/unread-counts/my      // 내 모든 미읽음 수
```

### 5. Notification 모듈 (7개)
푸시 토큰 관리 및 테스트

```typescript
GET  /api/v1/notifications/unread-count          // 미읽음 알림 수
PATCH /api/v1/notifications/read-multiple        // 다중 읽음 처리
POST /api/v1/notifications/push-token            // 푸시 토큰 등록
POST /api/v1/notifications/push-token/unregister // 푸시 토큰 해제
GET  /api/v1/notifications/push-tokens           // 내 푸시 토큰 목록
POST /api/v1/notifications/test                  // 테스트 알림 전송
```

### 6. Scheduler 모듈 (6개)
시스템 모니터링 및 관리

```typescript
GET  /api/v1/scheduler/status        // 스케줄러 상태
GET  /api/v1/scheduler/health        // 시스템 건강성
GET  /api/v1/scheduler/history       // 작업 히스토리
GET  /api/v1/scheduler/info          // 시스템 정보
GET  /api/v1/scheduler/locks         // 활성 락 상태
POST /api/v1/scheduler/optimize-cache // 캐시 최적화 실행
```

### 7. Schema 모듈 (8개)
메타데이터 및 스키마 정보 (개발 환경 전용)

```typescript
GET /api/v1/schema                   // 전체 스키마
GET /api/v1/schema/entities          // 엔티티 목록
GET /api/v1/schema/entities/:name    // 엔티티 상세
GET /api/v1/schema/relations         // 관계 정보
GET /api/v1/schema/columns/:entity   // 컬럼 정보
GET /api/v1/schema/indexes/:entity   // 인덱스 정보
GET /api/v1/schema/migrations        // 마이그레이션 히스토리
GET /api/v1/schema/database-info     // DB 정보
```

### 8. WebSocket 이벤트 (11개)
실시간 통신 (HTTP REST와 다른 패러다임)

```typescript
connection        // 연결
disconnect        // 연결 해제
join-planet       // Planet 참여
leave-planet      // Planet 나가기
send-message      // 메시지 전송
delete-message    // 메시지 삭제
typing-start      // 타이핑 시작
typing-stop       // 타이핑 중지
presence-update   // 온라인 상태 업데이트
mark-as-read      // 읽음 처리
request-sync      // 동기화 요청
```

## 🎯 커스텀 유지 이유 분석

### 1. **외부 서비스 통합** (30%)
- Cloudflare R2 Presigned URL
- Firebase FCM 푸시 알림
- FFmpeg 비디오 처리
- 소셜 로그인 (Google, Apple)

### 2. **실시간 기능** (20%)
- WebSocket 이벤트
- 진행률 추적
- 온라인 상태
- 타이핑 인디케이터

### 3. **집계 및 통계** (15%)
- 미읽음 카운트
- 시스템 상태
- 작업 히스토리
- 성능 메트릭

### 4. **비즈니스 로직** (20%)
- 인증 플로우
- 벌크 작업
- 파일 스트리밍
- 캐시 최적화

### 5. **메타데이터** (15%)
- 스키마 정보
- 시스템 설정
- 품질 프로필
- 디버그 정보

## 💡 권장사항

### CRUD 패턴 적용이 적절한 경우
✅ 엔티티 기반 작업
✅ 표준 CRUD 작업 (생성, 조회, 수정, 삭제)
✅ 단순한 필터링 및 페이지네이션
✅ 관계 포함 조회

### 커스텀 유지가 적절한 경우
❌ 외부 서비스 API 호출
❌ 실시간 통신 (WebSocket)
❌ 복잡한 비즈니스 플로우
❌ 집계 및 통계 연산
❌ 시스템 관리 작업

## 📈 최종 통계

| 모듈 | 전체 라우트 | 변환 완료 | 커스텀 유지 | 변환률 |
|------|------------|-----------|-------------|--------|
| Auth | 15 | 0 | 15 | 0% |
| File Upload | 5 | 2 | 3 | 40% |
| Video Processing | 11 | 5 | 6 | 45% |
| Read Receipt | 5 | 1 | 4 | 20% |
| Notification | 9 | 2 | 7 | 22% |
| Scheduler | 6 | 0 | 6 | 0% |
| Schema | 8 | 0 | 8 | 0% |
| WebSocket | 11 | 0 | 11 | 0% |
| **합계** | **70** | **10** | **60** | **14.3%** |

## 🚀 결론

1. **하이브리드 접근법이 최선**
   - 엔티티 CRUD: @Crud 패턴 사용
   - 복잡한 비즈니스: 커스텀 유지
   - 외부 서비스: 별도 컨트롤러

2. **생명주기 훅 활용 효과**
   - 코드 구조 개선
   - 관심사 분리
   - 이벤트 기반 아키텍처

3. **유지보수성 향상**
   - 일관된 API 구조
   - 명확한 책임 분리
   - 테스트 용이성

4. **성능 최적화**
   - 비동기 처리 (이벤트)
   - 캐싱 전략
   - 효율적인 쿼리