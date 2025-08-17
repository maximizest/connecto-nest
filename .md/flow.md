# Connecto User Flow Documentation

## 📱 Application Overview

Connecto는 여행 그룹 기반의 실시간 메시징 및 커뮤니케이션 플랫폼입니다. 사용자들이 여행 그룹(Travel)을 만들고, 그 안에서 다양한 채팅방(Planet)을 통해 소통할 수 있는 시스템입니다.

### Core Architecture
```
User (사용자)
  ├── Travel (여행 그룹)
  │   ├── TravelUser (멤버십)
  │   └── Planet (채팅방)
  │       ├── PlanetUser (멤버십)
  │       └── Message (메시지)
  │           └── ReadReceipt (읽음 확인)
  └── Notification (알림)
```

---

## 🔐 1. Authentication & Registration Flow

### 1.1 Social Login (Google/Apple)

#### Flow Sequence:
```mermaid
sequenceDiagram
    participant Client
    participant AuthController
    participant AuthService
    participant UserService
    participant ProfileService
    participant DB
    
    Client->>AuthController: POST /api/v1/auth/social-signin
    Note right of Client: {provider, idToken}
    
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
        ProfileService->>DB: Create Profile
    else Existing User
        UserService->>DB: Update last login
    end
    
    AuthService->>AuthService: generateTokenPair()
    AuthService-->>Client: {accessToken, refreshToken, user}
```

#### Technical Details:
- **Endpoint**: `POST /api/v1/auth/social-signin`
- **Request Body**:
  ```json
  {
    "provider": "google" | "apple",
    "idToken": "string",
    "deviceInfo": {
      "deviceId": "string",
      "platform": "ios" | "android" | "web",
      "pushToken": "string (optional)"
    }
  }
  ```
- **Response**:
  ```json
  {
    "accessToken": "JWT token",
    "refreshToken": "JWT token",
    "user": {
      "id": 1,
      "email": "user@example.com",
      "name": "User Name",
      "profile": {...}
    }
  }
  ```

### 1.2 Token Refresh Flow

#### Flow Sequence:
```mermaid
sequenceDiagram
    participant Client
    participant AuthController
    participant AuthService
    participant UserService
    
    Client->>AuthController: POST /api/v1/auth/refresh
    Note right of Client: {refreshToken}
    
    AuthController->>AuthService: verifyToken(refreshToken)
    AuthService->>UserService: findById(userId)
    
    alt Valid Token & Active User
        AuthService->>AuthService: generateTokenPair()
        AuthService-->>Client: {accessToken, refreshToken}
    else Invalid/Expired Token
        AuthService-->>Client: 401 Unauthorized
    end
```

---

## 🌍 2. Travel (여행 그룹) Management Flow

### 2.1 Travel Creation Flow

#### Flow Sequence:
```mermaid
sequenceDiagram
    participant Client
    participant TravelController
    participant TravelService
    participant TravelUserService
    participant PlanetService
    participant NotificationService
    participant DB
    
    Client->>TravelController: POST /api/v1/travels
    Note right of Client: {name, description, startDate, endDate}
    
    TravelController->>TravelService: create()
    TravelService->>DB: Create Travel
    
    TravelService->>TravelUserService: addHost()
    TravelUserService->>DB: Create TravelUser (role: HOST)
    
    TravelService->>PlanetService: createDefaultPlanets()
    PlanetService->>DB: Create General Planet
    PlanetService->>DB: Create Announcement Planet
    
    TravelService->>NotificationService: sendWelcomeNotification()
    
    TravelService-->>Client: Travel object with id
```

#### Technical Details:
- **Endpoint**: `POST /api/v1/travels`
- **Request Body**:
  ```json
  {
    "name": "유럽 여행 2024",
    "description": "파리-런던-바르셀로나 3주 여행",
    "imageUrl": "https://...",
    "startDate": "2024-06-01",
    "endDate": "2024-06-21",
    "visibility": "invite_only" | "public",
    "inviteCode": "auto-generated if invite_only"
  }
  ```
- **Auto-created Planets**:
  - General Chat (GROUP type)
  - Announcements (ANNOUNCEMENT type)

### 2.2 Travel Join Flow

#### Flow Sequence:
```mermaid
sequenceDiagram
    participant Client
    participant TravelController
    participant TravelService
    participant TravelUserService
    participant PlanetUserService
    participant NotificationService
    
    Client->>TravelController: POST /api/v1/travels/{id}/join
    Note right of Client: {inviteCode (if required)}
    
    TravelController->>TravelService: validateJoinRequest()
    
    alt Public Travel
        TravelService->>TravelService: Allow join
    else Invite Only
        TravelService->>TravelService: Verify invite code
    end
    
    TravelService->>TravelUserService: addParticipant()
    TravelUserService->>DB: Create TravelUser (role: PARTICIPANT)
    
    TravelService->>PlanetUserService: addToDefaultPlanets()
    loop For each default planet
        PlanetUserService->>DB: Create PlanetUser
    end
    
    TravelService->>NotificationService: notifyHostAndMembers()
    
    TravelService-->>Client: Success with travel details
```

### 2.3 Travel Member Management

#### Host Capabilities:
- Invite/remove members
- Promote participants to moderators
- Create/delete planets
- Send announcements
- Modify travel settings
- Ban/unban users

#### Participant Capabilities:
- View travel info
- Join available planets
- Send messages
- Leave travel

---

## 💬 3. Planet (채팅방) Management Flow

### 3.1 Planet Creation Flow

#### Flow Sequence:
```mermaid
sequenceDiagram
    participant Client
    participant PlanetController
    participant PlanetService
    participant TravelUserService
    participant PlanetUserService
    participant DB
    
    Client->>PlanetController: POST /api/v1/planets
    Note right of Client: {travelId, name, type, description}
    
    PlanetController->>TravelUserService: verifyHostPermission()
    
    alt User is Host/Moderator
        PlanetService->>DB: Create Planet
        
        PlanetService->>PlanetUserService: addCreatorAsModerator()
        PlanetUserService->>DB: Create PlanetUser (role: MODERATOR)
        
        alt Auto-add all members
            PlanetService->>PlanetUserService: addAllTravelMembers()
        end
        
        PlanetService-->>Client: Planet object
    else Insufficient Permission
        PlanetController-->>Client: 403 Forbidden
    end
```

### 3.2 Direct Message (1:1 Chat) Flow

#### Flow Sequence:
```mermaid
sequenceDiagram
    participant Client
    participant PlanetController
    participant PlanetService
    participant PlanetUserService
    
    Client->>PlanetController: POST /api/v1/planets/direct
    Note right of Client: {travelId, targetUserId}
    
    PlanetController->>PlanetService: findOrCreateDirectPlanet()
    PlanetService->>DB: Check existing DM planet
    
    alt DM Exists
        PlanetService-->>Client: Existing planet
    else Create New DM
        PlanetService->>DB: Create Planet (type: DIRECT)
        PlanetService->>PlanetUserService: addBothUsers()
        PlanetService-->>Client: New planet
    end
```

### 3.3 Planet Types & Features

#### GROUP Planet:
- Multiple members
- Moderator roles
- Member management
- File sharing
- Message reactions

#### DIRECT Planet:
- Exactly 2 members
- No moderators
- Cannot add/remove members
- Private conversation

#### ANNOUNCEMENT Planet:
- Read-only for participants
- Only hosts/moderators can post
- System-wide notifications
- Pinned messages

---

## 📨 4. Messaging Flow

### 4.1 Real-time Message Sending (WebSocket)

#### Flow Sequence:
```mermaid
sequenceDiagram
    participant Client
    participant WebSocketGateway
    participant MessageService
    participant PlanetUserService
    participant NotificationService
    participant Redis
    participant DB
    
    Client->>WebSocketGateway: socket.emit('message:send')
    Note right of Client: {planetId, content, type, files}
    
    WebSocketGateway->>PlanetUserService: validateMembership()
    
    alt User is Member & Not Muted
        WebSocketGateway->>MessageService: createMessage()
        MessageService->>DB: Save Message
        
        WebSocketGateway->>Redis: Publish to channel
        Redis-->>WebSocketGateway: Broadcast to subscribers
        
        WebSocketGateway->>Client: socket.emit('message:created')
        WebSocketGateway->>OtherClients: socket.emit('message:received')
        
        WebSocketGateway->>NotificationService: sendPushNotifications()
        NotificationService-->>OfflineUsers: Push Notification
    else Not Authorized
        WebSocketGateway->>Client: socket.emit('error')
    end
```

### 4.2 Message Types & Features

#### Message Types:
```typescript
enum MessageType {
  TEXT = 'text',           // Plain text message
  IMAGE = 'image',         // Image with optional caption
  VIDEO = 'video',         // Video with optional caption
  FILE = 'file',           // Document/file attachment
  LOCATION = 'location',   // GPS coordinates
  SYSTEM = 'system',       // System-generated messages
  REPLY = 'reply',         // Reply to another message
}
```

#### Message Operations:
- **Send**: Create new message
- **Edit**: Modify own messages (within 24 hours)
- **Delete**: Soft delete with "Message deleted" placeholder
- **Reply**: Thread-based replies
- **React**: Emoji reactions
- **Forward**: Share to other planets
- **Pin**: Pin important messages (moderators only)

### 4.3 File Upload Flow

#### Flow Sequence:
```mermaid
sequenceDiagram
    participant Client
    participant FileUploadController
    participant StorageService
    participant CloudflareR2
    participant MessageService
    
    Client->>FileUploadController: POST /api/v1/file-uploads/presigned-url
    Note right of Client: {fileName, fileSize, mimeType}
    
    FileUploadController->>StorageService: generatePresignedUrl()
    StorageService->>CloudflareR2: Create presigned URL
    StorageService-->>Client: {uploadUrl, uploadId}
    
    Client->>CloudflareR2: Direct upload file
    CloudflareR2-->>Client: Success
    
    Client->>FileUploadController: POST /api/v1/file-uploads/complete
    Note right of Client: {uploadId, storageKey}
    
    FileUploadController->>StorageService: verifyUpload()
    StorageService->>CloudflareR2: Check file exists
    
    FileUploadController->>MessageService: attachFileToMessage()
    MessageService-->>Client: Message with file attachment
```

#### File Size Limits:
- Images: 10MB
- Videos: 500MB
- Documents: 50MB
- Audio: 100MB

---

## 🔔 5. Notification System Flow

### 5.1 Notification Types

```typescript
enum NotificationType {
  MESSAGE = 'message',     // New message in planet
  MENTION = 'mention',     // User mentioned in message
  REPLY = 'reply',         // Reply to user's message
  BANNED = 'banned',       // User banned from travel/planet
  SYSTEM = 'system',       // System announcements
}
```

### 5.2 Multi-Channel Notification Delivery

#### Flow Sequence:
```mermaid
sequenceDiagram
    participant Event
    participant NotificationService
    participant UserService
    participant PushService
    participant EmailService
    participant WebSocketGateway
    participant DB
    
    Event->>NotificationService: Trigger notification
    
    NotificationService->>UserService: getUserPreferences()
    UserService-->>NotificationService: Notification settings
    
    NotificationService->>DB: Create notification record
    
    par Push Notification
        NotificationService->>PushService: sendPush()
        PushService->>FCM/APNs: Send push
    and Email Notification
        NotificationService->>EmailService: sendEmail()
        EmailService->>SMTP: Send email
    and In-App Notification
        NotificationService->>DB: Store for in-app
    and WebSocket
        NotificationService->>WebSocketGateway: emit('notification')
        WebSocketGateway->>OnlineClients: Real-time notification
    end
```

### 5.3 Notification Preferences

Users can configure:
- Channel preferences (push, email, in-app, websocket)
- Notification types (messages, mentions, replies, etc.)
- Quiet hours (Do Not Disturb schedule)
- Per-planet mute settings

---

## 👥 6. User Profile & Settings Flow

### 6.1 Profile Management

#### Profile Update Flow:
```mermaid
sequenceDiagram
    participant Client
    participant ProfileController
    participant ProfileService
    participant StorageService
    participant DB
    
    Client->>ProfileController: PATCH /api/v1/profiles/me
    Note right of Client: {bio, avatar, preferences}
    
    alt Avatar Upload
        ProfileController->>StorageService: uploadAvatar()
        StorageService->>CloudflareR2: Store image
        StorageService-->>ProfileController: Avatar URL
    end
    
    ProfileController->>ProfileService: updateProfile()
    ProfileService->>DB: Update profile
    
    ProfileService-->>Client: Updated profile
```

### 6.2 User Settings

#### Available Settings:
```typescript
interface UserSettings {
  // Privacy
  profileVisibility: 'public' | 'friends' | 'private';
  lastSeenVisibility: boolean;
  readReceiptsEnabled: boolean;
  
  // Notifications
  pushNotifications: boolean;
  emailNotifications: boolean;
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  
  // Appearance
  theme: 'light' | 'dark' | 'auto';
  fontSize: 'small' | 'medium' | 'large';
  
  // Language & Region
  language: string;
  timezone: string;
  
  // Security
  twoFactorEnabled: boolean;
  biometricEnabled: boolean;
}
```

---

## 📊 7. Read Receipt & Typing Indicator Flow

### 7.1 Read Receipt Flow

#### Flow Sequence:
```mermaid
sequenceDiagram
    participant Client
    participant WebSocketGateway
    participant ReadReceiptService
    participant Redis
    participant DB
    
    Client->>WebSocketGateway: socket.emit('message:read')
    Note right of Client: {messageId, planetId}
    
    WebSocketGateway->>ReadReceiptService: markAsRead()
    ReadReceiptService->>DB: Create/Update ReadReceipt
    
    ReadReceiptService->>Redis: Update last read cache
    
    WebSocketGateway->>MessageSender: socket.emit('message:read:confirmation')
    Note left of MessageSender: Show double check mark
```

### 7.2 Typing Indicator Flow

#### Flow Sequence:
```mermaid
sequenceDiagram
    participant Client
    participant WebSocketGateway
    participant TypingService
    participant Redis
    participant OtherClients
    
    Client->>WebSocketGateway: socket.emit('typing:start')
    Note right of Client: {planetId}
    
    WebSocketGateway->>TypingService: addTypingUser()
    TypingService->>Redis: Set with TTL (5 seconds)
    
    WebSocketGateway->>OtherClients: socket.emit('user:typing')
    Note left of OtherClients: Show "User is typing..."
    
    alt User stops typing
        Client->>WebSocketGateway: socket.emit('typing:stop')
    else Auto timeout
        Redis-->>TypingService: TTL expires
    end
    
    WebSocketGateway->>OtherClients: socket.emit('user:stopped:typing')
```

---

## 🔒 8. Security & Permission Flow

### 8.1 Permission Hierarchy

```yaml
System Admin:
  - All permissions
  - System maintenance
  - User management

Travel Host:
  - Travel settings management
  - Member management (invite/remove/ban)
  - Planet creation/deletion
  - Announcement posting
  - Moderator assignment

Travel Moderator:
  - Member muting
  - Message deletion
  - Planet settings (within assigned planets)
  - Pinned messages

Planet Moderator:
  - Message moderation (edit/delete others)
  - Member muting (planet-specific)
  - Pinned messages
  - Planet settings

Regular Member:
  - Send messages
  - Edit/delete own messages
  - React to messages
  - View member list
  - Leave planet/travel
```

### 8.2 Ban System Flow

#### Flow Sequence:
```mermaid
sequenceDiagram
    participant Host
    participant TravelUserController
    participant TravelUserService
    participant PlanetUserService
    participant NotificationService
    participant WebSocketGateway
    
    Host->>TravelUserController: POST /api/v1/travel-users/{id}/ban
    Note right of Host: {reason, duration}
    
    TravelUserController->>TravelUserService: banUser()
    TravelUserService->>DB: Update status to BANNED
    
    TravelUserService->>PlanetUserService: removeFromAllPlanets()
    loop For each planet
        PlanetUserService->>DB: Delete PlanetUser
    end
    
    TravelUserService->>WebSocketGateway: disconnectUser()
    WebSocketGateway->>BannedUser: Force disconnect
    
    TravelUserService->>NotificationService: sendBanNotification()
    
    TravelUserService-->>Host: Ban confirmation
```

### 8.3 Mute System Flow

Planet-specific muting (less severe than ban):
- User can view messages
- Cannot send messages
- Cannot react to messages
- Time-limited (e.g., 1 hour, 24 hours, 7 days)

---

## 🚀 9. Performance Optimization Flows

### 9.1 Message Pagination (Cursor-based)

```typescript
// Efficient cursor-based pagination for messages
interface MessagePaginationQuery {
  planetId: number;
  cursor?: string;  // Base64 encoded {id, createdAt}
  limit?: number;   // Default: 50, Max: 100
  direction?: 'before' | 'after';
}

// Response includes next/prev cursors for infinite scroll
interface PaginatedMessages {
  messages: Message[];
  meta: {
    hasMore: boolean;
    nextCursor?: string;
    prevCursor?: string;
    totalUnread: number;
  };
}
```

### 9.2 Redis Caching Strategy

```yaml
Cached Data:
  User Sessions:
    - Key: user:{userId}:session
    - TTL: 24 hours
    - Data: JWT payload, device info
  
  Online Status:
    - Key: user:{userId}:online
    - TTL: 5 minutes (refreshed on activity)
    - Data: Last seen, active planets
  
  Typing Indicators:
    - Key: planet:{planetId}:typing
    - TTL: 5 seconds
    - Data: Set of user IDs
  
  Last Read Messages:
    - Key: user:{userId}:planet:{planetId}:lastRead
    - TTL: 7 days
    - Data: Message ID, timestamp
  
  Message Cache:
    - Key: planet:{planetId}:messages:recent
    - TTL: 1 hour
    - Data: Last 50 messages
```

### 9.3 WebSocket Connection Management

```typescript
// Connection pooling and room management
interface WebSocketRooms {
  // User automatically joins these rooms on connect
  userRooms: [
    `user:${userId}`,           // Personal notifications
    `travel:${travelId}`,       // Travel-wide events
    ...planetRooms              // Each joined planet
  ];
  
  // Dynamic room join/leave based on navigation
  dynamicRooms: {
    onPlanetOpen: `planet:${planetId}:active`,
    onPlanetClose: // Leave active room
    onTyping: `planet:${planetId}:typing`,
  };
}
```

---

## 📱 10. Mobile App Specific Flows

### 10.1 Push Token Registration

```mermaid
sequenceDiagram
    participant MobileApp
    participant AuthController
    participant UserService
    participant PushService
    participant DB
    
    MobileApp->>FCM/APNs: Request push token
    FCM/APNs-->>MobileApp: Push token
    
    MobileApp->>AuthController: POST /api/v1/auth/register-device
    Note right of MobileApp: {pushToken, platform, deviceId}
    
    AuthController->>UserService: updateDeviceInfo()
    UserService->>DB: Store/Update device
    
    UserService->>PushService: validateToken()
    PushService->>FCM/APNs: Verify token
    
    UserService-->>MobileApp: Device registered
```

### 10.2 Background Sync

Mobile apps sync data when returning from background:
1. Check authentication status
2. Fetch unread message count
3. Update online status
4. Sync recent messages
5. Update notification badges

### 10.3 Offline Mode

```yaml
Offline Capabilities:
  - View cached messages
  - Queue outgoing messages
  - Store draft messages
  - Access downloaded files
  
On Reconnection:
  - Send queued messages
  - Sync message status
  - Update read receipts
  - Refresh planet list
```

---

## 🔄 11. Data Synchronization Flows

### 11.1 Real-time Sync via WebSocket

```typescript
// WebSocket events for real-time synchronization
enum SyncEvents {
  // Message events
  'message:created',
  'message:updated', 
  'message:deleted',
  'message:reaction:added',
  'message:reaction:removed',
  
  // User events
  'user:online',
  'user:offline',
  'user:typing',
  'user:updated',
  
  // Planet events
  'planet:updated',
  'planet:member:added',
  'planet:member:removed',
  'planet:member:muted',
  
  // Travel events
  'travel:updated',
  'travel:member:joined',
  'travel:member:left',
  'travel:deleted',
}
```

### 11.2 Conflict Resolution

When multiple clients modify same data:
1. **Last Write Wins**: For user settings, profile updates
2. **Operational Transform**: For collaborative message editing
3. **Server Authority**: For permissions, bans, critical data
4. **Version Vectors**: For offline sync conflicts

---

## 🎯 12. Admin Panel Flows

### 12.1 System Administration

Admin users (role: ADMIN) can:
- View system metrics and health
- Manage users (suspend, delete, restore)
- View all travels and planets
- Send system-wide notifications
- Access audit logs
- Configure system settings

### 12.2 Moderation Tools

```typescript
interface ModerationActions {
  // Content moderation
  deleteMessage(messageId: number): Promise<void>;
  bulkDeleteMessages(filters: MessageFilter): Promise<number>;
  
  // User moderation
  suspendUser(userId: number, reason: string, duration?: number): Promise<void>;
  banFromPlatform(userId: number, reason: string): Promise<void>;
  
  // Travel/Planet moderation
  freezeTravel(travelId: number): Promise<void>;
  deletePlanet(planetId: number): Promise<void>;
  
  // Reporting
  viewReports(filters: ReportFilter): Promise<Report[]>;
  resolveReport(reportId: number, action: string): Promise<void>;
}
```

---

## 📈 13. Analytics & Monitoring Flows

### 13.1 User Analytics Events

```yaml
Events Tracked:
  Authentication:
    - user.signup
    - user.login
    - user.logout
    - token.refresh
  
  Travel:
    - travel.created
    - travel.joined
    - travel.left
    - travel.deleted
  
  Messaging:
    - message.sent
    - message.edited
    - message.deleted
    - file.uploaded
  
  Engagement:
    - app.opened
    - planet.viewed
    - notification.clicked
    - user.active (heartbeat)
```

### 13.2 System Monitoring

```typescript
// Health check endpoints
GET /health           // Basic health
GET /health/detailed  // Detailed system status

interface SystemHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: Date;
  services: {
    database: ServiceStatus;
    redis: ServiceStatus;
    storage: ServiceStatus;
    websocket: ServiceStatus;
  };
  metrics: {
    activeUsers: number;
    activeConnections: number;
    messagesPerMinute: number;
    avgResponseTime: number;
  };
}
```

---

## 🔧 14. Scheduled Tasks & Background Jobs

### 14.1 Scheduled Tasks (Cron Jobs)

```yaml
Scheduled Tasks:
  Clean Expired Data:
    - Schedule: "0 2 * * *" (Daily at 2 AM)
    - Tasks:
      - Delete expired notifications (>30 days)
      - Clean failed file uploads (>7 days)
      - Remove orphaned read receipts
  
  Update Statistics:
    - Schedule: "*/5 * * * *" (Every 5 minutes)
    - Tasks:
      - Update message counts
      - Calculate active users
      - Update travel statistics
  
  Send Scheduled Notifications:
    - Schedule: "* * * * *" (Every minute)
    - Tasks:
      - Process scheduled notifications
      - Send reminder notifications
      - Digest emails
  
  Optimize Database:
    - Schedule: "0 3 * * 0" (Weekly on Sunday at 3 AM)
    - Tasks:
      - Vacuum database
      - Update statistics
      - Rebuild indexes
```

### 14.2 Background Job Queue

```typescript
// Job types processed asynchronously
enum JobType {
  // File processing
  IMAGE_OPTIMIZATION = 'image.optimize',
  VIDEO_THUMBNAIL = 'video.thumbnail',
  
  // Notifications
  PUSH_NOTIFICATION = 'notification.push',
  EMAIL_NOTIFICATION = 'notification.email',
  BULK_NOTIFICATION = 'notification.bulk',
  
  // Data processing
  EXPORT_USER_DATA = 'user.export',
  DELETE_USER_DATA = 'user.delete',
  MIGRATE_DATA = 'data.migrate',
  
  // Analytics
  GENERATE_REPORT = 'report.generate',
  CALCULATE_METRICS = 'metrics.calculate',
}
```

---

## 🚨 15. Error Handling & Recovery Flows

### 15.1 Error Types & Handling

```typescript
// Custom business exceptions
class BusinessException extends Error {
  constructor(
    public code: string,
    public message: string,
    public statusCode: number,
    public details?: any
  ) {}
}

// Error codes
enum ErrorCode {
  // Authentication
  AUTH_INVALID_TOKEN = 'AUTH001',
  AUTH_TOKEN_EXPIRED = 'AUTH002',
  AUTH_UNAUTHORIZED = 'AUTH003',
  
  // Travel
  TRAVEL_NOT_FOUND = 'TRV001',
  TRAVEL_ACCESS_DENIED = 'TRV002',
  TRAVEL_ALREADY_MEMBER = 'TRV003',
  
  // Planet
  PLANET_NOT_FOUND = 'PLT001',
  PLANET_ACCESS_DENIED = 'PLT002',
  PLANET_USER_MUTED = 'PLT003',
  
  // Message
  MESSAGE_NOT_FOUND = 'MSG001',
  MESSAGE_EDIT_TIMEOUT = 'MSG002',
  MESSAGE_DELETE_DENIED = 'MSG003',
  
  // File
  FILE_TOO_LARGE = 'FILE001',
  FILE_TYPE_NOT_ALLOWED = 'FILE002',
  FILE_UPLOAD_FAILED = 'FILE003',
}
```

### 15.2 Retry & Fallback Strategies

```yaml
Retry Strategies:
  Database Operations:
    - Max retries: 3
    - Backoff: Exponential (100ms, 500ms, 2000ms)
    - Fallback: Return cached data or error
  
  External Services:
    - Push Notifications:
      - Max retries: 5
      - Backoff: Linear (1s)
      - Fallback: Queue for later
    
    - File Storage:
      - Max retries: 3
      - Backoff: Exponential
      - Fallback: Alternative storage
  
  WebSocket:
    - Reconnection attempts: Infinite
    - Backoff: Exponential with jitter
    - Max backoff: 30 seconds
```

### 15.3 Graceful Degradation

When services are unavailable:
- **Database down**: Serve from Redis cache
- **Redis down**: Disable real-time features, use DB only
- **Storage down**: Queue uploads, serve cached files
- **Push service down**: Fallback to email/in-app only
- **WebSocket down**: Poll for updates via REST API

---

## 📋 16. Migration & Upgrade Flows

### 16.1 Database Migration Flow

```bash
# Migration commands
yarn migration:generate MigrationName  # Generate from entity changes
yarn migration:create MigrationName    # Create empty migration
yarn migration:run                     # Run pending migrations
yarn migration:revert                  # Revert last migration
```

### 16.2 Zero-Downtime Deployment

```mermaid
sequenceDiagram
    participant LoadBalancer
    participant OldVersion
    participant NewVersion
    participant Database
    
    Note over LoadBalancer,Database: Step 1: Deploy new version
    LoadBalancer->>OldVersion: Route 100% traffic
    NewVersion->>Database: Run migrations (backward compatible)
    
    Note over LoadBalancer,Database: Step 2: Gradual rollout
    LoadBalancer->>OldVersion: Route 90% traffic
    LoadBalancer->>NewVersion: Route 10% traffic
    
    Note over LoadBalancer,Database: Step 3: Monitor & increase
    LoadBalancer->>OldVersion: Route 50% traffic
    LoadBalancer->>NewVersion: Route 50% traffic
    
    Note over LoadBalancer,Database: Step 4: Complete migration
    LoadBalancer->>NewVersion: Route 100% traffic
    OldVersion->>OldVersion: Shutdown gracefully
```

---

## 🎓 Best Practices & Guidelines

### API Design Principles
1. **RESTful conventions** with CRUD decorators
2. **Version control** via URL (v1, v2)
3. **Consistent error responses** with error codes
4. **Pagination** for all list endpoints
5. **Rate limiting** on all public endpoints

### Security Guidelines
1. **JWT authentication** for all protected routes
2. **Role-based access control** (RBAC)
3. **Input validation** using class-validator
4. **SQL injection prevention** via TypeORM
5. **XSS protection** through sanitization
6. **File upload restrictions** by size and type

### Performance Optimization
1. **Database indexes** on frequently queried fields
2. **Redis caching** for hot data
3. **Cursor pagination** for large datasets
4. **Lazy loading** for relations
5. **Connection pooling** for DB and Redis
6. **CDN** for static assets

### Code Organization
1. **Module-based** structure
2. **Service layer** for business logic
3. **Repository pattern** for data access
4. **DTO validation** at controller level
5. **Entity decorators** for validation
6. **Consistent naming** conventions

---

## 📚 Appendix

### A. Database Schema Overview

```sql
-- Core entities and relationships
users (1) ----< (N) travel_users
users (1) ----< (N) planet_users  
users (1) ----< (N) messages
users (1) ----< (N) notifications
users (1) ----< (1) profiles
users (1) ----< (N) file_uploads

travels (1) ----< (N) travel_users
travels (1) ----< (N) planets

planets (1) ----< (N) planet_users
planets (1) ----< (N) messages

messages (1) ----< (N) read_receipts
```

### B. Environment Variables

```env
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/connecto

# JWT
JWT_SECRET=your-secret-key
JWT_ACCESS_TOKEN_EXPIRES_IN=15m
JWT_REFRESH_TOKEN_EXPIRES_IN=7d

# Redis
REDIS_URL=redis://localhost:6379

# Storage (Cloudflare R2)
CLOUDFLARE_R2_ACCOUNT_ID=
CLOUDFLARE_R2_ACCESS_KEY_ID=
CLOUDFLARE_R2_SECRET_ACCESS_KEY=
CLOUDFLARE_R2_BUCKET_NAME=
CLOUDFLARE_R2_PUBLIC_URL=

# Social Login
GOOGLE_CLIENT_ID=
APPLE_CLIENT_ID=

# Push Notifications
FCM_SERVER_KEY=
FCM_SENDER_ID=
```

### C. API Rate Limits

```yaml
Rate Limits:
  Anonymous:
    - 10 requests per minute
  
  Authenticated:
    - 100 requests per minute
    - 1000 requests per hour
  
  WebSocket:
    - 10 connections per user
    - 100 messages per minute
    - 5 typing events per minute
  
  File Upload:
    - 10 uploads per minute
    - 100 uploads per day
```

---

## 📝 Version History

- **v1.0.0** (2024-01): Initial release
- **v1.1.0** (2024-02): Added direct messaging
- **v1.2.0** (2024-03): WebSocket real-time features
- **v1.3.0** (2024-04): File upload system
- **v1.4.0** (2024-05): Push notifications
- **v1.5.0** (2024-06): Simplified ban system, removed admin module

---

*Last Updated: 2024-01-14*
*Generated for Connecto NestJS Backend v1.5.0*