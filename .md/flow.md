# Connecto User Flow Documentation

## 📱 Application Overview

Connecto는 여행 그룹 기반의 실시간 메시징 및 커뮤니케이션 플랫폼입니다. 사용자들이 여행 그룹(Travel)을 만들고, 그 안에서 다양한 채팅방(Planet)을 통해 소통할 수 있는 엔터프라이즈급 시스템입니다.

### Core Architecture
```
User (사용자) 1:1 Profile (프로필)
├── TravelUser (여행 멤버십) M:M Travel (여행 그룹)
│   └── Planet (채팅방) 1:M
│       ├── PlanetUser (채팅방 멤버십) M:M
│       └── Message (메시지) 1:M
│           └── MessageReadReceipt (읽음 확인) M:M
├── Notification (알림) 1:M
└── FileUpload (파일 업로드) M:1
```

### System Features
- **Social Authentication**: Google/Apple OAuth 통합
- **Real-time Communication**: WebSocket 기반 실시간 메시징
- **Multi-Channel Notifications**: FCM, Email, SMS, In-App
- **Enterprise File Handling**: 500MB 파일, 청크 업로드, Cloudflare R2
- **Advanced Moderation**: 3단계 차단 시스템 (User/Travel/Planet)
- **Rich Messaging**: 텍스트, 이미지, 비디오, 파일, 반응, 답글
- **Sophisticated Read Receipts**: 메시지별 읽음 상태 추적
- **Complex Scheduling**: 채팅방별 시간 제한 설정

---

## 🔐 1. Authentication & Profile System

### 1.1 Social Login Flow (Google/Apple)

#### Flow Sequence:
```mermaid
sequenceDiagram
    participant Client
    participant AuthController
    participant AuthService
    participant UserService
    participant ProfileService
    participant DB
    
    Client->>AuthController: POST /api/v1/auth/sign/social
    Note right of Client: {provider, idToken, pushToken, deviceInfo}
    
    AuthController->>AuthService: verifySocialToken()
    alt Google Provider
        AuthService->>Google: Verify ID Token
        Google-->>AuthService: User Info
    else Apple Provider
        AuthService->>Apple: Verify ID Token
        Apple-->>AuthService: User Info
    end
    
    AuthService->>UserService: findOrCreateSocialUser()
    UserService->>DB: Check existing user
    
    alt New User
        UserService->>DB: Create User
        UserService->>ProfileService: createProfile()
        ProfileService->>DB: Create Profile (1:1)
        UserService->>UserService: registerPushToken()
    else Existing User
        UserService->>DB: Update last login
        UserService->>UserService: updatePushToken()
    end
    
    AuthService->>AuthService: generateTokenPair()
    AuthService-->>Client: {accessToken, refreshToken, user, profile}
```

#### Technical Details:
- **Endpoint**: `POST /api/v1/auth/sign/social`
- **Authentication**: Google OAuth2 / Apple Sign In
- **Push Token Registration**: Automatic FCM token registration
- **User Roles**: ADMIN, HOST, USER
- **Profile Completion**: Automatic percentage calculation

### 1.2 Profile Management System

#### Profile Entity Features:
```typescript
interface Profile {
  nickname?: string;        // User display name
  name?: string;           // Real name
  gender?: string;         // Gender information
  age?: number;           // Age
  occupation?: string;     // Job/occupation
  profileCompletion: number; // Auto-calculated percentage
  preferences: UserPreferences; // Notification & privacy settings
}

interface UserPreferences {
  notifications: {
    push: boolean;
    email: boolean;
    sms: boolean;
    inApp: boolean;
  };
  privacy: {
    profileVisibility: 'public' | 'friends' | 'private';
    lastSeenVisibility: boolean;
  };
}
```

---

## 🌍 2. Travel (여행 그룹) Management System

### 2.1 Travel Creation & Lifecycle

#### Flow Sequence:
```mermaid
sequenceDiagram
    participant Admin
    participant TravelController
    participant TravelService
    participant TravelUserService
    participant PlanetService
    participant DB
    
    Admin->>TravelController: POST /api/v1/travels
    Note right of Admin: {name, description, startDate, endDate, visibility}
    
    TravelController->>TravelService: create()
    TravelService->>DB: Create Travel (status: INACTIVE)
    
    TravelService->>TravelUserService: addHost()
    TravelUserService->>DB: Create TravelUser (role: HOST)
    
    TravelService->>PlanetService: createDefaultPlanet()
    PlanetService->>DB: Create GROUP Planet (auto-join all members)
    
    Note over TravelService: Travel becomes ACTIVE when startDate reached
    TravelService-->>Admin: Travel object with inviteCode
```

#### Travel Status Lifecycle:
```typescript
enum TravelStatus {
  INACTIVE = 'inactive',  // 계획 중, 취소됨, 완료됨
  ACTIVE = 'active',      // 진행 중 (startDate ~ endDate)
}

// Auto-activation logic
// - INACTIVE → ACTIVE: when current time >= startDate
// - ACTIVE → INACTIVE: when current time > endDate
// - Admin can extend endDate to reactivate
```

### 2.2 Travel Join Flow with Validation

#### Flow Sequence:
```mermaid
sequenceDiagram
    participant User
    participant TravelController
    participant TravelService
    participant TravelUserService
    participant PlanetUserService
    participant NotificationService
    
    User->>TravelController: POST /api/v1/travels/{id}/join
    Note right of User: {inviteCode (if INVITE_ONLY)}
    
    TravelController->>TravelService: validateJoinRequest()
    
    alt PUBLIC Travel
        TravelService->>TravelService: Check travel is ACTIVE
    else INVITE_ONLY Travel
        TravelService->>TravelService: Verify inviteCode + ACTIVE status
    end
    
    TravelService->>TravelUserService: addParticipant()
    TravelUserService->>DB: Create TravelUser (role: PARTICIPANT, status: ACTIVE)
    
    TravelService->>PlanetUserService: addToGroupPlanets()
    loop For each GROUP planet
        PlanetUserService->>DB: Create PlanetUser (auto-join)
    end
    
    TravelService->>NotificationService: sendJoinNotification()
    
    TravelService-->>User: Success with travel + planets
```

### 2.3 Travel Visibility & Access Control

#### Visibility Types:
```typescript
enum TravelVisibility {
  PUBLIC = 'public',          // 누구나 참여 가능
  INVITE_ONLY = 'invite_only' // 초대코드 필요
}

// Invite Code System
// - Auto-generated 8-character code for INVITE_ONLY travels
// - Code regeneration by HOST
// - Code sharing via system or external means
```

---

## 💬 3. Planet (채팅방) Advanced Management

### 3.1 Planet Types & Features

#### Planet Type System:
```typescript
enum PlanetType {
  GROUP = 'group',           // 다중 사용자 채팅
  DIRECT = 'direct',         // 1:1 개인 채팅
  ANNOUNCEMENT = 'announcement' // 공지사항 전용
}

// GROUP Planet Features:
// - All travel members auto-join
// - Moderator role management
// - Time restrictions with scheduling
// - File sharing & reactions
// - Message threading

// DIRECT Planet Features:
// - Exactly 2 users only
// - Cannot add/remove members
// - Private conversation
// - Auto-created on first message

// ANNOUNCEMENT Planet Features:
// - Read-only for participants
// - Only HOST/MODERATOR can post
// - System-wide important notices
// - No time restrictions
```

### 3.2 Complex Time Restriction System

#### Time Restriction Features:
```typescript
enum TimeRestrictionType {
  NONE = 'none',        // No restrictions
  DAILY = 'daily',      // Daily time windows
  WEEKLY = 'weekly',    // Weekly schedules  
  CUSTOM = 'custom'     // Custom scheduling
}

interface TimeRestriction {
  type: TimeRestrictionType;
  startTime?: string;     // HH:mm format
  endTime?: string;       // HH:mm format
  daysOfWeek?: number[];  // 0(Sunday) ~ 6(Saturday)
  timezone?: string;      // User timezone
  customSchedule?: {
    startDate: Date;
    endDate: Date;
    recurring?: boolean;
  }[];
}

// Chat allowance calculation:
// 1. Check planet status (ACTIVE/INACTIVE)
// 2. Evaluate time restrictions for user's timezone
// 3. Apply custom schedules if defined
// 4. Return boolean: can chat now?
```

### 3.3 Direct Message (1:1) Auto-Creation

#### Flow Sequence:
```mermaid
sequenceDiagram
    participant User1
    participant User2
    participant PlanetService
    participant PlanetUserService
    participant DB
    
    User1->>PlanetService: Send message to User2
    PlanetService->>DB: Check existing DIRECT planet
    
    alt DM Planet Exists
        PlanetService->>DB: Use existing planet
    else Create New DM
        PlanetService->>DB: Create Planet (type: DIRECT)
        PlanetService->>PlanetUserService: addBothUsers()
        PlanetUserService->>DB: Create PlanetUser for User1
        PlanetUserService->>DB: Create PlanetUser for User2
    end
    
    PlanetService-->>User1: Planet ready for messaging
```

---

## 📨 4. Advanced Messaging System

### 4.1 Rich Message Types & Features

#### Message Type System:
```typescript
enum MessageType {
  TEXT = 'text',           // Plain text with markdown support
  IMAGE = 'image',         // Image with optional caption
  VIDEO = 'video',         // Video with auto-thumbnail
  FILE = 'file',           // Document/file attachment
  SYSTEM = 'system'        // System-generated messages
}

// Message Features:
interface MessageFeatures {
  editing: {
    timeLimit: 15;          // 15 minutes edit window
    trackOriginal: true;    // Keep original content
    textOnly: true;         // Only text messages editable
  };
  softDelete: {
    recoveryWindow: 24;     // 24 hours recovery
    placeholder: "Message deleted"; // Shown to users
    adminCanRestore: true;  // Admin override
  };
  reactions: {
    emojiSupport: true;     // Unicode emoji reactions
    multiplePerUser: true;  // Multiple reactions per user
    realTimeSync: true;     // WebSocket sync
  };
  replies: {
    threadSupport: true;    // Message reply chains
    contextPreservation: true; // Show original message
  };
  search: {
    fullTextSearch: true;   // searchableText field
    fileContentSearch: false; // Files not searchable
  };
}
```

### 4.2 Real-time Message Flow (WebSocket)

#### Advanced Message Broadcasting:
```mermaid
sequenceDiagram
    participant Sender
    participant ChatGateway
    participant MessageService
    participant PlanetUserService
    participant NotificationService
    participant Redis
    participant OtherUsers
    participant OfflineUsers
    
    Sender->>ChatGateway: socket.emit('message:send')
    Note right of Sender: {planetId, content, type, fileAttachment}
    
    ChatGateway->>PlanetUserService: validateMembership()
    ChatGateway->>PlanetUserService: checkMuteStatus()
    ChatGateway->>PlanetService: checkTimeRestrictions()
    
    alt User Authorized & Chat Allowed
        ChatGateway->>MessageService: createMessage()
        MessageService->>DB: Save Message with searchableText
        
        ChatGateway->>Redis: Publish to planet channel
        Redis-->>ChatGateway: Broadcast confirmation
        
        ChatGateway->>Sender: socket.emit('message:new')
        ChatGateway->>OtherUsers: socket.emit('message:new')
        
        ChatGateway->>NotificationService: triggerNotifications()
        NotificationService->>OfflineUsers: Send push notifications
        
        Note over MessageService: Auto-generate searchable text
        Note over MessageService: File processing if attached
    else Not Authorized/Muted/Time Restricted
        ChatGateway->>Sender: socket.emit('error', {code, reason})
    end
```

### 4.3 Enterprise File Upload System

#### Chunked Upload Flow:
```mermaid
sequenceDiagram
    participant Client
    participant FileUploadController
    participant StorageService
    participant CloudflareR2
    participant MessageService
    participant ImageOptimization
    
    Client->>FileUploadController: POST /api/v1/file-uploads/presigned-url
    Note right of Client: {fileName, fileSize, mimeType, chunkSize: 5MB}
    
    FileUploadController->>StorageService: generatePresignedUrl()
    StorageService->>CloudflareR2: Create multipart upload
    StorageService-->>Client: {uploadUrls[], uploadId, chunkSize}
    
    loop For each 5MB chunk
        Client->>CloudflareR2: Upload chunk with ETags
        CloudflareR2-->>Client: ETag response
    end
    
    Client->>FileUploadController: POST /api/v1/file-uploads/complete
    Note right of Client: {uploadId, eTags[], totalSize}
    
    FileUploadController->>StorageService: completeMultipartUpload()
    StorageService->>CloudflareR2: Combine chunks
    
    alt Image File (>5MB)
        FileUploadController->>ImageOptimization: startAutoOptimization()
        ImageOptimization->>CloudflareR2: Generate optimized versions
    end
    
    FileUploadController->>MessageService: attachFileToMessage()
    MessageService-->>Client: Message with file metadata
```

#### File Size Limits & Processing:
```yaml
File Limits:
  Maximum Size: 500MB per file
  Chunk Size: 5MB segments
  Concurrent Uploads: 3 per user
  
Image Processing:
  Auto-optimization: >5MB images
  Formats: WebP conversion for efficiency
  Thumbnails: Auto-generated for videos
  
Security:
  Virus Scanning: All uploads scanned
  Type Validation: MIME type verification
  Content Analysis: Suspicious content detection
```

---

## 📊 5. Advanced Read Receipt System

### 5.1 Granular Read Tracking

#### Read Receipt Architecture:
```typescript
interface MessageReadReceipt {
  messageId: number;
  userId: number;
  readAt: Date;
  deviceType?: string;      // iOS, Android, Web
  readContext?: {
    planetId: number;
    sessionId: string;
    ipAddress: string;       // For analytics
    timeInView: number;      // Milliseconds
  };
}

// Features:
// - Per-message, per-user tracking
// - Device analytics
// - Batch read operations
// - Unread count optimization
// - Read status synchronization across devices
```

### 5.2 Batch Read Operations Flow

#### Flow Sequence:
```mermaid
sequenceDiagram
    participant Client
    participant ChatGateway
    participant ReadReceiptService
    participant Redis
    participant DB
    participant MessageSenders
    
    Client->>ChatGateway: socket.emit('messages:read_multiple')
    Note right of Client: {planetId, messageIds[], readAt}
    
    ChatGateway->>ReadReceiptService: batchMarkAsRead()
    
    par Database Update
        ReadReceiptService->>DB: Bulk insert/update receipts
    and Cache Update
        ReadReceiptService->>Redis: Update unread counts
        ReadReceiptService->>Redis: Cache read timestamps
    end
    
    ChatGateway->>Client: socket.emit('read:confirmed')
    ChatGateway->>MessageSenders: socket.emit('message:read:batch')
    Note left of MessageSenders: Update UI with read indicators
    
    Note over ReadReceiptService: Analytics: track reading patterns
```

### 5.3 Unread Count Management

#### Real-time Unread Counting:
```typescript
// Redis-based unread count optimization
interface UnreadCounting {
  planetUnreadCounts: {
    key: `user:${userId}:planet:${planetId}:unread`;
    ttl: 7 * 24 * 60 * 60; // 7 days
    value: number;
  };
  
  globalUnreadCount: {
    key: `user:${userId}:total:unread`;
    ttl: 24 * 60 * 60; // 24 hours
    value: number;
  };
  
  lastReadMessage: {
    key: `user:${userId}:planet:${planetId}:lastRead`;
    ttl: 7 * 24 * 60 * 60; // 7 days
    value: {messageId: number, readAt: Date};
  };
}

// WebSocket Events:
// - planet:get_unread_count
// - user:get_all_unread_counts
// - unread_count_updated (broadcast)
```

---

## 🔔 6. Multi-Channel Notification System

### 6.1 Individual Channel Architecture

#### Notification Channel System:
```typescript
enum NotificationChannel {
  IN_APP = 'in_app',       // 앱 내 알림
  PUSH = 'push',           // FCM 푸시 알림
  EMAIL = 'email',         // 이메일 알림
  SMS = 'sms',            // SMS 알림 (미래 확장)
  WEBSOCKET = 'websocket'  // 실시간 WebSocket
}

// Individual Channel Records:
// Each notification creates separate records per channel
// Allows independent delivery tracking and retry logic
// User preferences control which channels are active
```

### 6.2 Notification Delivery Flow

#### Multi-Channel Delivery:
```mermaid
sequenceDiagram
    participant Event
    participant NotificationService
    participant UserService
    participant FCMService
    participant EmailService
    participant WebSocketGateway
    participant DB
    
    Event->>NotificationService: createNotification()
    Note right of Event: {type, userId, content, data}
    
    NotificationService->>UserService: getUserPreferences()
    UserService-->>NotificationService: {channels: [PUSH, IN_APP, WEBSOCKET]}
    
    par Create Channel Records
        NotificationService->>DB: Create PUSH notification
        NotificationService->>DB: Create IN_APP notification  
        NotificationService->>DB: Create WEBSOCKET notification
    end
    
    par Deliver to Channels
        NotificationService->>FCMService: sendPush()
        FCMService->>FCM: Deliver push notification
        FCMService-->>NotificationService: Delivery status
    and
        NotificationService->>WebSocketGateway: emit('notification')
        WebSocketGateway->>OnlineUsers: Real-time delivery
    and
        NotificationService->>DB: Store IN_APP for later retrieval
    end
    
    NotificationService->>DB: Update delivery status per channel
```

### 6.3 FCM Push Notification System

#### Push Token Management:
```typescript
interface PushTokenManagement {
  registration: {
    endpoint: 'POST /api/v1/notifications/push-token';
    automatic: true; // During social login
    multiDevice: true; // Multiple tokens per user
  };
  
  tokenLifecycle: {
    renewal: 'automatic'; // Token refresh handling
    cleanup: 'scheduled'; // Remove expired tokens
    validation: 'realtime'; // Verify token validity
  };
  
  deviceSupport: {
    platforms: ['iOS', 'Android', 'Web'];
    badges: true; // Unread count badges
    sounds: true; // Custom notification sounds
    actions: true; // Interactive push actions
  };
}

// Push Payload Structure:
interface PushPayload {
  title: string;
  body: string;
  badge?: number;           // Unread count
  sound?: string;          // Notification sound
  category?: string;       // Notification category
  data: {
    notificationId: number;
    type: NotificationType;
    planetId?: number;     // Deep link data
    travelId?: number;     // Deep link data
    customData?: any;      // Additional payload
  };
}
```

---

## 🔒 7. Three-Tier Security & Permission System

### 7.1 Multi-Level Ban Architecture

#### Ban System Hierarchy:
```typescript
// Level 1: Platform-Level (User Entity)
interface UserBan {
  level: 'PLATFORM';
  field: 'User.isBanned';
  effect: 'Complete login prevention';
  scope: 'All travels and planets';
  duration: 'Permanent or time-limited';
  authority: 'System Admin only';
}

// Level 2: Travel-Level (TravelUser Entity)  
interface TravelBan {
  level: 'TRAVEL';
  field: 'TravelUser.status = BANNED';
  effect: 'Travel participation restriction';
  scope: 'Specific travel + all its planets';
  duration: 'Configurable by HOST';
  authority: 'Travel HOST/MODERATOR';
}

// Level 3: Planet-Level (PlanetUser Entity)
interface PlanetMute {
  level: 'PLANET';
  field: 'PlanetUser.status = BANNED'; // Actually mute
  effect: 'Cannot send messages, can read';
  scope: 'Specific planet only';
  duration: 'Time-limited (1h, 24h, 7d)';
  authority: 'Planet MODERATOR';
}
```

### 7.2 Permission Matrix

#### Role-Based Access Control:
```yaml
System Admin (User.role = ADMIN):
  - All permissions globally
  - User management (ban/unban)
  - System configuration
  - Audit log access
  - Emergency controls

Travel Host (TravelUser.role = HOST):
  - Travel settings management
  - Member management (invite/remove/ban)
  - Planet creation/deletion
  - Moderator assignment
  - Travel lifecycle control

Travel Moderator (TravelUser.role = MODERATOR):
  - Limited member management
  - Message deletion within travel
  - Planet-specific moderation
  - Report handling

Planet Moderator (PlanetUser.role = MODERATOR):
  - Message moderation in planet
  - User muting (planet-specific)
  - Pinned messages
  - Planet settings

Regular Member (PARTICIPANT/USER):
  - Send/edit/delete own messages
  - React to messages
  - Reply to messages
  - View member lists
  - Leave travel/planet
```

### 7.3 Ban Enforcement Flow

#### Travel-Level Ban Process:
```mermaid
sequenceDiagram
    participant HOST
    participant TravelUserController
    participant TravelUserService
    participant PlanetUserService
    participant NotificationService
    participant ChatGateway
    participant BannedUser
    
    HOST->>TravelUserController: POST /api/v1/travel-users/{id}/ban
    Note right of HOST: {reason, duration, banType}
    
    TravelUserController->>TravelUserService: banUser()
    TravelUserService->>DB: Update TravelUser.status = BANNED
    
    TravelUserService->>PlanetUserService: removeFromAllTravelPlanets()
    loop For each planet in travel
        PlanetUserService->>DB: Delete PlanetUser record
    end
    
    TravelUserService->>ChatGateway: disconnectUserFromTravel()
    ChatGateway->>BannedUser: Force disconnect from travel rooms
    
    TravelUserService->>NotificationService: sendBanNotification()
    NotificationService->>BannedUser: BANNED notification
    
    TravelUserService-->>HOST: Ban confirmation with details
```

---

## ⚡ 8. Advanced WebSocket System

### 8.1 WebSocket Event Architecture

#### Core Event Categories:
```typescript
// Message Events
interface MessageEvents {
  'message:send': MessageSendDto;
  'message:edit': MessageEditDto;
  'message:delete': MessageDeleteDto;
  'message:restore': MessageRestoreDto;
  'message:new': Message;           // Broadcast
  'message:edited': Message;        // Broadcast
  'message:deleted': {id: number};  // Broadcast
}

// Room Management Events
interface RoomEvents {
  'room:join': JoinRoomDto;
  'room:leave': LeaveRoomDto;
  'room:get_info': {planetId: number};
  'user:joined': {userId: number, planetId: number};
  'user:left': {userId: number, planetId: number};
}

// Advanced Typing Events
interface TypingEvents {
  'typing:advanced_start': {
    planetId: number;
    messageLength?: number;
    language?: string;
  };
  'typing:stop': {planetId: number};
  'typing:update': {
    planetId: number; 
    progress: number; // 0-100%
  };
  'typing:get_status': {planetId: number};
  'typing:get_analytics': {planetId: number};
}

// Read Receipt Events
interface ReadReceiptEvents {
  'message:read': MarkMessageReadDto;
  'messages:read_multiple': MarkMultipleReadDto;
  'planet:read_all': MarkAllReadDto;
  'planet:get_unread_count': {planetId: number};
  'user:get_all_unread_counts': {};
}
```

### 8.2 Advanced Rate Limiting

#### Multi-Tier Rate Limiting:
```typescript
interface RateLimitStrategy {
  messagesSend: {
    windowMs: 60000;        // 1 minute
    maxMessages: 100;       // 100 messages per minute
    skipSuccessfulRequests: false;
    penalty: 'temporary_mute'; // 5 minute mute
  };
  
  roomJoin: {
    windowMs: 300000;       // 5 minutes
    maxJoins: 20;          // 20 room joins per 5 minutes
    penalty: 'connection_throttle';
  };
  
  fileUpload: {
    windowMs: 300000;       // 5 minutes
    maxUploads: 10;        // 10 file uploads per 5 minutes
    penalty: 'upload_restriction';
  };
  
  typing: {
    windowMs: 60000;        // 1 minute
    maxEvents: 50;         // 50 typing events per minute
    penalty: 'typing_disabled';
  };
}

// Penalty System:
// - Violations trigger temporary restrictions
// - Progressive penalties for repeat offenders
// - Automatic penalty removal after timeout
// - Admin override capabilities
```

### 8.3 Connection Management & Room System

#### Intelligent Room Management:
```typescript
interface WebSocketRooms {
  autoJoinRooms: [
    `user:${userId}`,          // Personal notifications
    `travel:${travelId}`,      // Travel-wide events
    `planet:${planetId}:general` // Each authorized planet
  ];
  
  dynamicRooms: {
    onPlanetActive: `planet:${planetId}:active`;    // Active chatting
    onTyping: `planet:${planetId}:typing`;          // Typing indicators
    onPresence: `planet:${planetId}:presence`;      // User presence
  };
  
  adminRooms: [
    'system:admin',            // System-wide admin events
    'moderation:alerts'        // Moderation alerts
  ];
}

// Connection Features:
// - Automatic reconnection with exponential backoff
// - Room permission validation on join
// - Graceful degradation when Redis unavailable
// - Connection pooling and load balancing
// - Heartbeat monitoring with auto-disconnect
```

---

## 📈 9. Analytics & Monitoring System

### 9.1 User Behavior Analytics

#### Event Tracking System:
```yaml
Authentication Events:
  - user.signup: {provider, device, location}
  - user.login: {provider, device, sessionDuration}
  - user.logout: {duration, reason}
  - token.refresh: {frequency, deviceInfo}

Travel Events:
  - travel.created: {hostId, memberCount, duration}
  - travel.joined: {joinMethod, inviteCode, referrer}
  - travel.left: {reason, timeSpent, messagesSent}
  - travel.completed: {memberRetention, satisfaction}

Messaging Events:
  - message.sent: {type, length, hasAttachment, planetType}
  - message.edited: {timeAfterSend, editCount}
  - message.deleted: {timeAfterSend, reason}
  - message.read: {timeToRead, deviceType}

Engagement Events:
  - app.opened: {frequency, timeOfDay, pushNotificationClicked}
  - planet.viewed: {duration, messagesRead, participation}
  - notification.clicked: {type, timeToClick, actionTaken}
  - typing.started: {duration, completionRate, language}

File Events:
  - file.uploaded: {type, size, uploadTime, success}
  - file.downloaded: {type, deviceType, networkType}
  - file.shared: {shareMethod, recipientCount}
```

### 9.2 System Health Monitoring

#### Comprehensive Health Checks:
```typescript
interface SystemHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: Date;
  version: string;
  
  services: {
    database: {
      status: ServiceStatus;
      connectionPool: {active: number, idle: number, waiting: number};
      queryPerformance: {avgMs: number, slowQueries: number};
      migrationStatus: string;
    };
    
    redis: {
      status: ServiceStatus;
      memory: {used: string, peak: string, fragmentation: number};
      connections: {clients: number, blocked: number};
      keyspaceHits: number;
    };
    
    storage: {
      status: ServiceStatus;
      cloudflareR2: {latency: number, errorRate: number};
      uploadQueue: {pending: number, failed: number};
      bandwidth: {upload: string, download: string};
    };
    
    websocket: {
      status: ServiceStatus;
      connections: {total: number, authenticated: number};
      rooms: {count: number, averageSize: number};
      messageRate: {perSecond: number, peakPerSecond: number};
    };
    
    notifications: {
      status: ServiceStatus;
      fcm: {successRate: number, latency: number};
      email: {queueSize: number, deliveryRate: number};
      websocket: {deliveryRate: number, connectionRate: number};
    };
  };
  
  metrics: {
    activeUsers: {current: number, peak24h: number, growth: number};
    activeConnections: {websocket: number, database: number, redis: number};
    messagesPerMinute: {current: number, average: number, peak: number};
    avgResponseTime: {api: number, websocket: number, database: number};
    errorRates: {api: number, websocket: number, notifications: number};
    resourceUsage: {cpu: number, memory: number, disk: number, network: number};
  };
}

// Health Check Endpoints:
// GET /health - Basic health check (response time < 100ms)
// GET /health/detailed - Comprehensive status (authenticated, admin only)
// GET /health/metrics - Prometheus-compatible metrics export
```

---

## 🔧 10. Background Jobs & Scheduled Tasks

### 10.1 Cron Job Schedule

#### Automated Maintenance Tasks:
```yaml
Daily Tasks (0 2 * * *):
  expired_data_cleanup:
    - notifications older than 30 days (except important)
    - failed file uploads older than 7 days
    - orphaned read receipts cleanup
    - expired push tokens removal
    - temporary file cleanup (Cloudflare R2)
  
  analytics_aggregation:
    - daily user activity summaries
    - message volume statistics
    - travel completion rates
    - notification delivery rates
    - system performance metrics

Every 5 Minutes (*/5 * * * *):
  real_time_updates:
    - travel status auto-updates (INACTIVE ↔ ACTIVE)
    - time restriction evaluations
    - notification retry processing
    - WebSocket connection cleanup
    - cache warming for popular data

Every Hour (0 * * * *):
  optimization_tasks:
    - database query optimization hints
    - Redis memory optimization
    - file storage cleanup
    - search index rebuilding
    - performance metric collection

Weekly Tasks (0 3 * * 0):
  deep_maintenance:
    - database vacuum and reindexing
    - full cache rebuild
    - audit log archival
    - security scan reports
    - backup verification
    - performance baseline updates
```

### 10.2 Background Job Queue

#### Asynchronous Job Processing:
```typescript
enum JobType {
  // File Processing
  IMAGE_OPTIMIZATION = 'image.optimize',     // Auto-optimize large images
  VIDEO_THUMBNAIL = 'video.thumbnail',       // Generate video thumbnails
  FILE_VIRUS_SCAN = 'file.virus_scan',      // Security scanning
  FILE_METADATA_EXTRACT = 'file.metadata',  // Extract file information
  
  // Notifications
  PUSH_NOTIFICATION = 'notification.push',   // FCM delivery
  EMAIL_NOTIFICATION = 'notification.email', // Email delivery
  BULK_NOTIFICATION = 'notification.bulk',   // Mass notifications
  NOTIFICATION_RETRY = 'notification.retry', // Failed delivery retry
  
  // Data Processing
  USER_DATA_EXPORT = 'user.export',         // GDPR data export
  USER_DATA_DELETE = 'user.delete',         // Account deletion
  MESSAGE_SEARCH_INDEX = 'message.index',   // Search optimization
  ANALYTICS_AGGREGATE = 'analytics.process', // Data aggregation
  
  // System Maintenance
  CACHE_WARMING = 'cache.warm',             // Preload cache
  DATABASE_OPTIMIZE = 'database.optimize',  // Query optimization
  FILE_CLEANUP = 'file.cleanup',           // Storage cleanup
  AUDIT_LOG_PROCESS = 'audit.process',     // Security audit
  
  // Travel Management
  TRAVEL_STATUS_UPDATE = 'travel.status',   // Auto-activate/deactivate
  TRAVEL_EXPIRY_NOTICE = 'travel.expiry',  // Expiry notifications
  MEMBER_ACTIVITY_DIGEST = 'member.digest', // Activity summaries
}

// Job Priority System:
enum JobPriority {
  CRITICAL = 1,    // User-facing operations (notifications, messages)
  HIGH = 2,        // File processing, real-time features
  NORMAL = 3,      // Analytics, optimization
  LOW = 4,         // Cleanup, maintenance
  BULK = 5         // Mass operations, exports
}
```

---

## 🎯 11. Development & Deployment

### 11.1 API Development Standards

#### CRUD Pattern Implementation:
```typescript
// Standard Controller Pattern using @foryourdev/nestjs-crud
@Controller({ path: 'entities', version: '1' })
@Crud({
  entity: Entity,
  only: ['index', 'show', 'create', 'update', 'destroy'],
  allowedFilters: ['field1', 'field2', 'status', 'createdAt'],
  allowedParams: ['field1', 'field2', 'relationId'],
  allowedIncludes: ['relation1', 'relation2'],
  routes: {
    index: {
      decorators: [UseGuards(AuthGuard)],
      interceptors: [LoggingInterceptor],
    },
    show: {
      decorators: [UseGuards(AuthGuard)],
    },
  },
})
export class EntityController {
  constructor(public readonly crudService: EntityService) {}
  
  // Custom endpoints
  @Post(':id/custom-action')
  @UseGuards(AuthGuard)
  async customAction(@Param('id') id: string) {
    // Custom business logic
  }
}
```

### 11.2 Zero-Downtime Deployment Strategy

#### Blue-Green Deployment Flow:
```mermaid
sequenceDiagram
    participant LoadBalancer
    participant BlueVersion
    participant GreenVersion
    participant Database
    participant HealthCheck
    
    Note over LoadBalancer,Database: Phase 1: Prepare Green Environment
    LoadBalancer->>BlueVersion: Route 100% traffic
    GreenVersion->>Database: Run backward-compatible migrations
    GreenVersion->>HealthCheck: Validate green environment
    
    Note over LoadBalancer,Database: Phase 2: Gradual Traffic Shift
    LoadBalancer->>BlueVersion: Route 90% traffic
    LoadBalancer->>GreenVersion: Route 10% traffic
    HealthCheck->>GreenVersion: Monitor error rates & performance
    
    Note over LoadBalancer,Database: Phase 3: Full Migration
    LoadBalancer->>BlueVersion: Route 50% traffic
    LoadBalancer->>GreenVersion: Route 50% traffic
    HealthCheck->>GreenVersion: Validate stability
    
    Note over LoadBalancer,Database: Phase 4: Completion
    LoadBalancer->>GreenVersion: Route 100% traffic
    BlueVersion->>BlueVersion: Graceful shutdown
    Database->>Database: Run forward-only migrations
```

#### Deployment Safety Checks:
```yaml
Pre-deployment Validation:
  - Database migration compatibility
  - API backward compatibility
  - WebSocket protocol compatibility
  - File upload/storage compatibility
  - Push notification format compatibility

Rolling Deployment Strategy:
  - Instance-by-instance replacement
  - Health check validation at each step
  - Automatic rollback on failure
  - WebSocket connection preservation
  - Active message queue preservation

Post-deployment Verification:
  - End-to-end functionality tests
  - Performance regression testing
  - Error rate monitoring
  - User experience validation
  - Critical path verification
```

---

## 📚 12. Technical Specifications

### 12.1 Database Schema (Actual Implementation)

#### Entity Relationships:
```sql
-- Core Relationships
users (1) ----< (1) profiles
users (1) ----< (N) travel_users
users (1) ----< (N) planet_users
users (1) ----< (N) messages
users (1) ----< (N) message_read_receipts
users (1) ----< (N) notifications
users (1) ----< (N) file_uploads

travels (1) ----< (N) travel_users
travels (1) ----< (N) planets

planets (1) ----< (N) planet_users
planets (1) ----< (N) messages

messages (1) ----< (N) message_read_receipts

-- Indexes for Performance
CREATE INDEX idx_travel_users_composite ON travel_users(travel_id, user_id, status);
CREATE INDEX idx_planet_users_composite ON planet_users(planet_id, user_id, status);
CREATE INDEX idx_messages_planet_created ON messages(planet_id, created_at DESC);
CREATE INDEX idx_messages_search ON messages USING gin(searchable_text);
CREATE INDEX idx_notifications_user_status ON notifications(user_id, status, created_at DESC);
CREATE INDEX idx_read_receipts_message ON message_read_receipts(message_id, user_id);
```

### 12.2 Environment Configuration

#### Production Environment Variables:
```env
# Application
NODE_ENV=production
PORT=3000
API_VERSION=v1

# Database
DATABASE_URL=postgresql://user:password@host:5432/connecto_prod
DATABASE_SSL=true
DATABASE_POOL_SIZE=20
DATABASE_CONNECTION_TIMEOUT=60000

# JWT Security
JWT_SECRET=your-super-secure-secret-key-32-characters-min
JWT_ACCESS_TOKEN_EXPIRES_IN=15m
JWT_REFRESH_TOKEN_EXPIRES_IN=7d

# Redis Cache
REDIS_URL=redis://redis-host:6379
REDIS_PASSWORD=your-redis-password
REDIS_DB=0
REDIS_MAX_CONNECTIONS=10

# Cloudflare R2 Storage
CLOUDFLARE_R2_ACCOUNT_ID=your-account-id
CLOUDFLARE_R2_ACCESS_KEY_ID=your-access-key
CLOUDFLARE_R2_SECRET_ACCESS_KEY=your-secret-key
CLOUDFLARE_R2_BUCKET_NAME=connecto-files
CLOUDFLARE_R2_PUBLIC_URL=https://files.connecto.app

# Social Authentication
GOOGLE_CLIENT_ID=your-google-client-id
APPLE_CLIENT_ID=your-apple-client-id

# Push Notifications
FCM_SERVER_KEY=your-fcm-server-key
FCM_SENDER_ID=your-fcm-sender-id

# Email Service (Optional)
SMTP_HOST=smtp.your-provider.com
SMTP_PORT=587
SMTP_USER=noreply@connecto.app
SMTP_PASS=your-smtp-password

# Monitoring & Analytics
SENTRY_DSN=your-sentry-dsn
NEW_RELIC_LICENSE_KEY=your-newrelic-key
ANALYTICS_API_KEY=your-analytics-key

# Security
RATE_LIMIT_MAX=1000
RATE_LIMIT_WINDOW_MS=900000
CORS_ORIGINS=https://app.connecto.com,https://admin.connecto.com
```

### 12.3 Performance Benchmarks

#### System Performance Targets:
```yaml
API Performance:
  Response Time:
    - 95th percentile: <200ms
    - 99th percentile: <500ms
    - Average: <100ms
  
  Throughput:
    - Messages per second: >1000
    - API requests per second: >5000
    - Concurrent WebSocket connections: >10000
  
  Error Rates:
    - API error rate: <0.1%
    - WebSocket error rate: <0.05%
    - Notification delivery failure: <1%

Database Performance:
  Query Response:
    - Simple queries: <10ms
    - Complex queries: <100ms
    - Aggregation queries: <500ms
  
  Connection Pool:
    - Max connections: 20
    - Connection timeout: 60s
    - Idle timeout: 30s

Cache Performance:
  Redis Metrics:
    - Hit rate: >95%
    - Memory usage: <2GB
    - Connection latency: <5ms
  
  Cache TTL Strategy:
    - User sessions: 24h
    - Message cache: 1h
    - Unread counts: 7d
    - Typing indicators: 5s

File Upload Performance:
  Upload Targets:
    - 10MB file: <30s
    - 100MB file: <5min
    - 500MB file: <15min
  
  Processing:
    - Image optimization: <10s
    - Video thumbnail: <30s
    - Virus scanning: <60s
```

---

## 📝 Version History & Roadmap

### Version History:
- **v1.0.0** (2024-01): Initial release with basic messaging
- **v1.1.0** (2024-02): Added direct messaging and file uploads
- **v1.2.0** (2024-03): WebSocket real-time features
- **v1.3.0** (2024-04): Advanced file upload system (chunked, 500MB)
- **v1.4.0** (2024-05): Multi-channel push notifications
- **v1.5.0** (2024-06): Simplified architecture (removed admin module, notification read tracking)
- **v1.6.0** (2024-07): Advanced read receipts and typing indicators
- **v1.7.0** (2024-08): Three-tier ban system and complex time restrictions
- **v1.8.0** (2024-09): Enterprise analytics and monitoring
- **v1.9.0** (2024-10): Performance optimizations and caching
- **v2.0.0** (2024-11): Production-ready deployment

### Upcoming Features (Roadmap):
- **v2.1.0**: Advanced message reactions and threading
- **v2.2.0**: Voice/video calling integration
- **v2.3.0**: Advanced search with full-text indexing
- **v2.4.0**: AI-powered content moderation
- **v2.5.0**: Multi-language support and localization
- **v3.0.0**: Microservices architecture migration

---

*Last Updated: 2024-01-14*
*Generated from Connecto NestJS Backend v1.8.0*
*Documentation reflects actual codebase implementation*