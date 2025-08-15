# 엔티티 삭제 정책 (Entity Deletion Policy)

이 문서는 Connecto 서비스의 엔티티별 삭제 방식과 연쇄 삭제 동작을 설명합니다.

## 🔥 삭제 방식 개요

### 소프트 삭제 (Soft Delete)
- **적용 엔티티**: User, Message
- **특징**: 
  - 데이터가 물리적으로 삭제되지 않음
  - `isDeleted` 플래그로 삭제 상태 표시
  - `deletedAt` 타임스탬프 기록
  - 복구 가능

### 하드 삭제 (Hard Delete)
- **적용 엔티티**: User, Message를 제외한 모든 엔티티
- **특징**:
  - 데이터가 데이터베이스에서 완전히 제거됨
  - CASCADE 옵션으로 연관된 하위 엔티티도 자동 삭제
  - 복구 불가능

## 📊 엔티티별 삭제 정책

### 1. User (사용자)
**삭제 방식**: 소프트 삭제
```
상태 변경:
- isDeleted: true
- deletedAt: 현재 시간

연쇄 작업:
- Message.senderId → SET NULL (메시지는 유지, 발신자만 익명화)
- Notification.userId → CASCADE (알림 삭제)
- Notification.triggeredBy → SET NULL (트리거 사용자만 제거)
- Profile → CASCADE (프로필 삭제)
- TravelUser → CASCADE (여행 멤버십 삭제)
- PlanetUser → CASCADE (채팅방 멤버십 삭제)
- ReadReceipt → CASCADE (읽음 영수증 삭제)
- FileUpload → CASCADE (업로드 파일 삭제)
```

### 2. Admin (관리자)
**삭제 방식**: 하드 삭제
```
연쇄 작업:
- 관련 데이터 없음 (독립적 엔티티)
```

### 3. Travel (여행)
**삭제 방식**: 하드 삭제
```
연쇄 작업:
- Planet → CASCADE (모든 하위 채팅방 삭제)
  └─ Message → CASCADE (채팅방의 모든 메시지 삭제)
      └─ MessageReadReceipt → CASCADE (메시지 읽음 상태 삭제)
- TravelUser → CASCADE (모든 멤버십 삭제)
- Notification (travel 관련) → CASCADE (여행 관련 알림 삭제)
```

### 4. Planet (채팅방)
**삭제 방식**: 하드 삭제
```
연쇄 작업:
- Message → CASCADE (모든 메시지 삭제)
  └─ MessageReadReceipt → CASCADE (메시지 읽음 상태 삭제)
- PlanetUser → CASCADE (모든 멤버십 삭제)
- Notification (planet 관련) → CASCADE (채팅방 관련 알림 삭제)
```

### 5. Message (메시지)
**삭제 방식**: 소프트 삭제
```
상태 변경:
- isDeleted: true
- deletedAt: 현재 시간
- deletedBy: 삭제한 사용자 ID
- content: undefined (내용 제거)
- fileMetadata: undefined (파일 정보 제거)

연쇄 작업:
- MessageReadReceipt → CASCADE (읽음 영수증 삭제)
- 답장 메시지의 replyToMessageId는 유지 (참조만 남음)
```

### 6. TravelUser (여행 멤버십)
**삭제 방식**: 하드 삭제
```
연쇄 작업:
- 없음 (독립적으로 삭제)
- Travel의 memberCount 감소
```

### 7. PlanetUser (채팅방 멤버십)
**삭제 방식**: 하드 삭제
```
연쇄 작업:
- 없음 (독립적으로 삭제)
- Planet의 memberCount 감소
```

### 8. MessageReadReceipt (읽음 영수증)
**삭제 방식**: 하드 삭제
```
연쇄 작업:
- 없음 (말단 엔티티)
```

### 9. Notification (알림)
**삭제 방식**: 하드 삭제
```
연쇄 작업:
- 없음 (말단 엔티티)
```

### 10. Profile (프로필)
**삭제 방식**: 하드 삭제
```
연쇄 작업:
- 없음 (User에 종속)
```

### 11. FileUpload (파일 업로드)
**삭제 방식**: 하드 삭제
```
연쇄 작업:
- Cloudflare R2의 실제 파일도 삭제
- VideoProcessing → CASCADE (비디오 처리 기록 삭제)
```

### 12. VideoProcessing (비디오 처리)
**삭제 방식**: 하드 삭제
```
연쇄 작업:
- 없음 (FileUpload에 종속)
```

## 🔗 CASCADE 삭제 체인

### Travel 삭제 시 전체 연쇄 삭제 순서
```
Travel (여행)
├─ TravelUser (모든 멤버십)
├─ Planet (모든 채팅방)
│  ├─ PlanetUser (채팅방 멤버십)
│  └─ Message (모든 메시지)
│     └─ MessageReadReceipt (읽음 상태)
└─ Notification (여행 관련 알림)
```

### User 삭제 시 영향
```
User (소프트 삭제)
├─ Profile → 삭제
├─ TravelUser → 삭제 (모든 여행에서 제거)
├─ PlanetUser → 삭제 (모든 채팅방에서 제거)
├─ Message.sender → NULL (메시지는 유지, 익명화)
├─ Notification.userId → 삭제
├─ Notification.triggeredBy → NULL
├─ ReadReceipt → 삭제
└─ FileUpload → 삭제
```

## ⚠️ 중요 고려사항

### 1. 데이터 보존
- **User**: 법적 요구사항이나 감사 목적으로 소프트 삭제
- **Message**: 대화 내역 보존을 위해 소프트 삭제
- 삭제된 사용자의 메시지는 "탈퇴한 사용자"로 표시

### 2. 익명화 처리
- User 삭제 시 관련 Message의 sender가 NULL로 설정
- Message 엔티티의 `isFromDeletedUser` 플래그 설정
- `deletedUserType`으로 사용자 유형 구분 (user/admin)

### 3. 성능 고려사항
- CASCADE 삭제는 연쇄적으로 발생하므로 대량 데이터 삭제 시 주의
- Travel 삭제 시 하위 모든 데이터가 삭제되므로 사전 확인 필요
- 인덱스가 설정된 필드들의 CASCADE 삭제는 자동으로 처리됨

### 4. 복구 정책
- 소프트 삭제 (User, Message): 관리자가 복구 가능
- 하드 삭제: 복구 불가능, 백업에서만 복원 가능

### 5. 트랜잭션 처리
- 모든 CASCADE 삭제는 단일 트랜잭션으로 처리
- 부분 실패 시 전체 롤백

## 🛡️ 보안 고려사항

### 권한 검증
- Travel 삭제: HOST 권한 필요
- Planet 삭제: Travel HOST 권한 필요  
- Message 삭제: 본인 또는 관리자
- User 삭제: 본인 또는 시스템 관리자

### 삭제 전 확인
- 중요 엔티티(Travel, User) 삭제 시 2차 확인 필요
- 연쇄 삭제 영향 범위 사전 알림
- 삭제 작업 로그 기록

## 📝 마이그레이션 정보

### AddCascadeDeleteRelations (1755220473803)
적용된 CASCADE 관계:
- `planets.travelId` → `travels.id` ON DELETE CASCADE
- `messages.planetId` → `planets.id` ON DELETE CASCADE  
- `messages.senderId` → `users.id` ON DELETE SET NULL
- `notifications.userId` → `users.id` ON DELETE CASCADE
- `notifications.travelId` → `travels.id` ON DELETE CASCADE
- `notifications.planetId` → `planets.id` ON DELETE CASCADE
- `notifications.triggeredBy` → `users.id` ON DELETE SET NULL

## 🔄 업데이트 이력

- 2024-08-15: CASCADE 삭제 관계 적용
- 2024-08-15: User, Message 제외 모든 엔티티 하드 삭제 전환
- 2024-08-14: 초기 삭제 정책 수립