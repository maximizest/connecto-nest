# 사용자 플로우 (User Flow)

이 문서는 Connecto 서비스의 실제 사용자 시나리오와 API 호출 플로우를 설명합니다.

## 📱 1. 신규 사용자 온보딩

### 1.1 회원가입 및 로그인
```
1. 소셜 로그인
   POST /api/v1/auth/social-signin
   {
     "provider": "google" | "apple",
     "idToken": "소셜 인증 토큰"
   }
   
   응답:
   {
     "accessToken": "jwt_access_token",
     "refreshToken": "jwt_refresh_token",
     "user": {
       "id": 1,
       "name": "사용자명",
       "email": "user@example.com"
     }
   }
   
   → JWT 토큰 발급
   → 사용자 프로필 자동 생성 (신규 사용자)
   → 온라인 상태 추적 제거됨

2. 토큰 갱신
   POST /api/v1/auth/refresh
   Headers: { Authorization: "Bearer {REFRESH_TOKEN}" }
   
   → 새 Access Token 발급
```

## 🎒 2. 여행(Travel) 참여

### 2.1 Travel 참여 (초대 필요)
```
1. Travel 참여 (TravelUser 생성)
   POST /api/v1/travel-users
   {
     "travelId": 123,
     "userId": 456,
     "role": "PARTICIPANT"
   }
   → Travel 멤버로 추가
   → 기본 Planet(채팅방) 자동 접근 가능

2. 내가 참여한 Travel 목록 조회
   GET /api/v1/travels
   → 인증된 사용자가 참여한 Travel만 조회
   → 멤버 정보 포함 가능 (?include=members)

3. Travel 상세 정보 조회
   GET /api/v1/travels/:id?include=members,planets
   → Travel 정보
   → 멤버 목록
   → Planet(채팅방) 목록
```

### 2.2 Travel 멤버 관리
```
1. Travel 멤버 목록 조회
   GET /api/v1/travel-users?filter[travelId_eq]=123
   → 참여자 목록
   → 역할 (HOST/PARTICIPANT)
   → 상태 (ACTIVE/BANNED/LEFT)

2. Travel 나가기 (본인)
   PATCH /api/v1/travel-users/:id
   {
     "status": "LEFT"
   }
   → Travel에서 나가기
```

## 💬 3. Planet(채팅방) 활동

### 3.1 채팅방 조회 및 메시지
```
1. Travel의 Planet 목록 조회
   GET /api/v1/planets?filter[travelId_eq]=123
   → GROUP/DIRECT 타입별 채팅방
   → 읽기 전용 (생성/수정 불가)

2. Planet 상세 조회
   GET /api/v1/planets/:id?include=members,lastMessage
   → 채팅방 정보
   → 멤버 목록
   → 마지막 메시지

3. 메시지 전송
   POST /api/v1/messages
   {
     "planetId": 123,
     "content": "안녕하세요!",
     "type": "TEXT"
   }
   → 메시지 ID 반환
   → WebSocket으로 실시간 전파

4. 메시지 목록 조회
   GET /api/v1/messages?filter[planetId_eq]=123&sort=-createdAt&limit=20
   → 최근 메시지 20개
   → 페이지네이션 지원

5. 메시지 수정
   PATCH /api/v1/messages/:id
   {
     "content": "수정된 메시지"
   }
   → 본인 메시지만 수정 가능
   → 5분 이내만 수정 가능
```

### 3.2 실시간 통신 (WebSocket)
```
1. WebSocket 연결
   connect to: ws://localhost:3000/chat
   with: 
   - query: { token: "JWT_TOKEN" }
   - or auth: { token: "JWT_TOKEN" }
   - or headers: { Authorization: "Bearer JWT_TOKEN" }

2. 채팅방 참여
   emit: 'room:join'
   {
     "roomId": "planet_123"
   }

3. 메시지 전송 (WebSocket)
   emit: 'message:send'
   {
     "planetId": 123,
     "type": "TEXT",
     "content": "실시간 메시지"
   }

4. 타이핑 표시 (고급)
   emit: 'typing:advanced_start'
   {
     "planetId": 123,
     "typingType": "text",  // text, voice, file, image
     "contentLength": 10
   }
   
   emit: 'typing:update'
   {
     "planetId": 123,
     "contentLength": 25
   }
   
   emit: 'typing:advanced_stop'
   {
     "planetId": 123
   }

5. 메시지 읽음 처리 (WebSocket)
   emit: 'message:read'
   {
     "messageId": 456,
     "deviceType": "mobile",
     "readSource": "manual"
   }

6. 여러 메시지 읽음 처리
   emit: 'messages:read_multiple'
   {
     "messageIds": [456, 457, 458],
     "deviceType": "mobile"
   }

7. Planet 전체 읽음
   emit: 'planet:read_all'
   {
     "planetId": 123
   }

8. 메시지 편집 (WebSocket)
   emit: 'message:edit'
   {
     "messageId": 456,
     "content": "수정된 내용"
   }
   → 5분 이내만 가능

9. 메시지 삭제 (WebSocket)
   emit: 'message:delete'
   {
     "messageId": 456
   }
   
10. 메시지 복구 (WebSocket)
    emit: 'message:restore'
    {
      "messageId": 456
    }
    → 24시간 이내만 가능
```

### 3.3 미디어 공유
```
1. 파일 업로드 (Direct to R2)
   POST /api/v1/file-uploads/prepare
   {
     "fileName": "photo.jpg",
     "fileSize": 2048000,
     "mimeType": "image/jpeg"
   }
   → Presigned URL 발급
   → Direct Upload to Cloudflare R2

2. 파일 업로드 완료 확인
   POST /api/v1/file-uploads/complete
   {
     "uploadId": "upload_123",
     "storageKey": "uploads/2024/..."
   }
   → 업로드 확인
   → 공개 URL 생성
   → 비디오: 자동 MEDIUM 품질 최적화 시작
   → 대용량 이미지(>5MB): 자동 최적화 시작

3. 이미지 메시지 전송
   POST /api/v1/messages
   {
     "planetId": 123,
     "type": "IMAGE",
     "fileUrl": "https://r2.example.com/...",
     "fileName": "photo.jpg",
     "fileSize": 2048000
   }

4. 파일 다운로드 URL 생성
   GET /api/v1/file-uploads/:id/download?expiresIn=3600
   → 임시 다운로드 URL (1시간 유효)

5. 비디오 스트리밍 URL
   GET /api/v1/file-uploads/:id/stream
   → HLS 스트리밍 URL
   → 자동 최적화된 비디오 스트리밍
```

### 3.4 자동화된 미디어 처리
```
비디오 자동 처리:
- 업로드 완료 시 자동으로 MEDIUM 품질 최적화
- 별도 API 호출 불필요
- EventEmitter2로 백그라운드 처리
- 원본 파일 보존
- 자동 썸네일 생성

이미지 자동 처리:
- 5MB 이상 이미지 자동 최적화
- WebP 포맷 변환
- 최대 1920x1080 리사이징
- 85% 품질 유지

처리 상태 확인:
GET /api/v1/video-processing?filter[fileUploadId_eq]=123
→ 처리 진행률 확인
→ 상태: PENDING, PROCESSING, COMPLETED, FAILED
```

## 🔔 4. 알림 및 읽음 상태

### 4.1 알림 관리
```
1. 읽지 않은 알림 개수
   GET /api/v1/notifications/unread-count
   → 미읽음 알림 총 개수

2. 알림 목록 조회
   GET /api/v1/notifications?filter[isRead_eq]=false&sort=-createdAt
   → 미읽음 알림 목록
   → 타입별 필터링 가능

3. 알림 읽음 처리
   PATCH /api/v1/notifications/:id/read
   → 개별 알림 읽음 처리

4. 모든 알림 읽음
   POST /api/v1/notifications/read-all
   → 모든 미읽음 알림 일괄 처리

5. WebSocket 알림 구독
   emit: 'notifications:subscribe'
   → 실시간 알림 수신 시작
   
   emit: 'notifications:mark_read'
   {
     "notificationId": 123
   }
   → WebSocket으로 읽음 처리
```

### 4.2 메시지 읽음 상태
```
1. 메시지 읽음 처리 (REST)
   POST /api/v1/read-receipts/mark-read
   {
     "messageId": 456,
     "deviceType": "mobile"
   }
   → 읽음 영수증 생성

2. 여러 메시지 읽음 처리 (REST)
   POST /api/v1/read-receipts/mark-multiple
   {
     "messageIds": [456, 457, 458]
   }

3. Planet의 모든 메시지 읽음 (REST)
   POST /api/v1/read-receipts/mark-all/:planetId

4. Planet별 미읽음 개수
   GET /api/v1/read-receipts/unread-count/:planetId
   → 특정 Planet의 미읽음 메시지 수

5. 모든 Planet 미읽음 개수
   GET /api/v1/read-receipts/unread-counts
   → 사용자의 모든 Planet별 미읽음 수

6. WebSocket 읽음 상태 조회
   emit: 'planet:get_unread_count'
   {
     "planetId": 123
   }
   
   emit: 'user:get_all_unread_counts'
   → 모든 Planet 미읽음 개수
```

## 👥 5. Planet 멤버 관리

### 5.1 Planet 멤버 조회
```
1. Planet 멤버 목록
   GET /api/v1/planet-users?filter[planetId_eq]=123
   → 채팅방 참여자 목록
   → 권한 정보 (일반/뮤트)

2. Planet 멤버 상태 변경 (관리자)
   PATCH /api/v1/planet-users/:id
   {
     "isMuted": true,
     "mutedUntil": "2024-03-01T00:00:00Z"
   }
   → 사용자 뮤트 처리
```

## 🔍 6. 검색 및 필터링

### 6.1 메시지 검색
```
1. 키워드 검색
   GET /api/v1/messages?filter[content_like]=%검색어%&filter[planetId_eq]=123
   → 메시지 내용 검색

2. 미디어 타입별 조회
   GET /api/v1/messages?filter[type_in]=IMAGE,VIDEO,FILE&filter[planetId_eq]=123
   → 미디어 메시지만 필터링

3. 날짜 범위 검색
   GET /api/v1/messages?filter[createdAt_gte]=2024-01-01&filter[createdAt_lte]=2024-01-31
   → 특정 기간 메시지 조회
```

### 6.2 파일 관리
```
1. 내 업로드 파일 목록
   GET /api/v1/file-uploads?filter[status_eq]=COMPLETED&sort=-createdAt
   → 완료된 업로드 목록
   → 최신순 정렬

2. 파일 타입별 조회
   GET /api/v1/file-uploads?filter[mimeType_like]=image%
   → 이미지 파일만 조회

3. 파일 삭제
   DELETE /api/v1/file-uploads/:id
   → 파일 레코드 및 실제 파일 삭제
```

## 🚪 7. 종료 및 로그아웃

### 7.1 Travel 나가기
```
1. Travel 나가기
   PATCH /api/v1/travel-users/:myTravelUserId
   {
     "status": "LEFT"
   }
   → Travel에서 나가기
   → Planet 접근 불가
```

### 7.2 로그아웃 및 계정 관리
```
1. 로그아웃
   POST /api/v1/auth/logout
   → Refresh Token 무효화
   → 서버측 세션 정리

2. 계정 삭제
   DELETE /api/v1/auth/account
   → 사용자 계정 완전 삭제
   → 관련 데이터 모두 제거
```

## 🔐 8. 프로필 관리

### 8.1 프로필 조회 및 수정
```
1. 내 프로필 조회
   GET /api/v1/profiles/me
   또는
   GET /api/v1/profiles?filter[userId_eq]={myUserId}

2. 프로필 수정
   PATCH /api/v1/profiles/:id
   {
     "bio": "자기소개",
     "occupation": "직업",
     "birthDate": "1990-01-01"
   }

3. 다른 사용자 프로필 조회
   GET /api/v1/profiles/:id
   → 공개 정보만 조회 가능
```

## 📊 9. 시스템 정보 (개발용)

### 9.1 스키마 정보 (개발 환경)
```
1. 전체 스키마 조회
   GET /api/v1/schema
   → 모든 엔티티 정보

2. 엔티티별 컬럼 정보
   GET /api/v1/schema/columns/:entityName
   → 특정 엔티티의 컬럼 정보

3. 관계 정보
   GET /api/v1/schema/relations
   → 엔티티 간 관계 매핑

4. CRUD 엔드포인트 정보
   GET /api/v1/schema/crud/:entityName
   → 엔티티별 CRUD 설정 정보
```

## 💡 주요 제한사항

1. **Travel 생성**: 현재 일반 사용자는 Travel을 생성할 수 없음 (관리자 기능)
2. **Planet 생성**: 일반 사용자는 Planet을 생성할 수 없음 (조회만 가능)
3. **초대 코드**: 초대 코드 생성/검증 API 미구현
4. **파일 크기**: 최대 500MB까지 업로드 가능
5. **비디오 처리**: 자동 MEDIUM 품질 최적화
6. **이미지 처리**: 5MB 이상 자동 최적화
7. **메시지 수정**: 5분 이내만 가능
8. **메시지 복구**: 삭제 후 24시간 이내만 가능
9. **WebSocket Rate Limiting**: 
   - 메시지 전송: 10초당 10개
   - 룸 참여: 빈도 제한
   - 타이핑: 빈도 제한

## 🚀 성능 최적화 팁

1. **페이지네이션 활용**
   ```
   GET /api/v1/messages?limit=20&offset=0
   ```

2. **필드 선택**
   ```
   GET /api/v1/travels?fields=id,name,status
   ```

3. **관계 포함**
   ```
   GET /api/v1/travels/:id?include=members.user,planets
   ```

4. **정렬**
   ```
   GET /api/v1/messages?sort=-createdAt,id
   ```

5. **필터 조합**
   ```
   GET /api/v1/messages?filter[planetId_eq]=123&filter[type_in]=TEXT,IMAGE&filter[createdAt_gte]=2024-01-01
   ```

## 🔄 WebSocket 이벤트 요약

### 클라이언트 → 서버
- `room:join` - 룸 참여
- `room:leave` - 룸 나가기
- `message:send` - 메시지 전송
- `message:edit` - 메시지 수정
- `message:delete` - 메시지 삭제
- `message:restore` - 메시지 복구
- `message:read` - 단일 메시지 읽음
- `messages:read_multiple` - 여러 메시지 읽음
- `planet:read_all` - Planet 전체 읽음
- `typing:advanced_start` - 타이핑 시작
- `typing:update` - 타이핑 업데이트
- `typing:advanced_stop` - 타이핑 중지
- `notifications:subscribe` - 알림 구독
- `notifications:mark_read` - 알림 읽음
- `ping` - 연결 상태 확인

### 서버 → 클라이언트
- `connected` - 연결 성공
- `message:sent` - 메시지 전송 완료
- `message:edited` - 메시지 수정됨
- `message:deleted` - 메시지 삭제됨
- `message:restored` - 메시지 복구됨
- `message:read_status` - 읽음 상태 업데이트
- `typing:advanced_started` - 타이핑 시작됨
- `typing:advanced_stopped` - 타이핑 중지됨
- `notifications:new` - 새 알림
- `room:joined` - 룸 참여 완료
- `room:left` - 룸 나가기 완료
- `pong` - 핑 응답
- `error` - 오류 메시지