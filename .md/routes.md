# 프로젝트 전체 라우트 문서

이 문서는 Connecto NestJS 프로젝트의 모든 API 라우트를 정리합니다.
모든 라우트는 `/api/v1` 접두사를 가집니다.

## 인증 모듈 (Auth Module)

### 기본 경로: `/api/v1/auth`

| Method | Path            | 용도                          | 인증 필요 |
| ------ | --------------- | ----------------------------- | --------- |
| POST   | `/sign/social`  | Google/Apple 소셜 로그인 처리 | ❌        |
| POST   | `/sign/refresh` | JWT 액세스 토큰 갱신          | ❌        |
| POST   | `/sign/out`     | 로그아웃 처리                 | ❌        |

## 사용자 모듈 (User Module)

### 기본 경로: `/api/v1/users`

| Method | Path   | 용도                      | 인증 필요 |
| ------ | ------ | ------------------------- | --------- |
| GET    | `/:id` | 사용자 정보 조회 (본인만) | ✅        |
| PUT    | `/:id` | 사용자 정보 수정          | ✅        |
| DELETE | `/:id` | 사용자 삭제 (Soft Delete) | ✅        |

## 프로필 모듈 (Profile Module)

### 기본 경로: `/api/v1/profiles`

| Method | Path   | 용도             | 인증 필요 |
| ------ | ------ | ---------------- | --------- |
| GET    | `/`    | 프로필 목록 조회 | ✅        |
| GET    | `/:id` | 프로필 상세 조회 | ✅        |
| POST   | `/`    | 프로필 생성      | ✅        |
| PUT    | `/:id` | 프로필 수정      | ✅        |
| DELETE | `/:id` | 프로필 삭제      | ✅        |

## 여행 모듈 (Travel Module)

### 기본 경로: `/api/v1/travels`

| Method | Path   | 용도                           | 인증 필요 | 상태 |
| ------ | ------ | ------------------------------ | --------- | ---- |
| GET    | `/`    | 여행 목록 조회 (참여한 여행만) | ✅        | ✅ 모든 여행 조회 가능하도록 설정 완료 |
| GET    | `/:id` | 여행 상세 조회                 | ✅        | ✅ 기존 설정 유지 |
| ~~DELETE~~ | ~~`/:id`~~ | ~~여행 삭제 (Hard Delete)~~        | ~~✅~~        | ✅ 사용자 삭제 권한 제거 완료 |

## 여행 사용자 모듈 (TravelUser Module)

### 기본 경로: `/api/v1/travel-users`

| Method | Path   | 용도                    | 인증 필요 | 상태 |
| ------ | ------ | ----------------------- | --------- | ---- |
| GET    | `/`    | 여행 멤버십 목록 조회   | ✅        | ✅ 여행 참여자만 조회 가능하도록 BeforeShow 훅 추가 완료 |
| GET    | `/:id` | 여행 멤버십 상세 조회   | ✅        | ✅ 여행 참여자만 조회 가능하도록 BeforeShow 훅 추가 완료 |
| POST   | `/`    | 여행 멤버십 생성 (참여) | ✅        | ✅ 현재 로그인 유저 자동 설정 + 중복 참여 오류 처리 완료 |
| PUT    | `/:id` | 여행 멤버십 수정        | ✅        | ✅ 본인 멤버십만 수정 가능하도록 BeforeUpdate 훅 추가 완료 |
| ~~DELETE~~ | ~~`/:id`~~ | ~~여행 멤버십 삭제 (탈퇴)~~ | ~~✅~~        | ✅ 사용자 탈퇴 권한 제거 완료 (destroy 액션 제거) |

## 채팅방 모듈 (Planet Module)

### 기본 경로: `/api/v1/planets`

| Method | Path   | 용도                      | 인증 필요 | 상태 |
| ------ | ------ | ------------------------- | --------- | ---- |
| GET    | `/`    | 채팅방 목록 조회          | ✅        | ✅ travelId 필터 필수로 설정 + 권한 확인 안내 추가 완료 |
| GET    | `/:id` | 채팅방 상세 조회          | ✅        | ✅ 여행 참여자만 조회 가능하도록 BeforeShow 훅 추가 완료 |
| ~~DELETE~~ | ~~`/:id`~~ | ~~채팅방 삭제 (Hard Delete)~~ | ~~✅~~        | ✅ 사용자 삭제 권한 제거 완료 (destroy 액션 제거) |

## 채팅방 사용자 모듈 (PlanetUser Module)

### 기본 경로: `/api/v1/planet-users`

| Method | Path   | 용도                        | 인증 필요 | 상태 |
| ------ | ------ | --------------------------- | --------- | ---- |
| GET    | `/`    | 채팅방 멤버십 목록 조회     | ✅        | ✅ 행성 참여자만 조회 가능하도록 BeforeShow 훅 추가 완료 |
| GET    | `/:id` | 채팅방 멤버십 상세 조회     | ✅        | ✅ 행성 참여자만 조회 가능하도록 BeforeShow 훅 추가 완료 |
| ~~POST~~   | ~~`/`~~    | ~~채팅방 멤버십 생성 (참여)~~   | ~~✅~~        | ✅ 사용자 직접 참여 불가 (create 액션 제거) |
| PUT    | `/:id` | 채팅방 멤버십 수정          | ✅        | ✅ 본인 멤버십만 수정 가능하도록 BeforeUpdate 훅 추가 완료 |
| ~~DELETE~~ | ~~`/:id`~~ | ~~채팅방 멤버십 삭제 (나가기)~~ | ~~✅~~        | ✅ 사용자 직접 나가기 불가 (destroy 액션 제거) |

## 메시지 모듈 (Message Module)

### 기본 경로: `/api/v1/messages`

| Method | Path                  | 용도                      | 인증 필요 | 상태 |
| ------ | --------------------- | ------------------------- | --------- | ---- |
| GET    | `/`                   | 메시지 목록 조회          | ✅        | ✅ planetId 필터 필수 + 권한 확인 안내 추가 완료 |
| GET    | `/:id`                | 메시지 상세 조회          | ✅        | ✅ 행성 참여자만 조회 가능하도록 BeforeShow 훅 추가 완료 |
| POST   | `/`                   | 메시지 생성 (전송)        | ✅        | ✅ planetId 필수 + 행성 참여자만 생성 가능 (기존 검증 유지) |
| PUT    | `/:id`                | 메시지 수정 (편집)        | ✅        | ✅ 본인 메시지만 수정 가능 (기존 검증 유지) |
| DELETE | `/:id`                | 메시지 삭제 (Soft Delete) | ✅        | ✅ 본인 메시지만 삭제 가능 (기존 검증 유지) |
| GET    | `/:messageId/context` | 메시지 주변 컨텍스트 조회 | ✅        | ✅ **필수 기능**: 알림 클릭 시 대화 맥락 제공 |

## 읽음 확인 모듈 (Read Receipt Module)

### 기본 경로: `/api/v1/read-receipts`

| Method | Path                       | 용도                              | 인증 필요 | 설명 |
| ------ | -------------------------- | --------------------------------- | --------- | ---- |
| GET    | `/`                        | 읽음 확인 목록 조회               | ✅        | 메시지별 읽음 상태 관리 |
| GET    | `/:id`                     | 읽음 확인 상세 조회               | ✅        | 특정 읽음 확인 정보 |
| POST   | `/`                        | 읽음 확인 생성                    | ✅        | 메시지 읽음 기록 생성 |
| POST   | `/mark-read`               | 개별 메시지 읽음 처리             | ✅        | **핵심 기능**: 메시지 읽음 표시 |
| POST   | `/mark-multiple-read`      | 여러 메시지 일괄 읽음 처리        | ✅        | 성능 최적화용 일괄 처리 |
| POST   | `/mark-all-read/:planetId` | Planet의 모든 메시지 읽음 처리    | ✅        | 채팅방 전체 읽음 처리 |
| GET    | `/unread-count/:planetId`  | 특정 Planet의 읽지 않은 메시지 수 | ✅        | **필수**: 채팅방 배지 표시용 |
| GET    | `/unread-counts/my`        | 모든 Planet의 읽지 않은 메시지 수 | ✅        | **필수**: 전체 알림 개수 표시 |

## 알림 모듈 (Notification Module)

### 기본 경로: `/api/v1/notifications`

| Method | Path                     | 용도                              | 인증 필요 | 설명 |
| ------ | ------------------------ | --------------------------------- | --------- | ---- |
| GET    | `/`                      | 알림 목록 조회                    | ✅        | 사용자 알림 히스토리 |
| GET    | `/:id`                   | 알림 상세 조회                    | ✅        | 특정 알림 상세 정보 |
| PUT    | `/:id`                   | 알림 수정 (읽음 처리 포함)        | ✅        | 알림 읽음 상태 변경 |
| GET    | `/unread-count`          | 읽지 않은 알림 개수 조회          | ✅        | **필수**: 앱 배지 표시용 |
| PATCH  | `/read-multiple`         | 여러 알림 일괄 읽음 처리          | ✅        | 성능 최적화용 일괄 처리 |
| PATCH  | `/read-all`              | 모든 알림 읽음 처리               | ✅        | 전체 알림 읽음 처리 |
| POST   | `/push-token`            | FCM 푸시 토큰 등록                | ✅        | **필수**: 푸시 알림 발송용 |
| POST   | `/push-token/unregister` | 푸시 토큰 등록 해제               | ✅        | 로그아웃/디바이스 변경 시 |
| GET    | `/push-tokens`           | 내 푸시 토큰 목록 조회            | ✅        | 멀티 디바이스 관리용 |
| POST   | `/test`                  | 테스트 알림 발송 (개발 환경 전용) | ✅        | 개발/디버깅 전용 |

## 파일 업로드 모듈 (File Upload Module)

### 기본 경로: `/api/v1/file-uploads`

| Method | Path                | 용도                             | 인증 필요 | 설명 |
| ------ | ------------------- | -------------------------------- | --------- | ---- |
| GET    | `/`                 | 파일 목록 조회                   | ✅        | 업로드한 파일 목록 |
| GET    | `/:id`              | 파일 상세 조회                   | ✅        | 파일 메타데이터 정보 |
| POST   | `/`                 | 파일 업로드 레코드 생성          | ✅        | 업로드 전 메타데이터 등록 |
| DELETE | `/:id`              | 파일 삭제                        | ✅        | 파일 및 메타데이터 삭제 |
| POST   | `/presigned-url`    | Cloudflare R2 Presigned URL 발급 | ✅        | **필수**: 직접 업로드용 임시 URL |
| POST   | `/complete`         | Direct Upload 완료 확인          | ✅        | **필수**: 서버는 업로드 완료를 모르므로 클라이언트가 알려줘야 함 |
| DELETE | `/:id/cancel`       | 업로드 취소                      | ✅        | **필요**: 대용량 파일 업로드 중단 시 정리 작업 |
| GET    | `/:id/download-url` | 다운로드 URL 생성                | ✅        | 권한 확인 후 임시 다운로드 URL |
| GET    | `/:id/stream`       | 스트리밍 URL 생성                | ✅        | 비디오/오디오 스트리밍용 |

## 관리자 모듈 (Admin Module) - 개발 중

### 기본 경로: `/api/v1/admins`

| Method | Path | 용도                       | 인증 필요 |
| ------ | ---- | -------------------------- | --------- |
| -      | -    | 관리자 관련 기능 (개발 중) | ✅        |

## 스키마 모듈 (Schema Module) - 개발 환경 전용

### 기본 경로: `/api/v1/schema`

| Method | Path           | 용도                         | 인증 필요 |
| ------ | -------------- | ---------------------------- | --------- |
| GET    | `/`            | 전체 엔티티 스키마 목록 조회 | ❌        |
| GET    | `/:entityName` | 특정 엔티티 상세 스키마 조회 | ❌        |

## WebSocket Gateway

### 기본 경로: `ws://[host]/socket.io`

| Event             | 방향            | 용도                 | 설명 |
| ----------------- | --------------- | -------------------- | ---- |
| `connection`      | Server ← Client | WebSocket 연결       | 클라이언트 연결 수립 |
| `disconnect`      | Server ← Client | WebSocket 연결 해제  | 클라이언트 연결 종료 |
| `message:send`    | Server ← Client | 메시지 전송          | 실시간 메시지 전송 |
| `message:receive` | Server → Client | 메시지 수신          | 실시간 메시지 수신 |
| `message:edited`  | Server → Client | 메시지 편집 알림     | 메시지 수정 실시간 동기화 |
| `message:deleted` | Server → Client | 메시지 삭제 알림     | 메시지 삭제 실시간 동기화 |
| `typing:start`    | Server ← Client | 타이핑 시작          | 타이핑 인디케이터 표시 |
| `typing:stop`     | Server ← Client | 타이핑 중지          | 타이핑 인디케이터 숨김 |
| `typing:update`   | Server → Client | 타이핑 상태 업데이트 | 타이핑 중인 사용자 목록 |
| `planet:join`     | Server ← Client | 채팅방 입장          | 채팅방 구독 시작 |
| `planet:leave`    | Server ← Client | 채팅방 퇴장          | 채팅방 구독 종료 |
| `user:online`     | Server → Client | 사용자 온라인 상태   | **필요**: Redis 기반 실시간 온라인 상태 |
| `user:offline`    | Server → Client | 사용자 오프라인 상태 | **필요**: 연결 해제 시 오프라인 상태 |

## CRUD 액션 매핑

`@foryourdev/nestjs-crud` 패키지를 사용하는 컨트롤러의 기본 CRUD 액션:

| 액션      | HTTP Method | 경로 패턴 | 용도      |
| --------- | ----------- | --------- | --------- |
| `index`   | GET         | `/`       | 목록 조회 |
| `show`    | GET         | `/:id`    | 상세 조회 |
| `create`  | POST        | `/`       | 생성      |
| `update`  | PUT         | `/:id`    | 수정      |
| `destroy` | DELETE      | `/:id`    | 삭제      |

## 필터링 및 정렬

### 필터 연산자

- `_eq`: 같음 (예: `?status_eq=active`)
- `_ne`: 같지 않음 (예: `?status_ne=deleted`)
- `_in`: 포함 (예: `?id_in=1,2,3`)
- `_not_in`: 포함하지 않음
- `_lt`: 작음 (예: `?age_lt=30`)
- `_lte`: 작거나 같음
- `_gt`: 큼 (예: `?age_gt=20`)
- `_gte`: 크거나 같음
- `_between`: 범위 (예: `?createdAt_between=2024-01-01,2024-12-31`)
- `_like`: 부분 일치 (예: `?name_like=%john%`)
- `_ilike`: 대소문자 무시 부분 일치
- `_null`: null 여부 (예: `?deletedAt_null=true`)
- `_not_null`: null이 아님

### 정렬

- `?sort=field`: 오름차순 정렬
- `?sort=-field`: 내림차순 정렬
- `?sort=field1,-field2`: 다중 정렬

### 페이지네이션

- `?page=1&limit=20`: 페이지 기반
- `?cursor=xxx&limit=20`: 커서 기반

### 관계 포함

- `?include=relation1,relation2`: 관계 데이터 포함
- `?include=relation1.subrelation`: 중첩 관계 포함

## 보안 및 권한

### 인증 (Authentication)

- JWT Bearer Token 사용
- Header: `Authorization: Bearer <token>`
- 토큰 만료 시간: 액세스 토큰 1시간, 리프레시 토큰 7일

### 권한 검증 (Authorization)

1. **기본 권한**: 로그인한 사용자
2. **소유자 권한**: 리소스를 생성한 사용자
3. **멤버 권한**: Travel/Planet의 구성원
4. **관리자 권한**: 시스템 관리자 (개발 중)

### 접근 제어

- User: 본인 정보만 조회/수정 가능
- Travel: 참여한 여행만 조회 가능
- Planet: 속한 채팅방만 조회 가능
- Message: 채팅방 멤버만 조회 가능, 발신자만 수정/삭제
- File: 업로드한 사용자만 삭제 가능

## 응답 형식

### 에러 응답 형식

**@foryourdev/nestjs-crud 표준 에러 형식** (CrudExceptionFilter 적용):

```json
{
  "statusCode": 400,
  "message": "에러 메시지",
  "error": "Bad Request",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "path": "/api/v1/resource"
}
```

### 성공 응답 형식

**@foryourdev/nestjs-crud 표준 응답 형식**:

#### 단일 리소스
```json
{
  "id": 1,
  "field": "value",
  "createdAt": "2024-01-15T10:30:00.000Z"
}
```

#### 목록 (페이지네이션)
```json
{
  "data": [
    { "id": 1, "field": "value" }
  ],
  "count": 1,
  "total": 100,
  "page": 1,
  "pageCount": 5
}
```

#### 커서 기반 페이지네이션
```json
{
  "data": [
    { "id": 1, "field": "value" }
  ],
  "hasNext": true,
  "nextCursor": "eyJpZCI6MTB9",
  "limit": 20
}
```
