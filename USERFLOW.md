# 사용자 플로우 (User Flow)

이 문서는 Connecto 서비스의 실제 사용자 시나리오와 API 호출 플로우를 설명합니다.

## 📱 1. 신규 사용자 온보딩

### 1.1 회원가입 및 로그인 (푸시 토큰 자동 등록)
```
1. 소셜 로그인 + 푸시 토큰 등록 (한 번의 요청)
   POST /api/v1/auth/sign/social
   {
     "provider": "google" | "apple",
     "token": "소셜 인증 토큰",
     "pushToken": "FCM 토큰",        // 선택적
     "platform": "ios" | "android",   // 선택적
     "deviceId": "device123",         // 선택적
     "appVersion": "1.0.0"            // 선택적
   }
   
   응답:
   {
     "accessToken": "jwt_access_token",
     "refreshToken": "jwt_refresh_token",
     "isNewUser": false,              // 신규 사용자 여부
     "pushTokenRegistered": true      // 푸시 토큰 등록 성공 여부
   }
   
   → JWT 토큰 발급
   → 사용자 프로필 자동 생성 (신규 사용자)
   → 푸시 토큰 자동 등록 (제공된 경우)

2. 푸시 토큰 별도 등록/업데이트 (필요시)
   POST /api/v1/notifications/push-token
   {
     "token": "새로운 FCM 토큰",
     "platform": "ios" | "android",
     "deviceId": "device123"
   }
   → 푸시 토큰 업데이트
   → 기존 디바이스 토큰 교체
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
```

### 3.2 실시간 통신 (WebSocket)
```
1. WebSocket 연결
   connect to: ws://localhost:3000/chat
   with headers: { Authorization: "Bearer {JWT_TOKEN}" }

2. 채팅방 참여
   emit: 'join-room'
   {
     "roomId": "planet_123"
   }

3. 메시지 전송 (WebSocket)
   emit: 'send-message'
   {
     "planetId": 123,
     "type": "TEXT",
     "content": "실시간 메시지"
   }

4. 타이핑 표시
   emit: 'typing'
   {
     "planetId": 123,
     "isTyping": true
   }

5. 메시지 읽음 처리 (WebSocket)
   emit: 'mark-as-read'
   {
     "messageId": 456
   }
```

### 3.3 미디어 공유
```
1. 파일 업로드 준비 (Presigned URL)
   POST /api/v1/file-uploads/presigned-url
   {
     "fileName": "photo.jpg",
     "fileSize": 2048000,
     "mimeType": "image/jpeg",
     "folder": "messages"
   }
   → Presigned URL 발급
   → uploadId 반환
   → Direct Upload to Cloudflare R2

2. 파일 업로드 완료 확인
   POST /api/v1/file-uploads/complete
   {
     "uploadId": 789,
     "storageKey": "messages/2024/..."
   }
   → 업로드 확인
   → 공개 URL 생성

3. 이미지 메시지 전송
   POST /api/v1/messages
   {
     "planetId": 123,
     "type": "IMAGE",
     "fileUrl": "https://cdn.example.com/...",
     "metadata": {
       "width": 1920,
       "height": 1080,
       "fileSize": 2048000
     }
   }

4. 파일 다운로드 URL 생성
   GET /api/v1/file-uploads/:id/download-url?expiresIn=3600
   → 임시 다운로드 URL (1시간 유효)

5. 비디오 스트리밍 URL
   GET /api/v1/file-uploads/:id/stream
   → HLS 스트리밍 URL
   → HTTP Range 지원
```

### 3.4 비디오 처리
```
1. 비디오 품질 프로필 조회
   GET /api/v1/video-processing/quality-profiles
   → LOW, MEDIUM, HIGH, ULTRA 프로필

2. 예상 크기 계산
   POST /api/v1/video-processing/estimate-size
   {
     "inputSizeMB": 100,
     "durationSeconds": 60,
     "qualityProfile": "MEDIUM"
   }
   → 예상 출력 크기
   → 예상 처리 시간

3. 비디오 압축 시작
   POST /api/v1/video-processing/compress
   {
     "inputStorageKey": "uploads/video.mp4",
     "qualityProfile": "MEDIUM",
     "fileUploadId": 789
   }
   → 처리 작업 ID 반환

4. 처리 진행률 확인
   GET /api/v1/video-processing/progress/:jobId
   → 실시간 진행률 (0-100%)
   → 예상 완료 시간
   → 처리 로그
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
   PATCH /api/v1/notifications/read-all
   → 모든 미읽음 알림 일괄 처리
```

### 4.2 메시지 읽음 상태
```
1. 메시지 읽음 처리
   POST /api/v1/read-receipts/mark-read
   {
     "messageId": 456,
     "deviceType": "mobile"
   }
   → 읽음 영수증 생성
   → 메시지 readCount 증가

2. 여러 메시지 읽음 처리
   POST /api/v1/read-receipts/mark-multiple-read
   {
     "messageIds": [456, 457, 458]
   }

3. Planet의 모든 메시지 읽음
   POST /api/v1/read-receipts/mark-all-read/:planetId
   → Planet의 모든 미읽음 메시지 처리

4. Planet별 미읽음 개수
   GET /api/v1/read-receipts/unread-count/:planetId
   → 특정 Planet의 미읽음 메시지 수

5. 모든 Planet 미읽음 개수
   GET /api/v1/read-receipts/unread-counts/my
   → 사용자의 모든 Planet별 미읽음 수
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
   GET /api/v1/messages?filter[planetId_eq]=123&filter[content_like]=%검색어%
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

### 7.2 로그아웃
```
1. 로그아웃
   POST /api/v1/auth/sign/out
   → 토큰 무효화
   → 서버측 세션 정리

2. 푸시 토큰 해제
   POST /api/v1/notifications/push-token/unregister
   {
     "deviceId": "device123"
   }
   → 푸시 알림 중지
```

## 🔐 8. 토큰 관리

### 8.1 토큰 갱신
```
1. Access Token 갱신
   POST /api/v1/auth/sign/refresh
   Headers: { Authorization: "Bearer {REFRESH_TOKEN}" }
   → 새 Access Token 발급
   → Refresh Token 유지
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
```

## 💡 주요 제한사항

1. **Travel 생성**: 현재 일반 사용자는 Travel을 생성할 수 없음 (관리자 기능)
2. **Planet 생성**: 일반 사용자는 Planet을 생성할 수 없음 (조회만 가능)
3. **초대 코드**: 초대 코드 생성/검증 API 미구현
4. **파일 크기**: 최대 500MB까지 업로드 가능
5. **비디오 처리**: 동시 처리 작업 수 제한 있음
6. **WebSocket**: 인증 필요, Rate Limiting 적용

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