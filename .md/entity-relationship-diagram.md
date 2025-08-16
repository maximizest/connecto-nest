# 엔티티 관계도 (Entity Relationship Diagram)

## 전체 ERD

```mermaid
erDiagram
    User ||--o| Profile : "has"
    User ||--o{ TravelUser : "participates"
    User ||--o{ PlanetUser : "joins"
    User ||--o{ Message : "sends"
    User ||--o{ MessageReadReceipt : "reads"
    User ||--o{ Notification : "receives"
    User ||--o{ FileUpload : "uploads"
    
    Travel ||--o{ TravelUser : "has members"
    Travel ||--o{ Planet : "contains"
    
    TravelUser }o--|| User : "member"
    TravelUser }o--|| Travel : "belongs to"
    
    Planet }o--|| Travel : "belongs to"
    Planet ||--o{ PlanetUser : "has members"
    Planet ||--o{ Message : "contains"
    Planet ||--o| User : "partner (DIRECT)"
    
    PlanetUser }o--|| User : "member"
    PlanetUser }o--|| Planet : "belongs to"
    
    Message }o--|| User : "sender"
    Message }o--|| Planet : "in"
    Message ||--o{ MessageReadReceipt : "has receipts"
    Message ||--o| Message : "replies to"
    
    MessageReadReceipt }o--|| User : "reader"
    MessageReadReceipt }o--|| Message : "for"
    
    Notification }o--|| User : "recipient"
    
    FileUpload }o--|| User : "uploader"
    
    Admin ||--|| Admin : "self-reference"
```

## 엔티티 상세 구조

### User (사용자)
```mermaid
erDiagram
    User {
        int id PK
        string email UK
        string socialId UK
        string socialProvider
        string name
        string phone
        string language
        string timezone
        boolean notificationsEnabled
        boolean advertisingConsentEnabled
        boolean isBanned
        timestamp lastSeenAt
        timestamp createdAt
        timestamp updatedAt
        timestamp deletedAt
        int deletedBy FK
        string deletionReason
    }
```

### Profile (프로필)
```mermaid
erDiagram
    Profile {
        int id PK
        int userId FK_UK
        string bio
        string profileImage
        string coverImage
        date birthday
        string gender
        json hobbies
        json interests
        string website
        json socialLinks
        json education
        json work
        json skills
        timestamp createdAt
        timestamp updatedAt
    }
```

### Travel (여행 그룹)
```mermaid
erDiagram
    Travel {
        int id PK
        string name
        string description
        string coverImage
        string invitationCode UK
        string status
        string visibility
        timestamp startDate
        timestamp endDate
        json metadata
        timestamp createdAt
        timestamp updatedAt
        timestamp deletedAt
    }
```

### Planet (채팅방)
```mermaid
erDiagram
    Planet {
        int id PK
        int travelId FK
        string name
        string description
        string imageUrl
        string type
        int partnerId FK
        boolean isActive
        json timeRestriction
        json metadata
        timestamp createdAt
        timestamp updatedAt
        timestamp deletedAt
    }
```

### Message (메시지)
```mermaid
erDiagram
    Message {
        int id PK
        int planetId FK
        int senderId FK
        string type
        string content
        json fileMetadata
        json systemMetadata
        int replyToMessageId FK
        int readCount
        int replyCount
        boolean isEdited
        timestamp editedAt
        string originalContent
        string searchableText
        json metadata
        string status
        timestamp createdAt
        timestamp updatedAt
        timestamp deletedAt
        int deletedBy FK
        string deletionReason
    }
```

## 핵심 관계 설명

### 1. 사용자 관련 (User-centric)
```mermaid
graph TB
    User[User<br/>사용자]
    Profile[Profile<br/>프로필]
    TravelUser[TravelUser<br/>여행 멤버십]
    PlanetUser[PlanetUser<br/>채팅방 멤버십]
    
    User ---|1:1| Profile
    User ---|1:N| TravelUser
    User ---|1:N| PlanetUser
    
    style User fill:#f9f,stroke:#333,stroke-width:4px
    style Profile fill:#bbf,stroke:#333,stroke-width:2px
    style TravelUser fill:#bfb,stroke:#333,stroke-width:2px
    style PlanetUser fill:#fbf,stroke:#333,stroke-width:2px
```

### 2. 여행-채팅방 계층 구조 (Travel-Planet Hierarchy)
```mermaid
graph TD
    Travel[Travel<br/>여행 그룹]
    Planet[Planet<br/>채팅방]
    Message[Message<br/>메시지]
    
    Travel -->|1:N| Planet
    Planet -->|1:N| Message
    
    style Travel fill:#f96,stroke:#333,stroke-width:4px
    style Planet fill:#69f,stroke:#333,stroke-width:3px
    style Message fill:#6f9,stroke:#333,stroke-width:2px
```

### 3. 멤버십 관계 (Membership Relations)
```mermaid
graph LR
    User[User]
    Travel[Travel]
    Planet[Planet]
    TravelUser[TravelUser<br/>역할: HOST/PARTICIPANT<br/>상태: ACTIVE/BANNED/LEFT]
    PlanetUser[PlanetUser<br/>상태: ACTIVE/MUTED]
    
    User -->|참여| TravelUser
    Travel -->|멤버| TravelUser
    User -->|참여| PlanetUser
    Planet -->|멤버| PlanetUser
    
    style TravelUser fill:#ffd,stroke:#333,stroke-width:2px
    style PlanetUser fill:#dff,stroke:#333,stroke-width:2px
```

### 4. 메시지 시스템 (Message System)
```mermaid
graph TB
    Message[Message<br/>메시지]
    User[User<br/>발신자]
    Planet[Planet<br/>채팅방]
    MessageReadReceipt[MessageReadReceipt<br/>읽음 확인]
    ReplyMessage[Message<br/>답장]
    
    User -->|작성| Message
    Message -->|속함| Planet
    Message -->|읽음| MessageReadReceipt
    Message -.->|답장| ReplyMessage
    User -->|읽음| MessageReadReceipt
    
    style Message fill:#9f9,stroke:#333,stroke-width:3px
    style MessageReadReceipt fill:#ff9,stroke:#333,stroke-width:2px
```

### 5. 알림 및 파일 시스템 (Notification & File System)
```mermaid
graph TB
    User[User]
    Notification[Notification<br/>알림]
    FileUpload[FileUpload<br/>파일 업로드]
    Message[Message]
    
    User -->|수신| Notification
    User -->|업로드| FileUpload
    FileUpload -.->|첨부| Message
    
    style Notification fill:#f99,stroke:#333,stroke-width:2px
    style FileUpload fill:#99f,stroke:#333,stroke-width:2px
```

## 멤버십 엔티티 상세

### TravelUser (여행 멤버십)
```mermaid
erDiagram
    TravelUser {
        int id PK
        int travelId FK
        int userId FK
        string role
        string status
        timestamp bannedUntil
        timestamp joinedAt
        timestamp leftAt
        timestamp createdAt
        timestamp updatedAt
    }
```

**역할 (Role)**
- `HOST`: 여행 관리자
- `PARTICIPANT`: 일반 참여자

**상태 (Status)**
- `ACTIVE`: 활성 멤버
- `BANNED`: 차단됨
- `LEFT`: 자진 탈퇴

### PlanetUser (채팅방 멤버십)
```mermaid
erDiagram
    PlanetUser {
        int id PK
        int planetId FK
        int userId FK
        string status
        timestamp mutedUntil
        int lastReadMessageId FK
        timestamp joinedAt
        timestamp leftAt
        timestamp createdAt
        timestamp updatedAt
    }
```

**상태 (Status)**
- `ACTIVE`: 활성 멤버
- `MUTED`: 음소거 상태

## 읽음 확인 및 알림 엔티티

### MessageReadReceipt (메시지 읽음 확인)
```mermaid
erDiagram
    MessageReadReceipt {
        int id PK
        int messageId FK
        int userId FK
        int planetId FK
        timestamp readAt
        timestamp createdAt
    }
```

### Notification (알림)
```mermaid
erDiagram
    Notification {
        int id PK
        int recipientId FK
        string type
        string title
        string body
        json data
        boolean isRead
        timestamp readAt
        timestamp sentAt
        timestamp createdAt
        timestamp updatedAt
    }
```

**알림 타입 (Type)**
- `MESSAGE`: 새 메시지
- `MESSAGE_REPLY`: 답장
- `TRAVEL_INVITATION`: 여행 초대
- `TRAVEL_UPDATE`: 여행 업데이트
- `PLANET_UPDATE`: 채팅방 업데이트
- `USER_JOINED`: 사용자 참여
- `USER_LEFT`: 사용자 탈퇴
- `MENTION`: 멘션
- `ANNOUNCEMENT`: 공지사항
- `SYSTEM`: 시스템 알림

## 파일 및 관리자 엔티티

### FileUpload (파일 업로드)
```mermaid
erDiagram
    FileUpload {
        int id PK
        int uploaderId FK
        string fileName
        string originalName
        string mimeType
        int fileSize
        string storageKey
        string storageUrl
        string thumbnailUrl
        json metadata
        string status
        timestamp uploadStartedAt
        timestamp uploadCompletedAt
        timestamp createdAt
        timestamp updatedAt
        timestamp deletedAt
    }
```

**상태 (Status)**
- `PENDING`: 대기 중
- `UPLOADING`: 업로드 중
- `COMPLETED`: 완료
- `FAILED`: 실패

### Admin (관리자)
```mermaid
erDiagram
    Admin {
        int id PK
        string email UK
        string password
        string name
        string role
        boolean isActive
        timestamp lastLoginAt
        json permissions
        int createdBy FK
        timestamp createdAt
        timestamp updatedAt
    }
```

**역할 (Role)**
- `SUPER_ADMIN`: 최고 관리자
- `ADMIN`: 일반 관리자
- `MODERATOR`: 중재자

## 주요 특징

### 1. Soft Delete 지원 엔티티
- User, Travel, Planet, Message, FileUpload
- `deletedAt` 필드로 관리
- 데이터 보존 및 복구 가능

### 2. 시간 기반 제한
- **TravelUser.bannedUntil**: 차단 만료 시간
- **PlanetUser.mutedUntil**: 음소거 만료 시간
- **Planet.timeRestriction**: 채팅 가능 시간대
- **Message 편집**: 생성 후 15분 이내만 가능

### 3. 메타데이터 지원 (JSON 필드)
- Travel, Planet, Message, FileUpload의 `metadata`
- Profile의 `hobbies`, `interests`, `socialLinks`, `education`, `work`, `skills`
- Admin의 `permissions`
- Notification의 `data`

## 데이터베이스 인덱스 전략

### 유니크 인덱스
- User: `email`, `socialId`
- Travel: `invitationCode`
- Admin: `email`
- Profile: `userId` (1:1 관계)

### 복합 인덱스
- TravelUser: `(travelId, userId)` - 중복 방지
- PlanetUser: `(planetId, userId)` - 중복 방지
- MessageReadReceipt: `(messageId, userId)` - 중복 읽음 방지
- Message: `(planetId, createdAt)` - 메시지 목록 조회 최적화

### 일반 인덱스
- Message: `senderId`, `replyToMessageId`, `searchableText`
- Notification: `recipientId`, `isRead`, `type`
- FileUpload: `uploaderId`, `status`
- All entities: `createdAt`, `deletedAt`

## 관계 제약 조건

### CASCADE 동작
- User 삭제 시 → Profile Soft Delete
- Travel 삭제 시 → Planet Soft Delete
- Planet 삭제 시 → Message Soft Delete
- Message 삭제 시 → MessageReadReceipt 유지 (읽음 기록 보존)

### 제약 조건
- Planet.type이 `DIRECT`인 경우 → partnerId 필수
- Message.type이 `SYSTEM`인 경우 → systemMetadata 필수
- TravelUser는 Travel당 User당 하나만 존재
- PlanetUser는 Planet당 User당 하나만 존재
- MessageReadReceipt는 Message당 User당 하나만 존재

## 성능 최적화 고려사항

### 1. Eager Loading 관계
- User → Profile (자주 함께 조회)
- Message → Sender (메시지 목록 표시 시)
- TravelUser → User (멤버 목록 표시 시)

### 2. Lazy Loading 관계
- Travel → Planets (필요시에만 로드)
- Planet → Messages (페이지네이션 적용)
- User → Notifications (페이지네이션 적용)

### 3. Count 필드 비정규화
- Message.readCount: 읽은 사용자 수 (캐싱)
- Message.replyCount: 답장 수 (캐싱)
- Travel.memberCount: 멤버 수 (캐싱 고려)
- Planet.memberCount: 멤버 수 (캐싱 고려)

### 4. 검색 최적화
- Message.searchableText: Full-text search 인덱스
- PostgreSQL의 GIN 인덱스 활용
- 검색 가능 필드: content, fileMetadata.originalName, systemMetadata.reason

### 5. 실시간 기능 최적화
- Redis를 활용한 온라인 상태 관리
- WebSocket을 통한 실시간 메시지 전송
- 읽음 확인 일괄 처리 (batch processing)