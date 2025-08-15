# Connecto Nest - Project Index Documentation

## 🚀 Project Overview

**Connecto** is a modern travel-focused group communication platform built with NestJS. It enables users to create travel groups, manage chat rooms (planets), share media, and collaborate in real-time.

### Tech Stack
- **Framework**: NestJS 11.x with TypeScript 5.7.x
- **Database**: PostgreSQL with TypeORM
- **Cache**: Redis for caching and real-time features
- **Real-time**: Socket.io WebSocket
- **Storage**: Cloudflare R2 for file uploads
- **Authentication**: JWT with Google/Apple social login

### Core Architecture Pattern
- **Entity-First CRUD**: Using `@foryourdev/nestjs-crud` for standardized RESTful APIs
- **Modular Design**: Clean separation of concerns with domain-driven modules
- **Real-time First**: WebSocket integration for instant messaging and presence
- **Type-Safe**: Full TypeScript implementation with validation

---

## 📁 Module Architecture

### 🔐 Authentication & User Management

#### **auth** - Authentication Service
- **Purpose**: JWT-based authentication with social login support
- **Key Features**:
  - Google OAuth integration
  - Apple Sign-In support
  - JWT token generation and validation
  - Push token registration during login
- **API**: `/api/v1/auth/*`
- **Files**: `src/modules/auth/`

#### **user** - User Management
- **Purpose**: Core user entity and profile management
- **Entity Fields**:
  - Social login credentials (Google/Apple)
  - Profile information (name, email, phone)
  - Notification preferences
  - Ban status tracking
  - Soft deletion support
- **API**: `/api/v1/users/*`
- **Files**: `src/modules/user/`

#### **profile** - Detailed User Profiles
- **Purpose**: Extended user profile information (1:1 with User)
- **Key Features**:
  - Bio and description
  - Profile images
  - Additional metadata
- **API**: `/api/v1/profiles/*`
- **Files**: `src/modules/profile/`

#### **admin** - System Administration
- **Purpose**: Admin user management with bcrypt authentication
- **Key Features**:
  - Separate admin authentication
  - Password-based login
  - System administration capabilities
- **API**: `/api/v1/admin/*`
- **Files**: `src/modules/admin/`

---

### 🌍 Travel & Group Management

#### **travel** - Travel Groups
- **Purpose**: Top-level container for organizing trips and groups
- **Key Features**:
  - Travel creation and management
  - Status tracking (ACTIVE/INACTIVE)
  - Visibility settings (PUBLIC/INVITE_ONLY)
  - Date-based lifecycle management
  - Member limits (max 20 users)
  - Invite code generation
- **Entity Relationships**:
  - Has many TravelUsers (members)
  - Has many Planets (chat rooms)
- **API**: `/api/v1/travels/*`
- **Files**: `src/modules/travel/`

#### **travel-user** - Travel Membership
- **Purpose**: Manages user participation in travels
- **Key Features**:
  - Role-based access (HOST/PARTICIPANT)
  - Join/leave functionality
  - Ban system at travel level
  - Membership tracking
- **Entity Relationships**:
  - Belongs to Travel
  - Belongs to User
- **API**: `/api/v1/travel-users/*`
- **Files**: `src/modules/travel-user/`

#### **planet** - Chat Rooms
- **Purpose**: Chat rooms within travels
- **Key Features**:
  - Two types: GROUP (multi-user) / DIRECT (1:1)
  - Status management (ACTIVE/INACTIVE/ARCHIVED/BLOCKED)
  - Time restrictions for chat availability
  - Message limits (1000 messages)
  - Auto-archival settings
- **Entity Relationships**:
  - Belongs to Travel
  - Has many PlanetUsers (members)
  - Has many Messages
- **API**: `/api/v1/planets/*`
- **Files**: `src/modules/planet/`

#### **planet-user** - Chat Room Membership
- **Purpose**: Manages user participation in planets
- **Key Features**:
  - Join/leave chat rooms
  - Mute system (instead of bans)
  - Read status tracking
  - Notification preferences per room
- **Entity Relationships**:
  - Belongs to Planet
  - Belongs to User
- **API**: `/api/v1/planet-users/*`
- **Files**: `src/modules/planet-user/`

---

### 💬 Messaging & Communication

#### **message** - Chat Messages
- **Purpose**: Core messaging functionality
- **Message Types**:
  - TEXT - Text messages
  - IMAGE - Image attachments
  - VIDEO - Video attachments
  - FILE - Document attachments
  - SYSTEM - System notifications
- **Key Features**:
  - Soft deletion support
  - Edit capability
  - Reply threading
  - File metadata storage
  - Read receipt tracking
- **Entity Relationships**:
  - Belongs to Planet
  - Belongs to User (sender)
  - Has many ReadReceipts
- **API**: `/api/v1/messages/*`
- **Files**: `src/modules/message/`

#### **read-receipt** - Message Read Status
- **Purpose**: Tracks which users have read which messages
- **Key Features**:
  - Individual read tracking
  - Batch read marking
  - Last read timestamp
- **Entity Relationships**:
  - Belongs to Message
  - Belongs to User
  - Belongs to Planet
- **API**: `/api/v1/read-receipts/*`
- **Files**: `src/modules/read-receipt/`

#### **websocket** - Real-time Communication
- **Purpose**: WebSocket gateway for real-time features
- **Key Events**:
  - `send_message` - Send new messages
  - `join_room` - Join chat rooms
  - `leave_room` - Leave chat rooms
  - `typing` - Typing indicators
  - `read_message` - Mark messages as read
  - `edit_message` - Edit existing messages
  - `delete_message` - Delete messages
- **Key Features**:
  - JWT authentication for connections
  - Rate limiting per event type
  - Room-based broadcasting
  - Typing indicators
  - Online presence tracking
  - Multi-device support
- **Files**: `src/modules/websocket/`

#### **notification** - Multi-channel Notifications
- **Purpose**: Unified notification system
- **Notification Channels**:
  - FCM Push notifications (iOS/Android)
  - Email notifications
  - SMS notifications
  - In-app notifications
- **Notification Types**:
  - Message notifications
  - Travel updates
  - Planet updates
  - System announcements
- **Key Features**:
  - Priority levels (LOW/NORMAL/HIGH/URGENT)
  - Delivery tracking
  - User preference respect
  - Batch notification support
- **API**: `/api/v1/notifications/*`
- **Files**: `src/modules/notification/`

---

### 📂 File & Media Management

#### **file-upload** - File Upload Service
- **Purpose**: Handles file uploads to Cloudflare R2
- **Key Features**:
  - Chunked uploads (5MB segments)
  - Support up to 500MB files
  - Direct upload with presigned URLs
  - Progress tracking
  - File type validation
  - Security scanning
- **Supported Types**:
  - Images (JPEG, PNG, GIF, WebP)
  - Videos (MP4, MOV, AVI)
  - Documents (PDF, DOC, XLS)
- **Upload Process**:
  1. Initialize upload
  2. Get presigned URL
  3. Upload chunks
  4. Complete upload
  5. Process file (thumbnails, etc.)
- **API**: `/api/v1/file-upload/*`
- **Files**: `src/modules/file-upload/`

#### **video-processing** - Video Processing
- **Purpose**: Video optimization and thumbnail generation
- **Key Features**:
  - Automatic quality optimization
  - Thumbnail generation
  - Format conversion
  - Progress tracking via WebSocket
  - HLS streaming preparation
- **Processing Pipeline**:
  1. Upload triggers processing
  2. Generate thumbnails
  3. Optimize video quality
  4. Create streaming formats
  5. Notify completion via WebSocket
- **Files**: `src/modules/video-processing/`

#### **storage** - Unified Storage Management
- **Purpose**: Abstract storage layer for all file operations
- **Key Features**:
  - Cloudflare R2 integration
  - URL generation
  - File deletion
  - Storage quota management
  - CDN URL generation
- **Files**: `src/modules/storage/`

---

### ⚡ Performance & System

#### **cache** - Redis Caching
- **Purpose**: Caching layer for performance optimization
- **Key Features**:
  - Redis integration
  - TTL-based caching strategies
  - Cache invalidation
  - Pub/Sub for real-time features
- **Cached Data**:
  - User sessions
  - Travel/Planet metadata
  - Message lists
  - File upload progress
- **Files**: `src/modules/cache/`

#### **scheduler** - Background Jobs
- **Purpose**: Scheduled tasks and background processing
- **Key Jobs**:
  - Travel expiration checks
  - Planet auto-archival
  - File cleanup
  - Notification batching
  - Cache warming
  - System optimization
- **Development Features**:
  - Manual trigger endpoints
  - Job status monitoring
- **Files**: `src/modules/scheduler/`

#### **schema** - Database Schema API
- **Purpose**: Development-only schema introspection
- **Key Features**:
  - Entity metadata exposure
  - CRUD configuration details
  - Relationship mapping
  - Security validation
- **⚠️ Note**: Only available in development environment
- **API**: `/api/v1/schema/*`
- **Files**: `src/modules/schema/`

---

## 🗂️ Database Schema

### Entity Hierarchy
```
User (사용자)
├── Profile (1:1 - 상세 프로필)
├── TravelUser (N:M - 여행 멤버십)
├── PlanetUser (N:M - 채팅방 멤버십)
├── Message (1:N - 보낸 메시지)
├── MessageReadReceipt (1:N - 읽음 상태)
├── FileUpload (1:N - 업로드한 파일)
└── Notification (1:N - 알림)

Travel (여행 그룹)
├── TravelUser (1:N - 멤버)
└── Planet (1:N - 채팅방)
    ├── PlanetUser (1:N - 멤버)
    └── Message (1:N - 메시지)
        └── MessageReadReceipt (1:N - 읽음 상태)
```

### Key Relationships
- **User ↔ Travel**: Many-to-Many through TravelUser
- **User ↔ Planet**: Many-to-Many through PlanetUser
- **Travel → Planet**: One-to-Many (Planets belong to Travels)
- **Planet → Message**: One-to-Many (Messages in chat rooms)
- **Message → ReadReceipt**: One-to-Many (Read tracking)

### Deletion Policies
- **Soft Delete**: User, Message (maintain history)
- **Cascade Delete**: Most child entities follow parent
- **Nullify**: FileUpload.userId (preserve files after user deletion)

---

## 🔧 Development Commands

### Build & Test
```bash
yarn build          # Build the application
yarn dev           # Start development server
yarn lint          # Run ESLint
yarn test          # Run unit tests
yarn test:e2e      # Run E2E tests
yarn test:cov      # Generate coverage report
```

### Database
```bash
yarn migration:generate -- MigrationName  # Generate migration
yarn migration:run                        # Run migrations
yarn migration:revert                     # Revert last migration
```

### Documentation
```bash
yarn docs:generate  # Generate API docs from E2E tests
yarn test:docs     # Run tests and generate docs
```

### Production
```bash
yarn start:prod:migrate  # Run migrations then start
yarn deploy:prod        # Safe production deployment
```

---

## 🔑 Environment Variables

### Required Configuration
```env
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/connecto

# JWT
JWT_SECRET=your-secret-key-min-32-chars

# Redis
REDIS_URL=redis://localhost:6379

# Cloudflare R2
CLOUDFLARE_R2_ACCESS_KEY_ID=xxx
CLOUDFLARE_R2_SECRET_ACCESS_KEY=xxx
CLOUDFLARE_R2_BUCKET_NAME=xxx
CLOUDFLARE_R2_ENDPOINT=xxx
CLOUDFLARE_R2_PUBLIC_URL=xxx

# Social Login
GOOGLE_CLIENT_ID=xxx
APPLE_CLIENT_ID=xxx

# Push Notifications (Optional)
FCM_PROJECT_ID=xxx
FCM_PRIVATE_KEY=xxx
FCM_CLIENT_EMAIL=xxx
```

---

## 📚 API Documentation

### Base URL
- Development: `http://localhost:3000/api/v1`
- Production: `https://api.connecto.com/api/v1`

### Authentication
All API endpoints (except auth) require JWT authentication:
```
Authorization: Bearer <jwt-token>
```

### API Documentation
- Swagger UI: `/api-docs` (development only)
- Generated from E2E tests using `@foryourdev/jest-swag`

### WebSocket Connection
```javascript
const socket = io('ws://localhost:3000', {
  auth: {
    token: 'jwt-token-here'
  }
});
```

---

## 🏗️ Architecture Patterns

### CRUD Pattern
All resource controllers use standardized CRUD pattern:
```typescript
@Controller({ path: 'resource', version: '1' })
@Crud({
  entity: Entity,
  allowedFilters: ['field1', 'field2'],
  allowedIncludes: ['relation1'],
  only: ['index', 'show', 'create', 'update', 'destroy'],
})
```

### Security Patterns
- JWT authentication on all endpoints
- Rate limiting on WebSocket events
- Input validation with class-validator
- SQL injection prevention with TypeORM
- File upload validation and scanning
- Sensitive data exclusion with `@Exclude()`

### Performance Patterns
- Redis caching for frequent queries
- Indexed database columns for search
- Pagination on list endpoints
- Lazy loading for relations
- WebSocket room-based broadcasting
- Chunked file uploads

---

## 📈 System Limits

### User Limits
- Max travels per user: Unlimited
- Max planets per travel: Unlimited
- Max users per travel: 20
- Max users per planet: Depends on type

### Message Limits
- Max message length: 5000 characters
- Max messages per planet: 1000 (then auto-archive)
- Max file size: 500MB
- Max chunk size: 5MB

### Rate Limits
- Message send: 10 per minute
- File upload: 5 per minute
- Room join: 20 per minute
- Typing indicator: 1 per 3 seconds

---

## 🚦 Status & Health

### Health Check Endpoints
- GET `/health` - Basic health check
- GET `/health/db` - Database connectivity
- GET `/health/redis` - Redis connectivity

### Monitoring
- Request/Response logging
- Error tracking
- Performance metrics
- WebSocket connection tracking
- File upload progress monitoring

---

## 📖 Additional Resources

- [CLAUDE.md](./CLAUDE.md) - AI assistant guidelines
- [DELETE.md](./DELETE.md) - Entity deletion policies
- [Package.json](./package.json) - Dependencies
- [TypeORM Config](./src/config/database.config.ts) - Database configuration
- [JWT Config](./src/config/jwt.config.ts) - Authentication configuration